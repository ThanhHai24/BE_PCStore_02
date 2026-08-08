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

// Public / User routes
router.post("/", optionalAuthenticate, createOrder);
router.get("/my-orders", authenticate, getUserOrders);
router.get("/:idOrCode", optionalAuthenticate, getOrderByIdOrCode);
router.put("/:id/cancel", authenticate, cancelOrder);

// Admin routes
router.get("/", authenticate, authorize("ADMIN"), getAllOrders);
router.put("/:id/status", authenticate, authorize("ADMIN"), updateOrderStatus);
router.put("/:id/payment-status", authenticate, authorize("ADMIN"), updatePaymentStatus);

export default router;
