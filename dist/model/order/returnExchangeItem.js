import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class ReturnExchangeItem extends Model {
}
ReturnExchangeItem.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    requestId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    orderItemId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    variantId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    qty: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    exchangeVariantId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
    },
}, {
    tableName: "return_exchange_items",
    sequelize: jiffy,
});
export default ReturnExchangeItem;
