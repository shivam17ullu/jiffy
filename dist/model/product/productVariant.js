import { Model, DataTypes } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";
class ProductVariant extends Model {
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
