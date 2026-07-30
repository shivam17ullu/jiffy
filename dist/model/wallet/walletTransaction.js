import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class WalletTransaction extends Model {
}
WalletTransaction.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    walletId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM("CREDIT", "DEBIT"),
        allowNull: false,
    },
    category: {
        type: DataTypes.ENUM("REFUND", "ORDER_PAYMENT", "ADMIN_ADJUSTMENT"),
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM("SUCCESS", "FAILED"),
        allowNull: false,
        defaultValue: "SUCCESS",
    },
    referenceId: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    referenceType: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: "wallet_transactions",
    sequelize: jiffy,
    timestamps: true,
});
export default WalletTransaction;
