import { Router } from "express";
import {
    getQuestionsByProduct,
    createQuestion,
    getAllQuestionsAdmin,
    answerQuestionAdmin,
    updateQuestionStatusAdmin,
    deleteQuestionAdmin
} from "../controllers/qna.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

// ======================================================
// PUBLIC / USER ROUTES
// ======================================================

// GET /api/qna/product/:productId - Lấy danh sách câu hỏi của sản phẩm
router.get("/product/:productId", optionalAuthenticate, getQuestionsByProduct);

// POST /api/qna/product/:productId - Khách hàng gửi câu hỏi mới (hỗ trợ cả khách vãng lai lẫn user đã đăng nhập)
router.post("/product/:productId", optionalAuthenticate, createQuestion);

// ======================================================
// ADMIN ROUTES
// ======================================================

// GET /api/qna/admin/all - Admin lấy danh sách tất cả câu hỏi
router.get("/admin/all", authenticate, authorize("ADMIN"), getAllQuestionsAdmin);

// PUT /api/qna/admin/:id/answer - Admin trả lời / phản hồi câu hỏi
router.put("/admin/:id/answer", authenticate, authorize("ADMIN"), answerQuestionAdmin);

// PATCH /api/qna/admin/:id/status - Admin đổi trạng thái câu hỏi (APPROVED, REJECTED, PENDING)
router.patch("/admin/:id/status", authenticate, authorize("ADMIN"), updateQuestionStatusAdmin);

// DELETE /api/qna/admin/:id - Admin xóa câu hỏi
router.delete("/admin/:id", authenticate, authorize("ADMIN"), deleteQuestionAdmin);

export default router;
