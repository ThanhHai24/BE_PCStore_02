import prisma from "../src/config/prisma";
import { slugify } from "../src/utils/slugify";

export const brandData = [
    { name: "Intel", description: "Intel" },
    { name: "AMD", description: "AMD" },
    { name: "NVIDIA", description: "NVIDIA" },
    { name: "ASUS", description: "ASUS" },
    { name: "MSI", description: "MSI" },
    { name: "Lenovo", description: "Lenovo" },
    { name: "Acer", description: "Acer" },
    { name: "Dell", description: "Dell" },
    { name: "HP", description: "HP" },
    { name: "Samsung", description: "Samsung" },
    { name: "Corsair", description: "Corsair" },
    { name: "Kingston", description: "Kingston" },
    { name: "HyperX", description: "HyperX" },
    { name: "Cooler Master", description: "Cooler Master" },
    { name: "Thermaltake", description: "Thermaltake" },
    { name: "Seagate", description: "Seagate" },
    { name: "Western Digital", description: "Western Digital" },
    { name: "Toshiba", description: "Toshiba" },
    { name: "SanDisk", description: "SanDisk" },
    { name: "Crucial", description: "Crucial" },
    { name: "G.Skill", description: "G.Skill" },
    { name: "Zotac", description: "Zotac" },
    { name: "Gigabyte", description: "Gigabyte" },
    { name: "ASRock", description: "ASRock" },
    { name: "Biostar", description: "Biostar" },
    { name: "ECS", description: "ECS" },
    { name: "Foxconn", description: "Foxconn" },
    { name: "InWin", description: "InWin" },
    { name: "NZXT", description: "NZXT" },
    { name: "Phanteks", description: "Phanteks" },
    { name: "Lian Li", description: "Lian Li" },
    { name: "INNO3D", description: "INNO3D" },
    { name: "ID_COOLING", description: "ID_COOLING" },
    { name: "PCS", description: "PCS" },
    { name: "Colorful", description: "Colorful" },
    { name: "Lexar", description: "Lexar" },
    { name: "Gamdias", description: "Gamdias" },
    { name: "Vitra", description: "Vitra" }
];

const seedBrands = async () => {
    console.log("🌱 Starting Brand Seeding...");

    for (const b of brandData) {
        const slug = slugify(b.name);
        const brand = await prisma.brand.upsert({
            where: { slug },
            update: {
                name: b.name,
                description: b.description
            },
            create: {
                name: b.name,
                slug,
                description: b.description
            }
        });
        console.log(`   └─ Brand: ${brand.name} (${brand.slug})`);
    }

    console.log("🎉 Brand Seeding completed successfully!");
};

export default seedBrands;