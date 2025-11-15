// OrderItem.ts
import { Model, DataTypes } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";
class OrderItem extends Model {
}
OrderItem.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false }
}, { tableName: 'order_items', sequelize: jiffy });
export default OrderItem;
