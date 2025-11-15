import { Category } from "../model/relations.js";
import slugify from "slugify";
import { fileURLToPath } from "url";
const categories = [
    {
        name: "Men",
        level: 0,
        children: [
            {
                name: "Clothing",
                level: 1,
                children: [
                    "T-Shirts & Polos",
                    "Shirts",
                    "Jeans",
                    "Trousers / Chinos",
                    "Shorts",
                ],
            },
            {
                name: "Footwear",
                level: 1,
                children: ["Casual Shoes", "Formal Shoes", "Sneakers"],
            },
        ],
    },
    {
        name: "Women",
        level: 0,
        children: [
            {
                name: "Clothing",
                level: 1,
                children: ["Tops & Tees", "Dresses", "Kurtas & Kurtis"],
            },
            { name: "Footwear", level: 1, children: ["Flats", "Heels", "Sandals"] },
        ],
    },
    {
        name: "Kids",
        level: 0,
        children: [
            {
                name: "Boys Clothing",
                level: 1,
                children: ["T-Shirts & Shirts", "Jeans & Trousers"],
            },
            {
                name: "Girls Clothing",
                level: 1,
                children: ["Dresses & Frocks", "Tops & T-Shirts"],
            },
        ],
    },
];
export const seed = async () => {
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
