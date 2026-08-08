import { Request, Response } from "express";
import prisma from "../config/prisma";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { formatUserResponse } from "../utils/userMapper";
import { AuthRequest } from "../middlewares/auth.middleware";

export const register = async (req: Request, res: Response) => {
    try {
        const { username, email, password, fullName, phone } = req.body;

        if (!username || !email || !password || !fullName) {
            return res.status(400).json({
                message: "Missing required fields: username, email, password, and fullName are required"
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters long"
            });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email },
                    { username }
                ]
            }
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).json({
                    message: "Email is already registered"
                });
            }
            return res.status(409).json({
                message: "Username is already taken"
            });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName,
                phone: phone || null,
                cart: {
                    create: {}
                }
            }
        });

        const token = generateToken({
            userId: user.id.toString(),
            role: user.role
        });

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, username, password } = req.body;
        const identifier = email || username;

        if (!identifier || !password) {
            return res.status(400).json({
                message: "Email/Username and password are required"
            });
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email/username or password"
            });
        }

        if (user.status === "BANNED") {
            return res.status(403).json({
                message: "Your account has been banned. Please contact support."
            });
        }

        if (user.status === "INACTIVE") {
            return res.status(403).json({
                message: "Your account is inactive."
            });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                message: "Invalid email/username or password"
            });
        }

        const token = generateToken({
            userId: user.id.toString(),
            role: user.role
        });

        return res.json({
            message: "Login successfully",
            token,
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: BigInt(req.user.userId)
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({
            user: formatUserResponse(user)
        });

    } catch (error) {
        console.error("GetMe Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { fullName, phone, avatar } = req.body;

        const updatedUser = await prisma.user.update({
            where: {
                id: BigInt(req.user.userId)
            },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(phone !== undefined && { phone }),
                ...(avatar !== undefined && { avatar })
            }
        });

        return res.json({
            message: "Profile updated successfully",
            user: formatUserResponse(updatedUser)
        });

    } catch (error) {
        console.error("UpdateProfile Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "New password must be at least 6 characters long"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: BigInt(req.user.userId)
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        const hashedPassword = await hashPassword(newPassword);

        await prisma.user.update({
            where: {
                id: BigInt(req.user.userId)
            },
            data: {
                password: hashedPassword
            }
        });

        return res.json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("ChangePassword Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
