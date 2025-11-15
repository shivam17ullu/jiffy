// src/model/order/order.ts
import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface OrderAttributes {
  id: number;
  userId: number;
  sellerId: number;
  total: number;
  status: string;
  shippingAddress: any;
  paymentInfo?: any;
}

export type OrderCreation = Optional<
  OrderAttributes,
  "id" | "status" | "paymentInfo"
>;

class Order
  extends Model<OrderAttributes, OrderCreation>
  implements OrderAttributes
{
  public id!: number;
  public userId!: number;
  public sellerId!: number;   // <-- REQUIRED FIELD (missing earlier)
  public total!: number;
  public status!: string;
  public shippingAddress!: any;
  public paymentInfo?: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    sellerId: { type: DataTypes.BIGINT, allowNull: false }, // <-- MATCH USERS.id
    total: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "pending",
    },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    paymentInfo: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: "orders",
    sequelize: jiffy,
  }
);

export default Order;
