import { Category } from "../model/relations.js";
import slugify from "slugify";
import { fileURLToPath } from "url";
import { jiffy } from "../config/sequelize.js";
const categories = [
    {
        name: "Men",
        level: 0,
        children: [
            {
                name: "Clothing",
                level: 1,
                children: [
                    "T-Shirts",
                    "Shirts",
                    "Jeans",
                    "Trousers",
                    "Pants",
                    "Shorts",
                    "Ethnic Wear",
                    "Suits & Blazers",
                    "Jackets",
                    "Hoodies & Sweatshirts",
                    "Sweaters",
                    "Innerwear",
                    "Sleepwear",
                    "Activewear"
                ]
            },
            {
                name: "Footwear",
                level: 1,
                children: [
                    "Sneakers",
                    "Sports Shoes",
                    "Formal Shoes",
                    "Casual Shoes",
                    "Sandals",
                    "Slippers & Flip-Flops",
                    "Boots",
                    "Ethnic Footwear"
                ]
            },
            {
                name: "Accessories",
                level: 1,
                children: [
                    "Watches",
                    "Wallets",
                    "Belts",
                    "Sunglasses",
                    "Bags",
                    "Caps & Hats",
                    "Ties",
                    "Cufflinks",
                    "Jewellery",
                    "Socks",
                    "Scarves",
                    "Handkerchiefs"
                ]
            }
        ]
    },
    {
        name: "Women",
        level: 0,
        children: [
            {
                name: "Clothing",
                level: 1,
                children: [
                    "Tops",
                    "T-Shirts",
                    "Shirts",
                    "Kurtis",
                    "Kurtas & Sets",
                    "Dresses",
                    "Jumpsuits",
                    "Jeans",
                    "Trousers",
                    "Leggings",
                    "Jeggings",
                    "Palazzos",
                    "Skirts",
                    "Shorts",
                    "Ethnic Wear",
                    "Sarees",
                    "Lehengas",
                    "Blouses",
                    "Salwar Suits",
                    "Co-ord Sets",
                    "Jackets",
                    "Blazers",
                    "Hoodies & Sweatshirts",
                    "Sweaters",
                    "Innerwear",
                    "Lingerie",
                    "Sleepwear",
                    "Activewear",
                    "Maternity Wear"
                ]
            },
            {
                name: "Footwear",
                level: 1,
                children: [
                    "Heels",
                    "Pumps",
                    "Stilettos",
                    "Wedges",
                    "Flats",
                    "Ballet Flats",
                    "Loafers",
                    "Sneakers",
                    "Sports Shoes",
                    "Sandals",
                    "Slippers & Flip-Flops",
                    "Boots",
                    "Ethnic Footwear",
                    "Mules",
                    "Clogs"
                ]
            },
            {
                name: "Accessories",
                level: 1,
                children: [
                    "Watches",
                    "Handbags",
                    "Wallets",
                    "Belts",
                    "Sunglasses",
                    "Jewellery",
                    "Earrings",
                    "Necklaces",
                    "Bracelets",
                    "Rings",
                    "Anklets",
                    "Scarves",
                    "Caps & Hats",
                    "Hair Accessories",
                    "Clutches",
                    "Totes",
                    "Backpacks",
                    "Socks",
                    "Handkerchiefs"
                ]
            }
        ]
    },
    {
        name: "Kids",
        level: 0,
        children: [
            {
                name: "Clothing",
                level: 1,
                children: [
                    "T-Shirts",
                    "Shirts",
                    "Tops",
                    "Dresses",
                    "Frocks",
                    "Jeans",
                    "Trousers",
                    "Shorts",
                    "Leggings",
                    "Joggers",
                    "Tracksuits",
                    "Hoodies & Sweatshirts",
                    "Sweaters",
                    "Jackets",
                    "Ethnic Wear",
                    "Kurtas & Sets",
                    "Nightwear",
                    "Innerwear",
                    "School Uniforms",
                    "Rompers",
                    "Dungarees",
                    "Co-ord Sets"
                ]
            },
            {
                name: "Footwear",
                level: 1,
                children: [
                    "Sneakers",
                    "Sports Shoes",
                    "Casual Shoes",
                    "School Shoes",
                    "Sandals",
                    "Slippers & Flip-Flops",
                    "Boots",
                    "Ethnic Footwear",
                    "Rain Boots"
                ]
            },
            {
                name: "Accessories",
                level: 1,
                children: [
                    "School Bags",
                    "Backpacks",
                    "Watches",
                    "Caps & Hats",
                    "Sunglasses",
                    "Socks",
                    "Belts",
                    "Hair Accessories",
                    "Scarves",
                    "Gloves",
                    "Lunch Bags",
                    "Water Bottles"
                ]
            }
        ]
    }
];
export const seed = async () => {
    try {
        console.log("⏳ Truncating category and product tables...");
        await jiffy.query("SET FOREIGN_KEY_CHECKS = 0;");
        await jiffy.query("TRUNCATE TABLE product_categories;");
        await jiffy.query("TRUNCATE TABLE product_variants;");
        await jiffy.query("TRUNCATE TABLE products;");
        await jiffy.query("TRUNCATE TABLE categories;");
        await jiffy.query("SET FOREIGN_KEY_CHECKS = 1;");
        console.log("✅ Tables truncated successfully.");
    }
    catch (error) {
        console.error("❌ Error truncating tables:", error);
        throw error;
    }
    for (const g of categories) {
        let gender = await Category.findOne({ where: { name: g.name, level: 0 } });
        if (!gender)
            gender = await Category.create({
                name: g.name,
                slug: slugify(g.name, { lower: true }),
                level: 0,
            });
        for (const dept of g.children) {
            const deptName = typeof dept === "string" ? dept : dept.name;
            // Create unique slug by including parent category name
            const deptSlug = slugify(`${g.name} ${deptName}`, { lower: true });
            let department = await Category.findOne({
                where: { name: deptName, parentId: gender.id },
            });
            if (!department) {
                department = await Category.create({
                    name: deptName,
                    slug: deptSlug,
                    parentId: gender.id,
                    level: 1,
                });
            }
            const cats = typeof dept === "string" ? [] : dept.children || [];
            for (const c of cats) {
                // Create unique slug by including parent category names
                const catSlug = slugify(`${g.name} ${deptName} ${c}`, { lower: true });
                let cat = await Category.findOne({
                    where: { name: c, parentId: department.id },
                });
                if (!cat)
                    await Category.create({
                        name: c,
                        slug: catSlug,
                        parentId: department.id,
                        level: 2,
                    });
            }
        }
    }
    console.log("✅ Categories seeded successfully.");
};
// Only run if this file is executed directly (not imported)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    seed()
        .then(() => {
        console.log("✅ Seed categories completed.");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Seed categories failed:", error);
        process.exit(1);
    });
}
export default seed;
