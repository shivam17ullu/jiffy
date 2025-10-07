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
}, {
    sequelize: jiffy,
    tableName: "stores",
    timestamps: true,
});
export default Store;
