import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface StoreAttributes {
  id: number;
  sellerId: number;
  storeName: string;
  storeAddress: string;
  pincode: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type StoreCreationAttributes = Optional<StoreAttributes, "id" | "createdAt" | "updatedAt">;

class Store extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
  public id!: number;
  public sellerId!: number;
  public storeName!: string;
  public storeAddress!: string;
  public pincode!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Store.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    storeName: { type: DataTypes.STRING(150), allowNull: false },
    storeAddress: { type: DataTypes.TEXT, allowNull: false },
    pincode: { type: DataTypes.STRING(10), allowNull: false },
  },
  {
    sequelize: jiffy,
    tableName: "stores",
    timestamps: true,
  }
);

export default Store;
