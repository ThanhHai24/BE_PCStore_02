import { Question } from "@prisma/client";

export interface QuestionResponse {
    id: string;
    productId: string;
    userId: string | null;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    content: string;
    answer: string | null;
    answeredById: string | null;
    answeredAt: Date | null;
    isAnswered: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    product?: {
        id: string;
        name: string;
        image: string | null;
    };
    user?: {
        id: string;
        fullName: string;
        avatar: string | null;
    };
}

export function mapQuestionToResponse(question: any): QuestionResponse {
    return {
        id: question.id.toString(),
        productId: question.productId.toString(),
        userId: question.userId ? question.userId.toString() : null,
        customerName: question.customerName,
        customerPhone: question.customerPhone || null,
        customerEmail: question.customerEmail || null,
        content: question.content,
        answer: question.answer || null,
        answeredById: question.answeredById ? question.answeredById.toString() : null,
        answeredAt: question.answeredAt || null,
        isAnswered: question.isAnswered || false,
        status: question.status,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt,
        ...(question.product && {
            product: {
                id: question.product.id.toString(),
                name: question.product.name,
                image: question.product.image || null,
            }
        }),
        ...(question.user && {
            user: {
                id: question.user.id.toString(),
                fullName: question.user.fullName,
                avatar: question.user.avatar || null,
            }
        })
    };
}
