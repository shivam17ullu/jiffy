import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface ProductAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  details?: string;
  tags?: string[];
  isActive: boolean;
  isReturnable?: boolean;
  isExchangeable?: boolean;
  sellerId: number;          // ⭐ NEW
}

type ProductCreation = Optional<ProductAttributes, "id" | "description" | "brand" | "details" | "tags" | "isActive" | "isReturnable" | "isExchangeable">;

class Product extends Model<ProductAttributes, ProductCreation> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description?: string;
  public brand?: string;
  public details?: string;
  public tags?: string[];
  public isActive!: boolean;
  public isReturnable!: boolean;
  public isExchangeable!: boolean;
  public sellerId!: number;     // ⭐ NEW

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Sequelize mixins
  public addCategories!: (categoryIds: number[] | number, options?: any) => Promise<void>;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    brand: { type: DataTypes.STRING(120), allowNull: true },
    details: { type: DataTypes.TEXT, allowNull: true },
    tags: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isReturnable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isExchangeable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    // ⭐ NEW seller field
    sellerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "products",
    sequelize: jiffy,
    indexes: [
      {
        unique: true,
        fields: ["slug"],
      },
    ],
  }
);

// join table for categories
export const ProductCategory = jiffy.define(
  "product_categories",
  {
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  { timestamps: false }
);

export default Product;
