import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class ReturnExchangeRequest extends Model {
}
ReturnExchangeRequest.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    orderId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    sellerId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM("RETURN", "EXCHANGE"),
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "PENDING",
    },
    reason: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    images: {
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    tableName: "return_exchange_requests",
    sequelize: jiffy,
});
export default ReturnExchangeRequest;
