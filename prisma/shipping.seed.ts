import prisma from "../src/config/prisma";
import { UserStatus } from "@prisma/client";

const seedShipping = async () => {
    const count = await prisma.shippingProvider.count();
    if (count > 0) {
        console.log("[Seed] shippingProvider: already seeded, skipping.");
        return;
    }

    await prisma.shippingProvider.createMany({
        data: [
            {
                id: BigInt("1"),
                name: "Vận chuyển Ảo (Mock)",
                code: "VIRTUAL",
                apiKey: "N/A",
                status: UserStatus.ACTIVE,
                createdAt: new Date("2026-06-07T08:04:06.485Z"),
                updatedAt: new Date("2026-06-07T08:04:06.485Z")
            }
        ],
    });

    console.log("[Seed] shippingProvider: seeded successfully.");
};

export default seedShipping;