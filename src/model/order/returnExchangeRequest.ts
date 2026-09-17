import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface ReturnExchangeAttributes {
  id: number;
  orderId: number;
  userId: number;
  sellerId: number;
  type: "RETURN" | "EXCHANGE";
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  reason: string;
  comments?: string;
  images?: any; // JSON array of image strings
  booking_order_id?: string | null;
  public_tracking_id?: string | null;
  delivery_status?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReturnExchangeCreation = Optional<
  ReturnExchangeAttributes,
  | "id"
  | "status"
  | "images"
  | "comments"
  | "booking_order_id"
  | "public_tracking_id"
  | "delivery_status"
>;

class ReturnExchangeRequest
  extends Model<ReturnExchangeAttributes, ReturnExchangeCreation>
  implements ReturnExchangeAttributes {
  public id!: number;
  public orderId!: number;
  public userId!: number;
  public sellerId!: number;
  public type!: "RETURN" | "EXCHANGE";
  public status!: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED";
  public reason!: string;
  public comments?: string;
  public images?: any;
  public booking_order_id?: string | null;
  public public_tracking_id?: string | null;
  public delivery_status?: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ReturnExchangeRequest.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sellerId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("RETURN", "EXCHANGE"),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "PENDING",
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
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
    delivery_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "return_exchange_requests",
    sequelize: jiffy,
  }
);

export default ReturnExchangeRequest;
