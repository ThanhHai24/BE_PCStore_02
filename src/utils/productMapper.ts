import { Product, Category, Brand } from "@prisma/client";

export interface CategoryResponse {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface BrandResponse {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductResponse {
    id: string;
    name: string;
    slug: string;
    sku: string;
    shortDescription: string | null;
    description: string | null;
    price: number;
    originalPrice: number | null;
    stock: number;
    image: string | null;
    images: any;
    specifications: any;
    warranty: number | null;
    status: string;
    isFeatured: boolean;
    viewCount: number;
    categoryId: string;
    brandId: string;
    category?: CategoryResponse;
    brand?: BrandResponse;
    createdAt: Date;
    updatedAt: Date;
}

export const formatCategoryResponse = (category: Category): CategoryResponse => {
    return {
        id: category.id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId ? category.parentId.toString() : null,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    };
};

export const formatBrandResponse = (brand: Brand): BrandResponse => {
    return {
        id: brand.id.toString(),
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logo: brand.logo,
        createdAt: brand.createdAt,
        updatedAt: brand.updatedAt
    };
};

export const formatProductResponse = (
    product: Product & { category?: Category; brand?: Brand }
): ProductResponse => {
    return {
        id: product.id.toString(),
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        stock: product.stock,
        image: product.image,
        images: product.images,
        specifications: product.specifications,
        warranty: product.warranty,
        status: product.status,
        isFeatured: product.isFeatured,
        viewCount: product.viewCount,
        categoryId: product.categoryId.toString(),
        brandId: product.brandId.toString(),
        category: product.category ? formatCategoryResponse(product.category) : undefined,
        brand: product.brand ? formatBrandResponse(product.brand) : undefined,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
};
