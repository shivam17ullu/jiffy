// OrderItem.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";

interface OrderItemAttributes {
  id: number;
  orderId: number;
  productId: number;
  variantId?: number | null;
  qty: number;
  price: number; // snapshot
}
type OrderItemCreation = Optional<OrderItemAttributes, 'id' | 'variantId'>;

class OrderItem extends Model<OrderItemAttributes, OrderItemCreation> implements OrderItemAttributes {
  public id!: number;
  public orderId!: number;
  public productId!: number;
  public variantId?: number | null;
  public qty!: number;
  public price!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
