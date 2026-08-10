import { Request, Response } from "express";
import prisma from "../config/prisma";
import { slugify } from "../utils/slugify";
import { formatCategoryResponse } from "../utils/categoryMapper";

export const getCategories = async (req: Request, res: Response) => {
    try {
        const isTree = req.query.tree === "true" || req.query.tree === "1";
        const parentIdQuery = req.query.parentId as string;
        const search = req.query.search as string;

        if (isTree) {
            const rootCategories = await prisma.category.findMany({
                where: { parentId: null },
                orderBy: { name: "asc" },
                include: {
                    _count: { select: { products: true } },
                    children: {
                        orderBy: { name: "asc" },
                        include: {
                            _count: { select: { products: true } },
                            children: {
                                include: {
                                    _count: { select: { products: true } }
                                }
                            }
                        }
                    }
                }
            });

            return res.json({
                categories: rootCategories.map(formatCategoryResponse)
            });
        }

        const whereClause: any = {};

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ];
        }

        if (parentIdQuery !== undefined && parentIdQuery !== "all" && parentIdQuery !== "") {
            if (parentIdQuery === "null" || parentIdQuery === "root") {
                whereClause.parentId = null;
            } else if (/^\d+$/.test(parentIdQuery)) {
                whereClause.parentId = BigInt(parentIdQuery);
            } else {
                const parentCat = await prisma.category.findUnique({ where: { slug: parentIdQuery } });
                whereClause.parentId = parentCat ? parentCat.id : -1n;
            }
        }

        const categories = await prisma.category.findMany({
            where: whereClause,
            orderBy: { name: "asc" },
            include: {
                parent: true,
                children: true,
                _count: { select: { products: true } }
            }
        });

        return res.json({
            categories: categories.map(formatCategoryResponse)
        });

    } catch (error) {
        console.error("GetCategories Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


export const getCategoryByIdOrSlug = async (req: Request, res: Response) => {
    try {
        const idOrSlugParam = req.params.idOrSlug;
        const idOrSlug = Array.isArray(idOrSlugParam) ? idOrSlugParam[0] : idOrSlugParam;

        if (!idOrSlug) {
            return res.status(400).json({ message: "Category ID or slug is required" });
        }

        const isNumeric = /^\d+$/.test(idOrSlug);

        const category = await prisma.category.findFirst({
            where: isNumeric
                ? { id: BigInt(idOrSlug) }
                : { slug: idOrSlug },
            include: {
                parent: true,
                children: {
                    orderBy: { name: "asc" }
                }
            }
        });

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        return res.json({
            category: formatCategoryResponse(category)
        });

    } catch (error) {
        console.error("GetCategoryByIdOrSlug Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getBrandsByCategory = async (req: Request, res: Response) => {
    try {
        const idOrSlugParam = req.params.idOrSlug;
        const idOrSlug = Array.isArray(idOrSlugParam) ? idOrSlugParam[0] : idOrSlugParam;

        if (!idOrSlug) {
            return res.status(400).json({ message: "Category ID or slug is required" });
        }

        const isNumeric = /^\d+$/.test(idOrSlug);

        const category = await prisma.category.findFirst({
            where: isNumeric
                ? { id: BigInt(idOrSlug) }
                : { slug: idOrSlug },
            select: {
                id: true,
                name: true,
                slug: true,
                children: { select: { id: true } }
            }
        });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const categoryIds = [category.id, ...category.children.map((c) => c.id)];

        const categoryBrands = await prisma.categoryBrand.findMany({
            where: { categoryId: { in: categoryIds } },
            include: { brand: true }
        });

        const brandMap = new Map<string, any>();
        categoryBrands.forEach((cb) => {
            if (cb.brand && !brandMap.has(cb.brand.id.toString())) {
                brandMap.set(cb.brand.id.toString(), {
                    id: cb.brand.id.toString(),
                    name: cb.brand.name,
                    slug: cb.brand.slug,
                    description: cb.brand.description,
                    logo: cb.brand.logo,
                    createdAt: cb.brand.createdAt,
                    updatedAt: cb.brand.updatedAt
                });
            }
        });

        const brands = Array.from(brandMap.values());

        return res.json({
            category: {
                id: category.id.toString(),
                name: category.name,
                slug: category.slug
            },
            brands
        });

    } catch (error) {
        console.error("GetBrandsByCategory Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};


export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, slug, description, parentId } = req.body;

        if (!name) {
            return res.status(400).json({
                message: "Category name is required"
            });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);

        const existingCategory = await prisma.category.findUnique({
            where: { slug: finalSlug }
        });

        if (existingCategory) {
            return res.status(409).json({
                message: "Category slug already exists"
            });
        }

        if (parentId) {
            const parent = await prisma.category.findUnique({
                where: { id: BigInt(parentId) }
            });
            if (!parent) {
                return res.status(400).json({
                    message: "Parent category not found"
                });
            }
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug: finalSlug,
                description: description || null,
                parentId: parentId ? BigInt(parentId) : null
            },
            include: {
                parent: true,
                children: true
            }
        });

        return res.status(201).json({
            message: "Category created successfully",
            category: formatCategoryResponse(category)
        });

    } catch (error) {
        console.error("CreateCategory Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const category = await prisma.category.findUnique({
            where: { id: BigInt(id) }
        });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const { name, slug, description, parentId } = req.body;

        let finalSlug = category.slug;
        if (slug) {
            finalSlug = slugify(slug);
        } else if (name && name !== category.name) {
            finalSlug = slugify(name);
        }

        if (finalSlug !== category.slug) {
            const existingSlug = await prisma.category.findUnique({
                where: { slug: finalSlug }
            });
            if (existingSlug) {
                return res.status(409).json({ message: "Category slug already exists" });
            }
        }

        if (parentId !== undefined && parentId !== null) {
            if (BigInt(parentId) === category.id) {
                return res.status(400).json({
                    message: "A category cannot be its own parent"
                });
            }

            const parent = await prisma.category.findUnique({
                where: { id: BigInt(parentId) }
            });
            if (!parent) {
                return res.status(400).json({
                    message: "Parent category not found"
                });
            }
        }

        const updatedCategory = await prisma.category.update({
            where: { id: BigInt(id) },
            data: {
                ...(name !== undefined && { name }),
                slug: finalSlug,
                ...(description !== undefined && { description }),
                ...(parentId !== undefined && { parentId: parentId ? BigInt(parentId) : null })
            },
            include: {
                parent: true,
                children: true
            }
        });

        return res.json({
            message: "Category updated successfully",
            category: formatCategoryResponse(updatedCategory)
        });

    } catch (error) {
        console.error("UpdateCategory Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const category = await prisma.category.findUnique({
            where: { id: BigInt(id) },
            include: {
                children: true,
                products: { take: 1 }
            }
        });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        if (category.products.length > 0) {
            return res.status(400).json({
                message: "Cannot delete category because it contains products. Reassign or delete products first."
            });
        }

        // Unlink parentId for child categories if any
        if (category.children.length > 0) {
            await prisma.category.updateMany({
                where: { parentId: category.id },
                data: { parentId: null }
            });
        }

        await prisma.category.delete({
            where: { id: category.id }
        });

        return res.json({
            message: "Category deleted successfully"
        });

    } catch (error) {
        console.error("DeleteCategory Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
