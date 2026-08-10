import { Request, Response } from "express";
import prisma from "../config/prisma";
import { slugify } from "../utils/slugify";

export const getBrands = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string;

        const whereClause: any = {};
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } }
            ];
        }

        const brands = await prisma.brand.findMany({
            where: whereClause,
            orderBy: { name: "asc" },
            include: {
                categoryBrands: {
                    include: {
                        category: true
                    }
                },
                _count: {
                    select: { products: true }
                }
            }
        });

        return res.json({
            brands: brands.map((b) => ({
                id: b.id.toString(),
                name: b.name,
                slug: b.slug,
                description: b.description,
                logo: b.logo,
                productsCount: b._count.products,
                categoryIds: b.categoryBrands ? b.categoryBrands.map((cb) => cb.categoryId.toString()) : [],
                categories: b.categoryBrands
                    ? b.categoryBrands.map((cb) => ({
                        id: cb.category.id.toString(),
                        name: cb.category.name,
                        slug: cb.category.slug
                    }))
                    : [],
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            }))
        });
    } catch (error) {
        console.error("GetBrands Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getBrandByIdOrSlug = async (req: Request, res: Response) => {
    try {
        const idOrSlugParam = req.params.idOrSlug;
        const idOrSlug = Array.isArray(idOrSlugParam) ? idOrSlugParam[0] : idOrSlugParam;

        if (!idOrSlug) {
            return res.status(400).json({ message: "Brand ID or slug is required" });
        }

        const isNumeric = /^\d+$/.test(idOrSlug);

        const brand = await prisma.brand.findFirst({
            where: isNumeric
                ? { id: BigInt(idOrSlug) }
                : { slug: idOrSlug },
            include: {
                categoryBrands: {
                    include: {
                        category: true
                    }
                },
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!brand) {
            return res.status(404).json({ message: "Brand not found" });
        }

        return res.json({
            brand: {
                id: brand.id.toString(),
                name: brand.name,
                slug: brand.slug,
                description: brand.description,
                logo: brand.logo,
                productsCount: brand._count.products,
                categoryIds: brand.categoryBrands ? brand.categoryBrands.map((cb) => cb.categoryId.toString()) : [],
                categories: brand.categoryBrands
                    ? brand.categoryBrands.map((cb) => ({
                        id: cb.category.id.toString(),
                        name: cb.category.name,
                        slug: cb.category.slug
                    }))
                    : [],
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt
            }
        });
    } catch (error) {
        console.error("GetBrandByIdOrSlug Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const createBrand = async (req: Request, res: Response) => {
    try {
        const { name, slug, description, logo, categoryIds } = req.body || {};

        if (!name) {
            return res.status(400).json({ message: "Brand name is required" });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);

        const existingBrand = await prisma.brand.findFirst({
            where: {
                OR: [{ name }, { slug: finalSlug }]
            }
        });

        if (existingBrand) {
            return res.status(409).json({ message: "Brand name or slug already exists" });
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                slug: finalSlug,
                description: description || null,
                logo: logo || null,
                ...(categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0 && {
                    categoryBrands: {
                        create: categoryIds.map((cId: string | number) => ({
                            categoryId: BigInt(cId)
                        }))
                    }
                })
            },
            include: {
                categoryBrands: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return res.status(201).json({
            message: "Brand created successfully",
            brand: {
                id: brand.id.toString(),
                name: brand.name,
                slug: brand.slug,
                description: brand.description,
                logo: brand.logo,
                productsCount: 0,
                categoryIds: brand.categoryBrands ? brand.categoryBrands.map((cb) => cb.categoryId.toString()) : [],
                categories: brand.categoryBrands
                    ? brand.categoryBrands.map((cb) => ({
                        id: cb.category.id.toString(),
                        name: cb.category.name,
                        slug: cb.category.slug
                    }))
                    : [],
                createdAt: brand.createdAt,
                updatedAt: brand.updatedAt
            }
        });
    } catch (error) {
        console.error("CreateBrand Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateBrand = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;
        const { name, slug, description, logo, categoryIds } = req.body || {};

        const brand = await prisma.brand.findUnique({
            where: { id: BigInt(id) },
            include: { _count: { select: { products: true } } }
        });

        if (!brand) {
            return res.status(404).json({ message: "Brand not found" });
        }

        let finalSlug = brand.slug;
        if (slug) {
            finalSlug = slugify(slug);
        } else if (name && name !== brand.name) {
            finalSlug = slugify(name);
        }

        if (finalSlug !== brand.slug || (name && name !== brand.name)) {
            const existing = await prisma.brand.findFirst({
                where: {
                    id: { not: brand.id },
                    OR: [
                        { name: name || brand.name },
                        { slug: finalSlug }
                    ]
                }
            });
            if (existing) {
                return res.status(409).json({ message: "Brand name or slug already exists" });
            }
        }

        if (categoryIds !== undefined && Array.isArray(categoryIds)) {
            await prisma.categoryBrand.deleteMany({
                where: { brandId: brand.id }
            });

            if (categoryIds.length > 0) {
                await prisma.categoryBrand.createMany({
                    data: categoryIds.map((cId: string | number) => ({
                        brandId: brand.id,
                        categoryId: BigInt(cId)
                    }))
                });
            }
        }

        const updatedBrand = await prisma.brand.update({
            where: { id: brand.id },
            data: {
                ...(name !== undefined && { name }),
                slug: finalSlug,
                ...(description !== undefined && { description }),
                ...(logo !== undefined && { logo })
            },
            include: {
                categoryBrands: {
                    include: {
                        category: true
                    }
                }
            }
        });

        return res.json({
            message: "Brand updated successfully",
            brand: {
                id: updatedBrand.id.toString(),
                name: updatedBrand.name,
                slug: updatedBrand.slug,
                description: updatedBrand.description,
                logo: updatedBrand.logo,
                productsCount: brand._count.products,
                categoryIds: updatedBrand.categoryBrands ? updatedBrand.categoryBrands.map((cb) => cb.categoryId.toString()) : [],
                categories: updatedBrand.categoryBrands
                    ? updatedBrand.categoryBrands.map((cb) => ({
                        id: cb.category.id.toString(),
                        name: cb.category.name,
                        slug: cb.category.slug
                    }))
                    : [],
                createdAt: updatedBrand.createdAt,
                updatedAt: updatedBrand.updatedAt
            }
        });
    } catch (error) {
        console.error("UpdateBrand Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteBrand = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const brand = await prisma.brand.findUnique({
            where: { id: BigInt(id) },
            include: {
                products: { take: 1 }
            }
        });

        if (!brand) {
            return res.status(404).json({ message: "Brand not found" });
        }

        if (brand.products.length > 0) {
            return res.status(400).json({
                message: "Cannot delete brand because it contains products. Reassign or delete products first."
            });
        }

        // Delete associated categoryBrand relations first
        await prisma.categoryBrand.deleteMany({
            where: { brandId: brand.id }
        });

        await prisma.brand.delete({
            where: { id: brand.id }
        });

        return res.json({ message: "Brand deleted successfully" });
    } catch (error) {
        console.error("DeleteBrand Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
