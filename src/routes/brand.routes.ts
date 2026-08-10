import { Router } from "express";
import {
    getBrands,
    getBrandByIdOrSlug,
    createBrand,
    updateBrand,
    deleteBrand
} from "../controllers/brand.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/admin.middleware";

const router = Router();

// Public routes
router.get("/", getBrands);
router.get("/:idOrSlug", getBrandByIdOrSlug);

// Admin-only routes
router.post("/", authenticate, requireAdmin, createBrand);
router.put("/:id", authenticate, requireAdmin, updateBrand);
router.delete("/:id", authenticate, requireAdmin, deleteBrand);

export default router;
