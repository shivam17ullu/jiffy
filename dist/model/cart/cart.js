import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Cart extends Model {
}
Cart.init({
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
}, { tableName: "carts", sequelize: jiffy });
export default Cart;
