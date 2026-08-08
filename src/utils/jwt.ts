import jwt from "jsonwebtoken";

export interface JwtPayload {
    userId: string;
    role: string;
}

export const generateToken = (payload: JwtPayload): string => {
    const secret = process.env.JWT_SECRET || "supersecretkey";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
};

export const verifyToken = (token: string): JwtPayload => {
    const secret = process.env.JWT_SECRET || "supersecretkey";
    return jwt.verify(token, secret) as JwtPayload;
};