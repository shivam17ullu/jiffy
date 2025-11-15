import { Model, DataTypes } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";
class CartItem extends Model {
}
CartItem.init({
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    price: { type: DataTypes.FLOAT, allowNull: false }
}, { tableName: 'cart_items', sequelize: jiffy });
export default CartItem;
