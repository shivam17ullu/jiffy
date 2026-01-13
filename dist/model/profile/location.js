import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Location extends Model {
}
Location.init({
    id: {
        type: DataTypes.BIGINT, // MUST MATCH users.id
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT, // FIXED
        allowNull: false,
    },
    sellerId: {
        type: DataTypes.INTEGER, // FIXED
        allowNull: true,
    },
    buyerId: {
        type: DataTypes.INTEGER, // FIXED
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM("home", "office", "store", "shipping", "billing"),
        allowNull: false,
    },
    addressLine1: { type: DataTypes.STRING, allowNull: false },
    addressLine2: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: "India" },
    pincode: { type: DataTypes.STRING, allowNull: false },
    latitude: { type: DataTypes.FLOAT },
    longitude: { type: DataTypes.FLOAT },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    sequelize: jiffy,
    tableName: "location",
    timestamps: true,
});
export default Location;
