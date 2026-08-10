import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getBrands = async (req: Request, res: Response) => {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: { name: "asc" }
        });

        return res.json({
            brands: brands.map((b) => ({
                id: b.id.toString(),
                name: b.name,
                slug: b.slug,
                description: b.description,
                logo: b.logo,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            }))
        });
    } catch (error) {
        console.error("GetBrands Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
