import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class SellerProfile extends Model {
}
SellerProfile.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    businessName: { type: DataTypes.STRING(150), allowNull: false },
    gstNumber: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    state: { type: DataTypes.STRING(100) },
    zipCode: { type: DataTypes.STRING(10) },
    phone: { type: DataTypes.STRING(15) },
}, {
    sequelize: jiffy,
    tableName: "seller_profile",
    timestamps: true,
});
export default SellerProfile;
