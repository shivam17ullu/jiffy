import { jiffy } from "../config/sequelize.js";

import slugify from "slugify";
import { Category, Product, ProductVariant } from "../model/relations.js";

async function seedProducts() {
  const t = await jiffy.transaction();

  try {
    console.log("⏳ Seeding dummy products...");

    // ------------------------------
    // 1. Fetch some categories
    // ------------------------------
    const menClothing = await Category.findOne({ where: { name: "Clothing", level: 1 } });
    const womenClothing = await Category.findOne({ where: { name: "Clothing", level: 1 } });

    if (!menClothing || !womenClothing) {
      throw new Error("Required category structure missing. Run seedCategory.ts first.");
    }

    // ------------------------------
    // 2. Dummy Products Array
    // ------------------------------
    const dummyProducts = [
      {
        name: "Men's Casual Blue Shirt",
        description: "Comfortable regular fit cotton shirt.",
        brand: "Levis",
        images: ["https://picsum.photos/300?random=1"],
        tags: ["shirt", "cotton", "men"],
        categories: [menClothing.id],
        variants: [
          { sku: "SHIRT-BLUE-M", size: "M", color: "Blue", price: 799, mrp: 999, stock: 20 },
          { sku: "SHIRT-BLUE-L", size: "L", color: "Blue", price: 799, mrp: 999, stock: 15 }
        ]
      },
      {
        name: "Women's Stylish Red Dress",
        description: "A beautiful and elegant red dress for parties.",
        brand: "Only",
        images: ["https://picsum.photos/300?random=2"],
        tags: ["dress", "women", "stylish"],
        categories: [womenClothing.id],
        variants: [
          { sku: "DRESS-RED-S", size: "S", color: "Red", price: 1299, mrp: 1599, stock: 10 },
          { sku: "DRESS-RED-M", size: "M", color: "Red", price: 1299, mrp: 1599, stock: 12 }
        ]
      },
      {
        name: "Men's Running Shoes",
        description: "Breathable and durable running shoes.",
        brand: "Puma",
        images: ["https://picsum.photos/300?random=3"],
        tags: ["shoes", "running", "men"],
        categories: [menClothing.id],
        variants: [
          { sku: "SHOE-RUN-8", size: "8", color: "Black", price: 1999, mrp: 2499, stock: 30 },
          { sku: "SHOE-RUN-9", size: "9", color: "Black", price: 1999, mrp: 2499, stock: 25 }
        ]
      }
    ];

    // ------------------------------
    // 3. Insert Products
    // ------------------------------
    for (const productData of dummyProducts) {
      const { categories, variants, ...rest } = productData;

      const product = await Product.create(
        {
          ...rest,
          slug: slugify(rest.name, { lower: true })
        },
        { transaction: t }
      );

      // Attach categories
      await product.addCategories(categories, { transaction: t });

      // Insert variants
      for (const variant of variants) {
        await ProductVariant.create(
          { ...variant, productId: product.id },
          { transaction: t }
        );
      }
    }

    await t.commit();
    console.log("✅ Dummy products seeded successfully.");
  } catch (error) {
    await t.rollback();
    console.error("❌ Error seeding products:", error);
  } finally {
    process.exit();
  }
}

seedProducts();
