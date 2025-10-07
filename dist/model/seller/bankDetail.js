import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class BankDetail extends Model {
}
BankDetail.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    accountHolderName: { type: DataTypes.STRING(100), allowNull: false },
    accountNumber: { type: DataTypes.STRING(30), allowNull: false },
    ifscCode: { type: DataTypes.STRING(20), allowNull: false },
    termsAccepted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    sequelize: jiffy,
    tableName: "bank_details",
    timestamps: true,
});
export default BankDetail;
