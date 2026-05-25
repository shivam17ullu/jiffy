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
        type: DataTypes.BIGINT,
        allowNull: false,
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
    indexes: [
        {
            unique: true,
            fields: ["userId"],
        },
    ],
});
export default BuyerProfile;
