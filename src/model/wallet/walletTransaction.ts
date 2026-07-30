import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface WalletTransactionAttributes {
  id: number;
  walletId: number;
  userId: number;
  amount: number;
  type: "CREDIT" | "DEBIT";
  category: "REFUND" | "ORDER_PAYMENT" | "ADMIN_ADJUSTMENT";
  status: "SUCCESS" | "FAILED";
  referenceId: string;
  referenceType: "ORDER" | "ADMIN";
  description: string;
}

export type WalletTransactionCreationAttributes = Optional<WalletTransactionAttributes, "id" | "status" | "description">;

class WalletTransaction
  extends Model<WalletTransactionAttributes, WalletTransactionCreationAttributes>
  implements WalletTransactionAttributes
{
  public id!: number;
  public walletId!: number;
  public userId!: number;
  public amount!: number;
  public type!: "CREDIT" | "DEBIT";
  public category!: "REFUND" | "ORDER_PAYMENT" | "ADMIN_ADJUSTMENT";
  public status!: "SUCCESS" | "FAILED";
  public referenceId!: string;
  public referenceType!: "ORDER" | "ADMIN";
  public description!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WalletTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("CREDIT", "DEBIT"),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM("REFUND", "ORDER_PAYMENT", "ADMIN_ADJUSTMENT"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("SUCCESS", "FAILED"),
      allowNull: false,
      defaultValue: "SUCCESS",
    },
    referenceId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "wallet_transactions",
    sequelize: jiffy,
    timestamps: true,
  }
);

export default WalletTransaction;
