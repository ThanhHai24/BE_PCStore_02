import { Router } from "express";
import {
    getProducts,
    getFeaturedProducts,
    getProductByIdOrSlug,
    createProduct,
    updateProduct,
    deleteProduct
} from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { authorize } from "../middlewares/role.middleware";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/featured", getFeaturedProducts);
router.get("/:idOrSlug", getProductByIdOrSlug);

// Protected Admin routes
router.post("/", authenticate, authorize("ADMIN"), createProduct);
router.put("/:id", authenticate, authorize("ADMIN"), updateProduct);
router.delete("/:id", authenticate, authorize("ADMIN"), deleteProduct);

export default router;
