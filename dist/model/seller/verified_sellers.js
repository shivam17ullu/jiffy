import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class VerifiedSellers extends Model {
}
VerifiedSellers.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    sequelize: jiffy,
    tableName: "verified_sellers",
    timestamps: true,
});
export default VerifiedSellers;
