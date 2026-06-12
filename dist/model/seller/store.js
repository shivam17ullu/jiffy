import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Store extends Model {
}
Store.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    storeName: { type: DataTypes.STRING(150), allowNull: false },
    storeAddress: { type: DataTypes.TEXT, allowNull: false },
    pincode: { type: DataTypes.STRING(10), allowNull: false },
    storeCategory: {
        type: DataTypes.ENUM("Men", "Women", "Kids", "All"),
        allowNull: true
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    isSellerOpen: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
    sequelize: jiffy,
    tableName: "stores",
    timestamps: true,
});
export default Store;
