import { Model, DataTypes } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";
class Product extends Model {
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
