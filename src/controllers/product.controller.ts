import { Request, Response } from "express";
import prisma from "../config/prisma";
import { slugify } from "../utils/slugify";
import { formatProductResponse } from "../utils/productMapper";

export const getProducts = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
        const search = (req.query.search as string) || (req.query.q as string);
        const categoryId = req.query.categoryId as string;
        const brandId = req.query.brandId as string;
        const minPrice = req.query.minPrice ? Number(req.query.minPrice) : undefined;
        const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
        const status = req.query.status as string;
        const isFeatured = req.query.isFeatured;
        const sortBy = (req.query.sortBy as string) || "createdAt";
        const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";

        const validSortFields = ["createdAt", "price", "viewCount", "name"];
        const actualSortBy = validSortFields.includes(sortBy) ? sortBy : "createdAt";

        const whereClause: any = {};

        if (status) {
            whereClause.status = status;
        } else {
            whereClause.status = "ACTIVE";
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { shortDescription: { contains: search, mode: "insensitive" } }
            ];
        }

        if (categoryId) {
            whereClause.categoryId = BigInt(categoryId);
        }

        if (brandId) {
            whereClause.brandId = BigInt(brandId);
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            whereClause.price = {};
            if (minPrice !== undefined && !isNaN(minPrice)) whereClause.price.gte = minPrice;
            if (maxPrice !== undefined && !isNaN(maxPrice)) whereClause.price.lte = maxPrice;
        }

        if (isFeatured !== undefined) {
            whereClause.isFeatured = isFeatured === "true" || isFeatured === "1";
        }

        const skip = (page - 1) * limit;

        const [total, products] = await Promise.all([
            prisma.product.count({ where: whereClause }),
            prisma.product.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { [actualSortBy]: sortOrder },
                include: {
                    category: true,
                    brand: true
                }
            })
        ]);

        return res.json({
            products: products.map(formatProductResponse),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("GetProducts Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
    try {
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

        const products = await prisma.product.findMany({
            where: {
                isFeatured: true,
                status: "ACTIVE"
            },
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                category: true,
                brand: true
            }
        });

        return res.json({
            products: products.map(formatProductResponse)
        });

    } catch (error) {
        console.error("GetFeaturedProducts Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getProductByIdOrSlug = async (req: Request, res: Response) => {
    try {
        const idOrSlugParam = req.params.idOrSlug;
        const idOrSlug = Array.isArray(idOrSlugParam) ? idOrSlugParam[0] : idOrSlugParam;

        if (!idOrSlug) {
            return res.status(400).json({ message: "Product ID or slug is required" });
        }

        const isNumeric = /^\d+$/.test(idOrSlug);

        const product = await prisma.product.findFirst({
            where: isNumeric
                ? { id: BigInt(idOrSlug) }
                : { slug: idOrSlug },
            include: {
                category: true,
                brand: true
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Increment view count asynchronously
        await prisma.product.update({
            where: { id: product.id },
            data: { viewCount: { increment: 1 } }
        });

        return res.json({
            product: formatProductResponse({
                ...product,
                viewCount: product.viewCount + 1
            })
        });

    } catch (error) {
        console.error("GetProductByIdOrSlug Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const {
            name,
            slug,
            sku,
            shortDescription,
            description,
            price,
            originalPrice,
            stock,
            image,
            images,
            specifications,
            warranty,
            status,
            isFeatured,
            categoryId,
            brandId
        } = req.body;

        if (!name || !sku || price === undefined || !categoryId || !brandId) {
            return res.status(400).json({
                message: "Missing required fields: name, sku, price, categoryId, and brandId are required"
            });
        }

        const category = await prisma.category.findUnique({
            where: { id: BigInt(categoryId) }
        });
        if (!category) {
            return res.status(400).json({ message: "Category not found" });
        }

        const brand = await prisma.brand.findUnique({
            where: { id: BigInt(brandId) }
        });
        if (!brand) {
            return res.status(400).json({ message: "Brand not found" });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);

        const existingSku = await prisma.product.findUnique({
            where: { sku }
        });
        if (existingSku) {
            return res.status(409).json({ message: "SKU already exists" });
        }

        const existingSlug = await prisma.product.findUnique({
            where: { slug: finalSlug }
        });
        if (existingSlug) {
            return res.status(409).json({ message: "Product slug already exists" });
        }

        const product = await prisma.product.create({
            data: {
                name,
                slug: finalSlug,
                sku,
                shortDescription: shortDescription || null,
                description: description || null,
                price: Number(price),
                originalPrice: originalPrice !== undefined ? Number(originalPrice) : null,
                stock: stock !== undefined ? Number(stock) : 0,
                image: image || null,
                images: images || null,
                specifications: specifications || null,
                warranty: warranty !== undefined ? Number(warranty) : null,
                status: status || "ACTIVE",
                isFeatured: Boolean(isFeatured),
                categoryId: BigInt(categoryId),
                brandId: BigInt(brandId)
            },
            include: {
                category: true,
                brand: true
            }
        });

        return res.status(201).json({
            message: "Product created successfully",
            product: formatProductResponse(product)
        });

    } catch (error) {
        console.error("CreateProduct Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const product = await prisma.product.findUnique({
            where: { id: BigInt(id) }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        const {
            name,
            slug,
            sku,
            shortDescription,
            description,
            price,
            originalPrice,
            stock,
            image,
            images,
            specifications,
            warranty,
            status,
            isFeatured,
            categoryId,
            brandId
        } = req.body;

        if (categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: BigInt(categoryId) }
            });
            if (!category) {
                return res.status(400).json({ message: "Category not found" });
            }
        }

        if (brandId) {
            const brand = await prisma.brand.findUnique({
                where: { id: BigInt(brandId) }
            });
            if (!brand) {
                return res.status(400).json({ message: "Brand not found" });
            }
        }

        if (sku && sku !== product.sku) {
            const existingSku = await prisma.product.findUnique({ where: { sku } });
            if (existingSku) {
                return res.status(409).json({ message: "SKU already exists" });
            }
        }

        let finalSlug = product.slug;
        if (slug) {
            finalSlug = slugify(slug);
        } else if (name && name !== product.name) {
            finalSlug = slugify(name);
        }

        if (finalSlug !== product.slug) {
            const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
            if (existingSlug) {
                return res.status(409).json({ message: "Product slug already exists" });
            }
        }

        const updatedProduct = await prisma.product.update({
            where: { id: BigInt(id) },
            data: {
                ...(name !== undefined && { name }),
                slug: finalSlug,
                ...(sku !== undefined && { sku }),
                ...(shortDescription !== undefined && { shortDescription }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: Number(price) }),
                ...(originalPrice !== undefined && { originalPrice: originalPrice ? Number(originalPrice) : null }),
                ...(stock !== undefined && { stock: Number(stock) }),
                ...(image !== undefined && { image }),
                ...(images !== undefined && { images }),
                ...(specifications !== undefined && { specifications }),
                ...(warranty !== undefined && { warranty: warranty ? Number(warranty) : null }),
                ...(status !== undefined && { status }),
                ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
                ...(categoryId !== undefined && { categoryId: BigInt(categoryId) }),
                ...(brandId !== undefined && { brandId: BigInt(brandId) })
            },
            include: {
                category: true,
                brand: true
            }
        });

        return res.json({
            message: "Product updated successfully",
            product: formatProductResponse(updatedProduct)
        });

    } catch (error) {
        console.error("UpdateProduct Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const idParam = req.params.id;
        const id = Array.isArray(idParam) ? idParam[0] : idParam;

        const product = await prisma.product.findUnique({
            where: { id: BigInt(id) }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        try {
            await prisma.product.delete({
                where: { id: BigInt(id) }
            });

            return res.json({
                message: "Product deleted successfully"
            });
        } catch (dbError: any) {
            if (dbError.code === "P2003") {
                await prisma.product.update({
                    where: { id: BigInt(id) },
                    data: { status: "INACTIVE" }
                });

                return res.json({
                    message: "Product is referenced in existing records and has been set to INACTIVE instead of deletion"
                });
            }
            throw dbError;
        }

    } catch (error) {
        console.error("DeleteProduct Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
