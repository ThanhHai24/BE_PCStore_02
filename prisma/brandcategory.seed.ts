import prisma from "../src/config/prisma";
import { slugify } from "../src/utils/slugify";

export const categoryData = [
    {
        name: "Linh kiện máy tính",
        description: "CPU, GPU, RAM, mainboard, ổ cứng, nguồn, tản nhiệt",
        children: [
            { name: "CPU - Bộ vi xử lý", description: "Intel Core i3–i9, AMD Ryzen 5–9" },
            { name: "VGA - Card đồ họa", description: "NVIDIA GeForce RTX, AMD Radeon RX" },
            { name: "RAM - Bộ nhớ trong", description: "DDR4, DDR5 cho PC và laptop" },
            { name: "Ổ cứng HDD / SSD", description: "SSD NVMe M.2, SATA, HDD 2.5\"/3.5\"" },
            { name: "Mainboard - Bo mạch chủ", description: "Bo mạch chủ Intel, AMD các chuẩn socket" },
            { name: "PSU - Nguồn máy tính", description: "Nguồn máy tính Intel, AMD các chuẩn socket" },
            { name: "Case - Vỏ máy tính", description: "Vỏ máy tính case mini ITX, case mid ATX, case full tower" },
            { name: "Tản nhiệt CPU", description: "Tản nhiệt CPU, tản nhiệt RAM, tản nhiệt GPU, tản nhiệt case" },
            { name: "Quạt tản nhiệt", description: "Quạt tản nhiệt case" }
        ]
    },
    {
        name: "PC",
        description: "PC gaming, PC văn phòng, workstation",
        children: [
            { name: "PC Gaming", description: "PC Gaming với linh kiện hàng đầu cho trải nghiệm game đỉnh cao" },
            { name: "PC Văn phòng", description: "PC Văn phòng cấu hình tối ưu cho công việc văn phòng" },
            { name: "PC Đồ họa", description: "PC Đồ họa cấu hình tối ưu cho công việc đồ họa" }
        ]
    },
    {
        name: "Phụ kiện & Cáp",
        description: "Hub USB, cáp HDMI, túi laptop, đế tản nhiệt",
        children: []
    },
    {
        name: "Thiết bị ngoại vi",
        description: "Màn hình, bàn phím, chuột, tai nghe, webcam",
        children: [
            { name: "Bàn phím", description: "Bàn phím cơ, membrane, gaming, không dây" },
            { name: "Chuột", description: "Chuột gaming, văn phòng, không dây" },
            { name: "Tai nghe", description: "Gaming, studio, TWS, có micro" }
        ]
    },
    {
        name: "Laptop",
        description: "Laptop gaming, văn phòng, đồ họa, ultrabook",
        children: [
            { name: "Laptop Gaming", description: "ASUS ROG, MSI, Lenovo Legion, Acer Nitro" },
            { name: "Laptop Văn phòng", description: "Dell, HP, Lenovo ThinkPad, Acer Aspire" },
            { name: "Laptop Đồ họa", description: "MacBook Pro, Dell XPS, ASUS ProArt" }
        ]
    },
    {
        name: "Màn hình",
        description: "Màn hình gaming, màn hình văn phòng, màn hình đồ họa",
        children: []
    }
];

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
    { name: "LG", description: "LG" },
    { name: "Corsair", description: "Corsair" },
    { name: "Kingston", description: "Kingston" },
    { name: "Logitech", description: "Logitech" },
    { name: "Razer", description: "Razer" },
    { name: "SteelSeries", description: "SteelSeries" },
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

