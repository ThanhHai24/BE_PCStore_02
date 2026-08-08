import prisma from "../src/config/prisma";
import { seedCategories, seedBrands, seedCategoryBrands } from "./brandcategory.seed";
import seedProducts from "./product.seed";

async function main() {
    console.log("🌱 Starting Comprehensive Database Seeding...");

    // 1. Seed Categories
    console.log("\n1️⃣ Seeding Categories...");
    await seedCategories();

    // 2. Seed Brands
    console.log("\n2️⃣ Seeding Brands...");
    await seedBrands();

    // 3. Seed Category-Brand Relationships
    console.log("\n3️⃣ Seeding Category-Brand Relationships...");
    await seedCategoryBrands();

    // 4. Seed Products (Linh kiện & PC)
    console.log("\n4️⃣ Seeding Products (Linh kiện & PC)...");
    await seedProducts();

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

