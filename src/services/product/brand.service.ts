import { Op, Sequelize } from "sequelize";
import Product from "../../model/product/product.js";

/**
 * Optimized query to get all unique brand names without duplicates.
 * Uses database-level DISTINCT + TRIM with raw query execution,
 * and secondary case-insensitive deduplication to ensure nothing is repeated twice.
 */
export const getAllBrands = async (): Promise<string[]> => {
  const rows = (await Product.findAll({
    attributes: [
      [
        Sequelize.fn(
          "DISTINCT",
          Sequelize.fn("TRIM", Sequelize.col("brand"))
        ),
        "brand",
      ],
    ],
    where: {
      isActive: true,
      brand: { [Op.not]: null },
      [Op.and]: [
        Sequelize.where(Sequelize.fn("TRIM", Sequelize.col("brand")), {
          [Op.ne]: "",
        }),
      ],
    } as any,
    order: [[Sequelize.fn("TRIM", Sequelize.col("brand")), "ASC"]],
    raw: true,
  })) as unknown as Array<{ brand: string }>;

  const seen = new Set<string>();
  const brands: string[] = [];

  for (const row of rows) {
    const brandName = row.brand?.trim();
    if (brandName) {
      const lower = brandName.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        brands.push(brandName);
      }
    }
  }

  return brands;
};
