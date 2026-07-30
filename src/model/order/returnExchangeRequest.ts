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
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReturnExchangeCreation = Optional<
  ReturnExchangeAttributes,
  "id" | "status" | "images" | "comments"
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
  },
  {
    tableName: "return_exchange_requests",
    sequelize: jiffy,
  }
);

export default ReturnExchangeRequest;
