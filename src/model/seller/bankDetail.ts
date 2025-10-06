import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface BankDetailAttributes {
  id: number;
  sellerId: number;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  termsAccepted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type BankDetailCreationAttributes = Optional<BankDetailAttributes, "id" | "termsAccepted" | "createdAt" | "updatedAt">;

class BankDetail extends Model<BankDetailAttributes, BankDetailCreationAttributes> implements BankDetailAttributes {
  public id!: number;
  public sellerId!: number;
  public accountHolderName!: string;
  public accountNumber!: string;
  public ifscCode!: string;
  public termsAccepted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BankDetail.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    accountHolderName: { type: DataTypes.STRING(100), allowNull: false },
    accountNumber: { type: DataTypes.STRING(30), allowNull: false },
    ifscCode: { type: DataTypes.STRING(20), allowNull: false },
    termsAccepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize: jiffy,
    tableName: "bank_details",
    timestamps: true,
  }
);

export default BankDetail;
