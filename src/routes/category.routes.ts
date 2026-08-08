import { Router } from "express";
import {
    getCategories,
    getCategoryByIdOrSlug,
    getBrandsByCategory,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.get("/", getCategories);
router.get("/:idOrSlug", getCategoryByIdOrSlug);
router.get("/:idOrSlug/brands", getBrandsByCategory);


// Protected Admin routes
router.post("/", authenticate, authorize("ADMIN"), createCategory);
router.put("/:id", authenticate, authorize("ADMIN"), updateCategory);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteCategory);

export default router;
