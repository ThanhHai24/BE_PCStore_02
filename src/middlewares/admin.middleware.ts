import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export const requireAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized: Missing authentication token"
        });
    }

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            message: "Forbidden: Access denied. Admin rights required."
        });
    }

    next();
};
