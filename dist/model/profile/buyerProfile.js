import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
// Sequelize Model
class BuyerProfile extends Model {
}
BuyerProfile.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING,
    },
    address: {
        type: DataTypes.STRING,
    },
    city: {
        type: DataTypes.STRING,
    },
    state: {
        type: DataTypes.STRING,
    },
    zipCode: {
        type: DataTypes.STRING,
    },
}, {
    sequelize: jiffy,
    tableName: "buyer_profile",
    timestamps: true,
});
export default BuyerProfile;
