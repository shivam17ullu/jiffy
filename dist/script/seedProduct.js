import { jiffy } from "../config/sequelize.js";
import slugify from "slugify";
import { Category, Product, ProductVariant, User, Role, } from "../model/relations.js";
import { fileURLToPath } from "url";
async function seedProducts() {
    const t = await jiffy.transaction();
    try {
        console.log("⏳ Seeding dummy products...");
        // ------------------------------
        // 1. Fetch sellers
        // ------------------------------
        const sellerRole = await Role.findOne({
            where: { name: "seller" },
            transaction: t,
        });
        if (!sellerRole) {
            throw new Error("Seller role not found. Please run seedRoles.ts and seedUsers.ts first.");
        }
        const sellers = await User.findAll({
            include: [
                {
                    model: Role,
                    where: { name: "seller" },
                    through: { attributes: [] },
                },
            ],
            transaction: t,
        });
        if (sellers.length < 0) {
            throw new Error("Not enough sellers found. Please run seedUsers.ts first.");
        }
        console.log(`✅ Found ${sellers.length} sellers`);
        // ------------------------------
        // 2. Fetch categories
        // ------------------------------
        const menCategory = await Category.findOne({
            where: { name: "Men", level: 0 },
            transaction: t,
        });
        const womenCategory = await Category.findOne({
            where: { name: "Women", level: 0 },
            transaction: t,
        });
        if (!menCategory || !womenCategory) {
            throw new Error("Required category structure missing. Run seedCategory.ts first.");
        }
        // Find Clothing categories under Men and Women
        const menClothing = await Category.findOne({
            where: { name: "Clothing", parentId: menCategory.id, level: 1 },
            transaction: t,
        });
        const womenClothing = await Category.findOne({
            where: { name: "Clothing", parentId: womenCategory.id, level: 1 },
            transaction: t,
        });
        if (!menClothing || !womenClothing) {
            throw new Error("Clothing categories not found. Run seedCategory.ts first.");
        }
        // ------------------------------
        // 3. Dummy Products Array
        // ------------------------------
        const dummyProducts = [
            {
                name: "Blue Shirt",
                description: "Premium cotton shirt perfect for casual and semi-formal occasions. Comfortable fit with modern design.",
                brand: "Levis",
                images: [
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+133125.png",
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+144159.png",
                ],
                tags: ["shirt", "men", "casual", "cotton"],
                sellerId: sellers[0].id, // ⭐ First seller
                categories: [menClothing.id],
                variants: [
                    {
                        sku: "SHIRT-BLUE-M",
                        size: "M",
                        color: "Blue",
                        price: 799,
                        mrp: 999,
                        stock: 20,
                    },
                    {
                        sku: "SHIRT-BLUE-L",
                        size: "L",
                        color: "Blue",
                        price: 799,
                        mrp: 999,
                        stock: 15,
                    },
                    {
                        sku: "SHIRT-BLUE-XL",
                        size: "XL",
                        color: "Blue",
                        price: 849,
                        mrp: 1049,
                        stock: 10,
                    },
                ],
            },
            {
                name: "Red Dress",
                description: "Elegant party dress with a flattering silhouette. Perfect for evening events and special occasions.",
                brand: "Only",
                images: [
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+133125.png",
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+144159.png",
                ],
                tags: ["dress", "women", "party", "elegant"],
                sellerId: sellers[0].id, // ⭐ Second seller
                categories: [womenClothing.id],
                variants: [
                    {
                        sku: "DRESS-RED-S",
                        size: "S",
                        color: "Red",
                        price: 1299,
                        mrp: 1599,
                        stock: 10,
                    },
                    {
                        sku: "DRESS-RED-M",
                        size: "M",
                        color: "Red",
                        price: 1299,
                        mrp: 1599,
                        stock: 8,
                    },
                    {
                        sku: "DRESS-RED-L",
                        size: "L",
                        color: "Red",
                        price: 1349,
                        mrp: 1649,
                        stock: 5,
                    },
                ],
            },
            {
                name: "Classic Jeans",
                description: "Durable denim jeans with a classic fit. Perfect for everyday wear.",
                brand: "Levis",
                images: [
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+133125.png",
                ],
                tags: ["jeans", "men", "denim", "casual"],
                sellerId: sellers[0].id, // ⭐ First seller
                categories: [menClothing.id],
                variants: [
                    {
                        sku: "JEANS-BLUE-32",
                        size: "32",
                        color: "Blue",
                        price: 1499,
                        mrp: 1999,
                        stock: 25,
                    },
                    {
                        sku: "JEANS-BLUE-34",
                        size: "34",
                        color: "Blue",
                        price: 1499,
                        mrp: 1999,
                        stock: 20,
                    },
                ],
            },
            {
                name: "Floral Top",
                description: "Beautiful floral print top for a fresh summer look.",
                brand: "Only",
                images: [
                    "https://jiffy-products.s3.ap-south-1.amazonaws.com/Screenshot+2025-10-04+133125.png",
                ],
                tags: ["top", "women", "floral", "summer"],
                sellerId: sellers[0].id, // ⭐ Second seller
                categories: [womenClothing.id],
                variants: [
                    {
                        sku: "TOP-FLORAL-S",
                        size: "S",
                        color: "Multi",
                        price: 599,
                        mrp: 799,
                        stock: 15,
                    },
                    {
                        sku: "TOP-FLORAL-M",
                        size: "M",
                        color: "Multi",
                        price: 599,
                        mrp: 799,
                        stock: 12,
                    },
                ],
            },
        ];
        // ------------------------------
        // 3. Insert Products
        // ------------------------------
        for (const productData of dummyProducts) {
            const { categories, variants, ...rest } = productData;
            const product = await Product.create({
                ...rest,
                slug: slugify(rest.name, { lower: true }),
            }, { transaction: t });
            // Attach categories
            await product.addCategories(categories, { transaction: t });
            // Insert variants
            for (const variant of variants) {
                await ProductVariant.create({ ...variant, productId: product.id }, { transaction: t });
            }
        }
        await t.commit();
        console.log(`✅ Successfully seeded ${dummyProducts.length} products with variants.`);
    }
    catch (error) {
        await t.rollback();
        console.error("❌ Error seeding products:", error);
        throw error;
    }
}
// Only run if this file is executed directly (not imported)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    seedProducts()
        .then(() => {
        console.log("✅ Seed products completed.");
        process.exit(0);
    })
        .catch((error) => {
        console.error("❌ Seed products failed:", error);
        process.exit(1);
    });
}
export default seedProducts;
