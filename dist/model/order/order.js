// src/model/order/order.ts
import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Order extends Model {
}
Order.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    sellerId: { type: DataTypes.BIGINT, allowNull: false }, // <-- MATCH USERS.id
    total: { type: DataTypes.FLOAT, allowNull: false },
    status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: "pending",
    },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    paymentInfo: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: "orders",
    sequelize: jiffy,
});
export default Order;
