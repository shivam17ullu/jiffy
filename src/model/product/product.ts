import { Model, DataTypes, Optional } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";

interface ProductAttributes {
  id: number;
  name: string;
  slug: string;
  description?: string;
  brand?: string;
  images?: string[]; // stored as JSON
  tags?: string[]; // stored as JSON
  isActive: boolean;
}
type ProductCreation = Optional<ProductAttributes, 'id' | 'description' | 'brand' | 'images' | 'tags' | 'isActive'>;

class Product extends Model<ProductAttributes, ProductCreation> implements ProductAttributes {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description?: string;
  public brand?: string;
  public images?: string[];
  public tags?: string[];
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public addCategories!: (categoryIds: number[] | number, options?: any) => Promise<void>;
}

Product.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(300), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  brand: { type: DataTypes.STRING(120), allowNull: true },
  images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  tags: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'products', sequelize: jiffy });

// product to categories: many-to-many
export const ProductCategory = jiffy.define('product_categories', {
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false }
}, { timestamps: false });


export default Product;
