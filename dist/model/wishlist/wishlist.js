import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Wishlist extends Model {
}
Wishlist.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
    },
}, {
    tableName: "wishlists",
    sequelize: jiffy,
    indexes: [
        {
            unique: true,
            fields: ["userId", "productId"], // Prevent duplicate wishlist items
        },
    ],
});
export default Wishlist;
