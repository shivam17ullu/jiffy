import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Wallet extends Model {
}
Wallet.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: true,
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    currency: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: "INR",
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: "wallets",
    sequelize: jiffy,
    timestamps: true,
});
export default Wallet;
