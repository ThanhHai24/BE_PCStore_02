import { Category } from "@prisma/client";

export interface CategoryWithRelations extends Category {
    parent?: Category | null;
    children?: Category[];
}

export interface FormattedCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    parent?: FormattedCategory | null;
    children?: FormattedCategory[];
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
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    };
};
