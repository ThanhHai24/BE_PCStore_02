import { Router } from "express";
import {
    createOrder,
    getUserOrders,
    getOrderByIdOrCode,
    cancelOrder,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus
} from "../controllers/order.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

// ─── Admin routes (specific paths FIRST — must be before /:idOrCode wildcard) ─────
router.get("/", authenticate, authorize("ADMIN"), getAllOrders);
router.put("/:id/status", authenticate, authorize("ADMIN"), updateOrderStatus);
router.put("/:id/payment-status", authenticate, authorize("ADMIN"), updatePaymentStatus);

// ─── User routes ──────────────────────────────────────────────────────────────────
router.post("/", optionalAuthenticate, createOrder);
router.get("/my-orders", authenticate, getUserOrders);
router.put("/:id/cancel", authenticate, cancelOrder);

// ─── Wildcard route LAST ──────────────────────────────────────────────────────────
router.get("/:idOrCode", optionalAuthenticate, getOrderByIdOrCode);

export default router;
