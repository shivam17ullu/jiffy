import { Model, DataTypes, Optional } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";

interface CartItemAttributes {
  id: number;
  cartId: number;
  productId: number;
  variantId?: number | null;
  qty: number;
  price: number; // snapshot
}
type CartItemCreation = Optional<CartItemAttributes, 'id' | 'variantId'>;

class CartItem extends Model<CartItemAttributes, CartItemCreation> implements CartItemAttributes {
  public id!: number;
  public cartId!: number;
  public productId!: number;
  public variantId?: number | null;
  public qty!: number;
  public price!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
