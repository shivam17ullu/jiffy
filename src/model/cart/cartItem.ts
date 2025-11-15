// src/model/cart/cartItem.ts
import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface CartItemAttributes {
  id: number;
  cartId: number;
  productId: number;
  variantId: number;
  qty: number;
  price: number;
}

type CartItemCreation = Optional<CartItemAttributes, "id">;

class CartItem
  extends Model<CartItemAttributes, CartItemCreation>
  implements CartItemAttributes
{
  public id!: number;
  public cartId!: number;
  public productId!: number;
  public variantId!: number;
  public qty!: number;
  public price!: number;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // ⭐ Add these lines to satisfy TypeScript:
  public product?: any;  // populated via include: [{ as: "product" }]
  public variant?: any;  // populated via include: [{ as: "variant" }]
}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
  },
  { tableName: "cartItems", sequelize: jiffy }
);

export default CartItem;
