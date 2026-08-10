import { Router } from "express";
import { createPaymentUrl, vnpayReturn } from "../controllers/payment.controller";

const router = Router();

// Public payment routes
router.post("/vnpay/create_payment_url", createPaymentUrl);
router.get("/vnpay/vnpay_return", vnpayReturn);

export default router;
