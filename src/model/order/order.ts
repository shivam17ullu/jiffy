// Order.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { jiffy } from "../../config/sequelize.js";

interface OrderAttributes {
  id: number;
  userId: number;
  total: number;
  status: 'pending'|'paid'|'shipped'|'delivered'|'cancelled';
  shippingAddress: object;
  paymentInfo?: object;
}
type OrderCreation = Optional<OrderAttributes, 'id' | 'paymentInfo'>;

class Order extends Model<OrderAttributes, OrderCreation> implements OrderAttributes {
  public id!: number;
  public userId!: number;
  public total!: number;
  public status!: OrderAttributes['status'];
  public shippingAddress!: object;
  public paymentInfo?: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init({
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'pending' },
  shippingAddress: { type: DataTypes.JSON, allowNull: false },
  paymentInfo: { type: DataTypes.JSON, allowNull: true }
}, { tableName: 'orders', sequelize: jiffy });

export default Order;
