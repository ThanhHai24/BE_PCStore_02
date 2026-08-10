import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${randomUUID()}${ext}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload ảnh (jpg, jpeg, png, webp, gif, avif)'));
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

/**
 * POST /api/upload/product-image
 * Upload a single product image
 */
export const uploadProductImage = (req: Request, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ message: 'Không có file được upload' });
        return;
    }
    const imageUrl = `/uploads/products/${req.file.filename}`;
    res.status(200).json({
        message: 'Upload thành công',
        filename: req.file.filename,
        url: imageUrl,
    });
};

/**
 * POST /api/upload/product-images
 * Upload multiple product images (max 10)
 */
export const uploadProductImages = (req: Request, res: Response): void => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
        res.status(400).json({ message: 'Không có file được upload' });
        return;
    }
    const results = files.map((f) => ({
        filename: f.filename,
        url: `/uploads/products/${f.filename}`,
    }));
    res.status(200).json({
        message: `Upload thành công ${files.length} ảnh`,
        files: results,
        urls: results.map((r) => r.url),
    });
};
