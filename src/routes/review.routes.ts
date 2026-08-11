import { Router } from "express";
import {
  getReviewsByProduct,
  createReview,
  deleteReview,
  getAllReviews,
  updateReviewStatus
} from "../controllers/review.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

// Public / Optional Auth routes for product reviews
router.get("/product/:productId", optionalAuthenticate, getReviewsByProduct);
router.post("/product/:productId", authenticate, createReview);

// User / Protected routes
router.delete("/:id", authenticate, deleteReview);

// Admin routes
router.get("/", authenticate, authorize("ADMIN"), getAllReviews);
router.put("/:id/status", authenticate, authorize("ADMIN"), updateReviewStatus);

export default router;
