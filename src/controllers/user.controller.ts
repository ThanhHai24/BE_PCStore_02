import { Request, Response } from "express";
import prisma from "../config/prisma";
import { hashPassword } from "../utils/hash";
import { formatUserResponse } from "../utils/userMapper";
import { Role, UserStatus } from "@prisma/client";

// Get All Users (with pagination, role filter, status filter, search)
export const getUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || "";
        const role = req.query.role as Role;
        const status = req.query.status as UserStatus;

        const skip = (page - 1) * limit;

        const where: any = {};

        if (role) {
            where.role = role;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } }
            ];
        }

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { orders: true }
                    },
                    orders: {
                        select: { totalAmount: true }
                    }
                }
            })
        ]);

        const formattedUsers = users.map(user => {
            const totalSpent = user.orders.reduce((sum, o) => sum + o.totalAmount, 0);
            return {
                ...formatUserResponse(user),
                ordersCount: user._count.orders,
                totalSpent
            };
        });

        return res.status(200).json({
            users: formattedUsers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Get Users Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Get User Detail By ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const userId = BigInt(idStr);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: { orders: true, reviews: true }
                },
                orders: {
                    select: {
                        id: true,
                        code: true,
                        totalAmount: true,
                        status: true,
                        createdAt: true
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const totalSpent = user.orders.reduce((sum, o) => sum + o.totalAmount, 0);

        const formattedOrders = user.orders.map(o => ({
            ...o,
            id: o.id.toString()
        }));

        return res.status(200).json({
            user: {
                ...formatUserResponse(user),
                ordersCount: user._count.orders,
                reviewsCount: user._count.reviews,
                totalSpent,
                recentOrders: formattedOrders
            }
        });
    } catch (error) {
        console.error("Get User Detail Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Create User (Admin Action)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, fullName, phone, role, status } = req.body || {};

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
                OR: [{ email }, { username }]
            }
        });

        if (existingUser) {
            if (existingUser.email === email) {
                return res.status(409).json({ message: "Email is already registered" });
            }
            return res.status(409).json({ message: "Username is already taken" });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                fullName,
                phone: phone || null,
                role: role === "ADMIN" ? Role.ADMIN : Role.CUSTOMER,
                status: status in UserStatus ? status : UserStatus.ACTIVE,
                cart: {
                    create: {}
                }
            }
        });

        return res.status(201).json({
            message: "User created successfully",
            user: formatUserResponse(user)
        });
    } catch (error) {
        console.error("Create User Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Update User (Admin Action)
export const updateUser = async (req: Request, res: Response) => {
    try {
        const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const userId = BigInt(idStr);

        const { fullName, phone, avatar, role, status } = req.body || {};

        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const updatedData: any = {};
        if (fullName !== undefined) updatedData.fullName = fullName;
        if (phone !== undefined) updatedData.phone = phone;
        if (avatar !== undefined) updatedData.avatar = avatar;
        if (role && (role === "ADMIN" || role === "CUSTOMER")) updatedData.role = role;
        if (status && status in UserStatus) updatedData.status = status;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updatedData
        });

        return res.status(200).json({
            message: "User updated successfully",
            user: formatUserResponse(updatedUser)
        });
    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Delete User (Admin Action)
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const userId = BigInt(idStr);

        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        await prisma.user.delete({
            where: { id: userId }
        });

        return res.status(200).json({
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error("Delete User Error:", error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};
