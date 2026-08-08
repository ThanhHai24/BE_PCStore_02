import prisma from "../src/config/prisma";
import { UserStatus } from "@prisma/client";

const seedSuppliers = async () => {
    const count = await prisma.supplier.count();
    if (count > 0) {
        console.log("[Seed] supplier: already seeded, skipping.");
        return;
    }

    await prisma.supplier.createMany({
        data: [
            {
                id: BigInt("1"),
                name: "FPT Synnex",
                slug: "fpt-synnex",
                description: "FPT Synnex",
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-06-06T21:45:48.345Z"),
                updatedAt: new Date("2026-06-06T21:45:48.345Z")
            },
            {
                id: BigInt("2"),
                name: "Viết Sơn JSC",
                slug: "viet-son",
                description: "Viết Sơn",
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-06-06T21:45:48.345Z"),
                updatedAt: new Date("2026-06-06T21:45:48.345Z")
            },
            {
                id: BigInt("3"),
                name: "Viễn Sơn",
                slug: "vien-son",
                description: "Viễn Sơn",
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-06-06T21:45:48.345Z"),
                updatedAt: new Date("2026-06-06T21:45:48.345Z")
            },
            {
                id: BigInt("4"),
                name: "Mai Hoàng",
                slug: "mai-hoang",
                description: "Mai Hoàng",
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-06-06T21:45:48.345Z"),
                updatedAt: new Date("2026-06-06T21:45:48.345Z")
            }
        ],
    });

    console.log("[Seed] supplier: seeded successfully.");
};

export default seedSuppliers;