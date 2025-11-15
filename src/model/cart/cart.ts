import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface CartAttributes {
  id: number;
  userId: number;
}
type CartCreation = Optional<CartAttributes, "id">;

class Cart
  extends Model<CartAttributes, CartCreation>
  implements CartAttributes
{
  public id!: number;
  public userId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Cart.init(
  {
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
  },
  { tableName: "carts", sequelize: jiffy }
);

export default Cart;
