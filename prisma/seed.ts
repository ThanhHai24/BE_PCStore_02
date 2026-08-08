import prisma from "../src/config/prisma";
import { seedCategories, seedBrands, seedCategoryBrands } from "./brandcategory.seed";
import seedProducts from "./product.seed";
import { seedUsers } from "./user.seed";
import seedSuppliers from "./supplier.seed";
import seedShipping from "./shipping.seed";
import seedOrder from "./order.seed";

async function main() {
    console.log("🌱 Starting Comprehensive Database Seeding...");

    // 1. Seed Users (Admin & Customer)
    console.log("\n0️⃣ Seeding Users...");
    await seedUsers();

    // 2. Seed Categories
    console.log("\n1️⃣ Seeding Categories...");
    await seedCategories();

    // 3. Seed Brands
    console.log("\n2️⃣ Seeding Brands...");
    await seedBrands();

    // 4. Seed Category-Brand Relationships
    console.log("\n3️⃣ Seeding Category-Brand Relationships...");
    await seedCategoryBrands();

    // 5. Seed Suppliers
    console.log("\n4️⃣ Seeding Suppliers...");
    await seedSuppliers();

    // 6. Seed Shipping Providers
    console.log("\n5️⃣ Seeding Shipping Providers...");
    await seedShipping();

    // 7. Seed Products (Linh kiện & PC)
    console.log("\n6️⃣ Seeding Products (Linh kiện & PC)...");
    await seedProducts();

    // 8. Seed Orders, OrderItems, OrderStatusHistories, ShippingOrders & Payments
    console.log("\n7️⃣ Seeding Orders & Related Details...");
    await seedOrder();

    console.log("\n🎉 Full Seeding completed successfully!");
}


main()
    .catch((e) => {
        console.error("❌ Seeding Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

