import { Category } from "@prisma/client";

export interface CategoryWithRelations extends Category {
    parent?: Category | null;
    children?: Category[];
    _count?: {
        products?: number;
    };
}

export interface FormattedCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    parent?: FormattedCategory | null;
    children?: FormattedCategory[];
    _count?: {
        products?: number;
    };
    productsCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

export const formatCategoryResponse = (category: CategoryWithRelations): FormattedCategory => {
    return {
        id: category.id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId: category.parentId ? category.parentId.toString() : null,
        parent: category.parent ? formatCategoryResponse(category.parent) : undefined,
        children: category.children ? category.children.map(formatCategoryResponse) : undefined,
        _count: category._count,
        productsCount: category._count?.products ?? 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    };
};

