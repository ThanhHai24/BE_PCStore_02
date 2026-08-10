import { Router } from 'express';
import { upload, uploadProductImage, uploadProductImages } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/role.middleware';

const router = Router();

// Single image upload
router.post(
    '/product-image',
    authenticate,
    authorize('ADMIN'),
    upload.single('image'),
    uploadProductImage
);

// Multiple images upload (up to 10)
router.post(
    '/product-images',
    authenticate,
    authorize('ADMIN'),
    upload.array('images', 10),
    uploadProductImages
);

export default router;