export const categoryBrandSlugMap: { categorySlug: string; brandSlugs: string[] }[] = [
    {
        categorySlug: "cpu-bo-vi-xu-ly",
        brandSlugs: ["intel", "amd"]
    },
    {
        categorySlug: "vga-card-do-hoa",
        brandSlugs: ["amd", "nvidia", "asus", "msi", "zotac", "gigabyte", "asrock", "inno3d", "colorful"]
    },
    {
        categorySlug: "ram-bo-nho-trong",
        brandSlugs: ["samsung", "corsair", "kingston", "hyperx", "crucial", "gskill", "lexar"]
    },
    {
        categorySlug: "o-cung-hdd-ssd",
        brandSlugs: ["samsung", "kingston", "seagate", "western-digital", "toshiba", "sandisk", "crucial", "gigabyte", "lexar"]
    },
    {
        categorySlug: "mainboard-bo-mach-chu",
        brandSlugs: ["asus", "msi", "gigabyte", "asrock", "biostar"]
    },
    {
        categorySlug: "psu-nguon-may-tinh",
        brandSlugs: ["asus", "msi", "corsair", "cooler-master", "thermaltake", "gamdias"]
    },
    {
        categorySlug: "case-vo-may-tinh",
        brandSlugs: ["asus", "msi", "cooler-master", "thermaltake", "inwin", "nzxt", "phanteks", "lian-li", "vitra"]
    },
    {
        categorySlug: "tan-nhiet-cpu",
        brandSlugs: ["asus", "msi", "corsair", "cooler-master", "thermaltake", "nzxt", "idcooling"]
    },
    {
        categorySlug: "quat-tan-nhiet",
        brandSlugs: ["asus", "msi", "corsair", "cooler-master", "thermaltake", "nzxt"]
    },
    {
        categorySlug: "ban-phim",
        brandSlugs: ["asus", "msi", "corsair", "logitech", "razer", "steelseries", "hyperx"]
    },
    {
        categorySlug: "chuot",
        brandSlugs: ["asus", "msi", "logitech", "razer", "steelseries"]
    },
    {
        categorySlug: "tai-nghe",
        brandSlugs: ["corsair", "logitech", "razer", "steelseries", "hyperx"]
    },
    {
        categorySlug: "laptop-gaming",
        brandSlugs: ["asus", "msi", "lenovo", "acer", "dell", "hp"]
    },
    {
        categorySlug: "laptop-van-phong",
        brandSlugs: ["asus", "lenovo", "acer", "dell", "hp"]
    },
    {
        categorySlug: "laptop-do-hoa",
        brandSlugs: ["asus", "msi", "lenovo", "acer", "dell", "hp", "gigabyte"]
    },
    {
        categorySlug: "pc-gaming",
        brandSlugs: ["intel", "amd", "nvidia", "asus", "msi", "corsair", "kingston", "cooler-master", "thermaltake", "seagate", "western-digital", "crucial", "gskill", "gigabyte", "asrock", "inwin", "nzxt", "phanteks", "lian-li", "pcs"]
    },
    {
        categorySlug: "pc-van-phong",
        brandSlugs: ["intel", "amd", "asus", "msi", "kingston", "cooler-master", "seagate", "western-digital", "crucial", "gigabyte", "asrock", "pcs"]
    },
    {
        categorySlug: "pc-do-hoa",
        brandSlugs: ["intel", "amd", "nvidia", "asus", "msi", "corsair", "kingston", "cooler-master", "seagate", "western-digital", "crucial", "gskill", "gigabyte", "asrock", "nzxt", "pcs"]
    },
    {
        categorySlug: "laptop",
        brandSlugs: ["asus", "msi", "gigabyte"]
    },
    {
        categorySlug: "man-hinh",
        brandSlugs: ["asus", "msi", "acer", "dell", "samsung", "lg"]
    },
    {
        categorySlug: "thiet-bi-ngoai-vi",
        brandSlugs: ["msi"]
    },
    {
        categorySlug: "pc",
        brandSlugs: ["pcs"]
    }
];

export const seedCategories = async () => {
    for (const group of categoryData) {
        const parentSlug = slugify(group.name);
        const parentCategory = await prisma.category.upsert({
            where: { slug: parentSlug },
            update: {
                name: group.name,
                description: group.description
            },
            create: {
                name: group.name,
                slug: parentSlug,
                description: group.description
            }
        });

        console.log(`✅ Category: ${parentCategory.name} (${parentCategory.slug})`);

        for (const child of group.children) {
            const childSlug = slugify(child.name);
            const childCategory = await prisma.category.upsert({
                where: { slug: childSlug },
                update: {
                    name: child.name,
                    description: child.description,
                    parentId: parentCategory.id
                },
                create: {
                    name: child.name,
                    slug: childSlug,
                    description: child.description,
                    parentId: parentCategory.id
                }
            });

            console.log(`   └─ Child Category: ${childCategory.name} (${childCategory.slug})`);
        }
    }
    console.log("[Seed] Categories seeded successfully.");
};

export const seedBrands = async () => {
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
        console.log(`✅ Brand: ${brand.name} (${brand.slug})`);
    }
    console.log("[Seed] Brands seeded successfully.");
};

export const seedCategoryBrands = async () => {
    const categories = await prisma.category.findMany();
    const brands = await prisma.brand.findMany();

    const categoryMap = new Map<string, bigint>();
    categories.forEach((c) => categoryMap.set(c.slug, c.id));

    const brandMap = new Map<string, bigint>();
    brands.forEach((b) => brandMap.set(b.slug, b.id));

    const pairs: { categoryId: bigint; brandId: bigint }[] = [];

    for (const item of categoryBrandSlugMap) {
        const categoryId = categoryMap.get(item.categorySlug);
        if (!categoryId) {
            console.warn(`Category slug not found: ${item.categorySlug}`);
            continue;
        }

        for (const brandSlug of item.brandSlugs) {
            const brandId = brandMap.get(brandSlug);
            if (!brandId) {
                console.warn(`Brand slug not found: ${brandSlug}`);
                continue;
            }
            pairs.push({ categoryId, brandId });
        }
    }

    await prisma.categoryBrand.createMany({
        skipDuplicates: true,
        data: pairs
    });

    console.log(`[Seed] Successfully linked ${pairs.length} Category-Brand relationships.`);
};

export default seedCategoryBrands;