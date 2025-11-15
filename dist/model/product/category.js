import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Category extends Model {
}
Category.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: "categories", sequelize: jiffy, });
export default Category;
