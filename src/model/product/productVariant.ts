import { Model, DataTypes, Optional } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";
interface VariantAttributes {
  id: number;
  productId: number;
  sku?: string;
  size?: string;
  color?: string;
  price: number;
  mrp?: number;
  stock: number;
}
type VariantCreation = Optional<VariantAttributes, 'id' | 'sku' | 'size' | 'color' | 'mrp'>;

class ProductVariant extends Model<VariantAttributes, VariantCreation> implements VariantAttributes {
  public id!: number;
  public productId!: number;
  public sku?: string;
  public size?: string;
  public color?: string;
  public price!: number;
  public mrp?: number;
  public stock!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ProductVariant.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  sku: { type: DataTypes.STRING(120), allowNull: true },
  size: { type: DataTypes.STRING(50), allowNull: true },
  color: { type: DataTypes.STRING(80), allowNull: true },
  price: { type: DataTypes.FLOAT, allowNull: false },
  mrp: { type: DataTypes.FLOAT, allowNull: true },
  stock: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }
}, { tableName: 'product_variants', sequelize: jiffy });


export default ProductVariant;
