import { Request, Response } from "express";
import prisma from "../config/prisma";
import { mapQuestionToResponse } from "../utils/qnaMapper";

// ======================================================
// USER CONTROLLER FUNCTIONS
// ======================================================

/**
 * GET /api/qna/product/:productId
 * Lấy danh sách câu hỏi / hỏi đáp của sản phẩm (chỉ lấy câu hỏi đã APPROVED)
 */
export const getQuestionsByProduct = async (req: Request, res: Response) => {
    try {
        const productIdStr = req.params.productId as string;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        if (!productIdStr) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        const pId = BigInt(productIdStr);

        const [questions, total] = await Promise.all([
            prisma.question.findMany({
                where: {
                    productId: pId,
                    status: "APPROVED",
                },
                include: {
                    user: {
                        select: { id: true, fullName: true, avatar: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.question.count({
                where: {
                    productId: pId,
                    status: "APPROVED",
                }
            })
        ]);

        const mappedQuestions = questions.map(mapQuestionToResponse);

        return res.status(200).json({
            questions: mappedQuestions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error: any) {
        console.error("Error fetching product questions:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * POST /api/qna/product/:productId
 * Gửi câu hỏi mới về sản phẩm
 */
export const createQuestion = async (req: Request, res: Response) => {
    try {
        const productIdStr = req.params.productId as string;
        const { customerName, customerPhone, customerEmail, content } = req.body;
        const authUser = (req as any).user;

        if (!productIdStr) {
            return res.status(400).json({ message: "Product ID is required" });
        }

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Content is required" });
        }

        const pId = BigInt(productIdStr);

        // Check if product exists
        const product = await prisma.product.findUnique({
            where: { id: pId }
        });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        let name = customerName;
        let phone = customerPhone || null;
        let email = customerEmail || null;
        let userId: bigint | null = null;

        if (authUser) {
            userId = BigInt(authUser.userId || authUser.id);
            if (!name) name = authUser.fullName || authUser.username;
            if (!phone) phone = authUser.phone || null;
            if (!email) email = authUser.email || null;
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Customer name is required" });
        }

        const newQuestion = await prisma.question.create({
            data: {
                productId: pId,
                userId,
                customerName: name.trim(),
                customerPhone: phone ? phone.trim() : null,
                customerEmail: email ? email.trim() : null,
                content: content.trim(),
                status: "APPROVED", // Mặc định hiển thị, Admin có thể ẩn nếu spammed
            },
            include: {
                user: {
                    select: { id: true, fullName: true, avatar: true }
                }
            }
        });

        return res.status(201).json({
            message: "Question submitted successfully",
            question: mapQuestionToResponse(newQuestion)
        });
    } catch (error: any) {
        console.error("Error creating question:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// ======================================================
// ADMIN CONTROLLER FUNCTIONS
// ======================================================

/**
 * GET /api/qna/admin/all
 * Admin lấy danh sách câu hỏi (hỗ trợ lọc theo status, isAnswered, search, productId)
 */
export const getAllQuestionsAdmin = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 15;
        const skip = (page - 1) * limit;

        const { isAnswered, status, search, productId } = req.query;

        const where: any = {};

        if (isAnswered !== undefined) {
            where.isAnswered = isAnswered === "true";
        }

        if (status) {
            where.status = status as string;
        }

        if (productId) {
            where.productId = BigInt(productId as string);
        }

        if (search) {
            const searchTerm = (search as string).trim();
            where.OR = [
                { content: { contains: searchTerm, mode: "insensitive" } },
                { customerName: { contains: searchTerm, mode: "insensitive" } },
                { customerPhone: { contains: searchTerm, mode: "insensitive" } },
                { answer: { contains: searchTerm, mode: "insensitive" } },
                { product: { name: { contains: searchTerm, mode: "insensitive" } } }
            ];
        }

        const [questions, total] = await Promise.all([
            prisma.question.findMany({
                where,
                include: {
                    product: {
                        select: { id: true, name: true, image: true }
                    },
                    user: {
                        select: { id: true, fullName: true, avatar: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.question.count({ where })
        ]);

        const mappedQuestions = questions.map(mapQuestionToResponse);

        return res.status(200).json({
            questions: mappedQuestions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        });
    } catch (error: any) {
        console.error("Error fetching questions for admin:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * PUT /api/qna/admin/:id/answer
 * Admin trả lời câu hỏi của khách hàng
 */
export const answerQuestionAdmin = async (req: Request, res: Response) => {
    try {
        const idStr = req.params.id as string;
        const { answer } = req.body;
        const authUser = (req as any).user;

        if (!idStr) {
            return res.status(400).json({ message: "Question ID is required" });
        }

        if (!answer || !answer.trim()) {
            return res.status(400).json({ message: "Answer content is required" });
        }

        const qId = BigInt(idStr);

        const existingQuestion = await prisma.question.findUnique({
            where: { id: qId }
        });

        if (!existingQuestion) {
            return res.status(404).json({ message: "Question not found" });
        }

        const adminId = authUser ? BigInt(authUser.userId || authUser.id) : null;

        const updatedQuestion = await prisma.question.update({
            where: { id: qId },
            data: {
                answer: answer.trim(),
                answeredById: adminId,
                answeredAt: new Date(),
                isAnswered: true,
                status: "APPROVED"
            },
            include: {
                product: {
                    select: { id: true, name: true, image: true }
                },
                user: {
                    select: { id: true, fullName: true, avatar: true }
                }
            }
        });

        return res.status(200).json({
            message: "Question answered successfully",
            question: mapQuestionToResponse(updatedQuestion)
        });
    } catch (error: any) {
        console.error("Error answering question:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * PATCH /api/qna/admin/:id/status
 * Admin thay đổi trạng thái câu hỏi (APPROVED, REJECTED, PENDING)
 */
export const updateQuestionStatusAdmin = async (req: Request, res: Response) => {
    try {
        const idStr = req.params.id as string;
        const { status } = req.body;

        if (!idStr) {
            return res.status(400).json({ message: "Question ID is required" });
        }

        if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const qId = BigInt(idStr);

        const updatedQuestion = await prisma.question.update({
            where: { id: qId },
            data: { status },
            include: {
                product: { select: { id: true, name: true, image: true } },
                user: { select: { id: true, fullName: true, avatar: true } }
            }
        });

        return res.status(200).json({
            message: "Question status updated successfully",
            question: mapQuestionToResponse(updatedQuestion)
        });
    } catch (error: any) {
        console.error("Error updating question status:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

/**
 * DELETE /api/qna/admin/:id
 * Admin xóa câu hỏi
 */
export const deleteQuestionAdmin = async (req: Request, res: Response) => {
    try {
        const idStr = req.params.id as string;
        if (!idStr) {
            return res.status(400).json({ message: "Question ID is required" });
        }

        const qId = BigInt(idStr);

        await prisma.question.delete({
            where: { id: qId }
        });

        return res.status(200).json({ message: "Question deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting question:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};
