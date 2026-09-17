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
  verificationImages?: string[] | null;
  booking_order_id?: string | null;
  public_tracking_id?: string | null;
  buyerPickupAddressId?: number | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrderCreation = Optional<
  OrderAttributes,
  "id" | "status" | "paymentInfo" | "verificationImages" | "booking_order_id" | "public_tracking_id" | "buyerPickupAddressId"
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
  public verificationImages?: string[] | null;
  public booking_order_id?: string | null;
  public public_tracking_id?: string | null;
  public buyerPickupAddressId?: number | string | null;

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
      defaultValue: "Created",
    },
    shippingAddress: { type: DataTypes.JSON, allowNull: false },
    paymentInfo: { type: DataTypes.JSON, allowNull: true },
    verificationImages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    booking_order_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: null,
    },
    public_tracking_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
      defaultValue: null,
    },
    buyerPickupAddressId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      field: "buyer_pickup_address_id",
    },
  },
  {
    tableName: "orders",
    sequelize: jiffy,
  }
);

export default Order;

