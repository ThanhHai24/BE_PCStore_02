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

        if (status && status.toUpperCase() !== "ALL") {
            whereClause.status = status.toUpperCase();
        } else if (!status) {
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
            const isCatNumeric = /^\d+$/.test(categoryId);
            const category = await prisma.category.findFirst({
                where: isCatNumeric
                    ? { id: BigInt(categoryId) }
                    : { slug: categoryId },
                select: { id: true, children: { select: { id: true } } }
            });

            if (category) {
                const categoryIds = [category.id, ...category.children.map((c) => c.id)];
                whereClause.categoryId = { in: categoryIds };
            } else {
                whereClause.categoryId = -1n;
            }
        }

        if (brandId) {
            const isBrandNumeric = /^\d+$/.test(brandId);
            const brand = await prisma.brand.findFirst({
                where: isBrandNumeric
                    ? { id: BigInt(brandId) }
                    : { slug: brandId },
                select: { id: true }
            });

            if (brand) {
                whereClause.brandId = brand.id;
            } else {
                whereClause.brandId = -1n;
            }
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

        const productIds = products.map((p) => p.id);
        const soldMap = new Map<string, number>();
        if (productIds.length > 0) {
            try {
                const soldItems = await prisma.orderItem.groupBy({
                    by: ['productId'],
                    where: {
                        productId: { in: productIds },
                        order: { status: { not: 'CANCELLED' } }
                    },
                    _sum: { quantity: true }
                });
                soldItems.forEach((item) => {
                    soldMap.set(item.productId.toString(), item._sum.quantity || 0);
                });
            } catch (sumErr) {
                console.warn("Failed to calculate sold quantities:", sumErr);
            }
        }

        return res.json({
            products: products.map((p) => formatProductResponse(p, soldMap.get(p.id.toString()) || 0)),
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

        const productIds = products.map((p) => p.id);
        const soldMap = new Map<string, number>();
        if (productIds.length > 0) {
            try {
                const soldItems = await prisma.orderItem.groupBy({
                    by: ['productId'],
                    where: {
                        productId: { in: productIds },
                        order: { status: { not: 'CANCELLED' } }
                    },
                    _sum: { quantity: true }
                });
                soldItems.forEach((item) => {
                    soldMap.set(item.productId.toString(), item._sum.quantity || 0);
                });
            } catch (sumErr) {
                console.warn("Failed to calculate sold quantities for featured:", sumErr);
            }
        }

        return res.json({
            products: products.map((p) => formatProductResponse(p, soldMap.get(p.id.toString()) || 0))
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

        let soldCount = 0;
        try {
            const soldAgg = await prisma.orderItem.aggregate({
                where: {
                    productId: product.id,
                    order: { status: { not: 'CANCELLED' } }
                },
                _sum: { quantity: true }
            });
            soldCount = soldAgg._sum.quantity || 0;
        } catch (sumErr) {
            console.warn("Failed to calculate sold quantity for product detail:", sumErr);
        }

        return res.json({
            product: formatProductResponse({
                ...product,
                viewCount: product.viewCount + 1
            }, soldCount)
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
            importPrice,
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

        // Validate required fields
        const missingFields: string[] = [];
        if (!name) missingFields.push("name (tên sản phẩm)");
        if (!sku) missingFields.push("sku (mã sản phẩm)");
        if (price === undefined || price === null) missingFields.push("price (giá bán)");
        if (!categoryId) missingFields.push("categoryId (danh mục)");
        if (!brandId) missingFields.push("brandId (thương hiệu)");

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Thiếu thông tin bắt buộc: ${missingFields.join(", ")}`
            });
        }

        const category = await prisma.category.findUnique({
            where: { id: BigInt(categoryId) }
        });
        if (!category) {
            return res.status(400).json({ message: "Danh mục không tồn tại" });
        }

        const brand = await prisma.brand.findUnique({
            where: { id: BigInt(brandId) }
        });
        if (!brand) {
            return res.status(400).json({ message: "Thương hiệu không tồn tại" });
        }

        const finalSlug = slug ? slugify(slug) : slugify(name);

        const existingSku = await prisma.product.findUnique({
            where: { sku }
        });
        if (existingSku) {
            return res.status(409).json({ message: `SKU "${sku}" đã tồn tại, vui lòng dùng mã khác` });
        }

        const existingSlug = await prisma.product.findUnique({
            where: { slug: finalSlug }
        });
        if (existingSlug) {
            return res.status(409).json({ message: `Tên sản phẩm "${name}" đã tồn tại, vui lòng đặt tên khác` });
        }

        // Merge importPrice vào specifications nếu có
        let finalSpecifications = specifications || null;
        if (importPrice !== undefined && importPrice !== null) {
            finalSpecifications = {
                ...(typeof finalSpecifications === 'object' && finalSpecifications !== null ? finalSpecifications : {}),
                importPrice: Number(importPrice)
            };
        }

        const product = await prisma.product.create({
            data: {
                name,
                slug: finalSlug,
                sku,
                shortDescription: shortDescription || null,
                description: description || null,
                price: Number(price),
                originalPrice: originalPrice !== undefined && originalPrice !== null ? Number(originalPrice) : null,
                stock: stock !== undefined ? Number(stock) : 0,
                image: image || null,
                images: images && images.length > 0 ? images : null,
                specifications: finalSpecifications,
                warranty: warranty !== undefined && warranty !== null ? Number(warranty) : null,
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

        // Ensure category & brand link exists in category_brands
        try {
            await prisma.categoryBrand.upsert({
                where: {
                    categoryId_brandId: {
                        categoryId: BigInt(categoryId),
                        brandId: BigInt(brandId)
                    }
                },
                create: {
                    categoryId: BigInt(categoryId),
                    brandId: BigInt(brandId)
                },
                update: {}
            });
        } catch (linkErr) {
            console.warn("CategoryBrand upsert warning:", linkErr);
        }

        return res.status(201).json({
            message: "Tạo sản phẩm thành công",
            product: formatProductResponse(product)
        });

    } catch (error) {
        console.error("CreateProduct Error:", error);
        return res.status(500).json({
            message: "Lỗi server nội bộ, vui lòng thử lại"
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

        // Ensure category & brand link exists in category_brands
        try {
            await prisma.categoryBrand.upsert({
                where: {
                    categoryId_brandId: {
                        categoryId: updatedProduct.categoryId,
                        brandId: updatedProduct.brandId
                    }
                },
                create: {
                    categoryId: updatedProduct.categoryId,
                    brandId: updatedProduct.brandId
                },
                update: {}
            });
        } catch (linkErr) {
            console.warn("CategoryBrand upsert warning:", linkErr);
        }

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
