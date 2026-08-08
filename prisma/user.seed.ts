import prisma from "../src/config/prisma";
import { hashPassword } from "../src/utils/hash";
import { Role, UserStatus } from "@prisma/client";

export const seedUsers = async () => {
    console.log("👤 Seeding Users...");

    const adminPassword = await hashPassword("admin123");
    const customerPassword = await hashPassword("customer123");

    const usersData = [
        {
            username: "admin",
            email: "admin@pcstore.com",
            password: adminPassword,
            fullName: "System Administrator",
            phone: "0901234567",
            role: Role.ADMIN,
            status: UserStatus.ACTIVE,
        },
        {
            username: "customer",
            email: "customer@pcstore.com",
            password: customerPassword,
            fullName: "Nguyễn Văn Customer",
            phone: "0987654321",
            role: Role.CUSTOMER,
            status: UserStatus.ACTIVE,
        },
    ];

    for (const userData of usersData) {
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {
                role: userData.role,
                status: userData.status,
            },
            create: {
                ...userData,
                cart: {
                    create: {},
                },
            },
        });

        // Ensure cart exists even if user existed before without cart
        const existingCart = await prisma.cart.findUnique({
            where: { userId: user.id },
        });

        if (!existingCart) {
            await prisma.cart.create({
                data: {
                    userId: user.id,
                },
            });
        }

        console.log(`✅ User: ${user.fullName} (${user.email}) - Role: ${user.role}`);
    }

    console.log("[Seed] Users seeded successfully.");
};

export default seedUsers;
