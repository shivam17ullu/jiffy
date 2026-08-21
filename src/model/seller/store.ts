import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
import { StoreAttributes } from "../../types/auth.js";



type StoreCreationAttributes = Optional<StoreAttributes, "id" | "createdAt" | "updatedAt">;

class Store extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
  public id!: number;
  public sellerId!: number;
  public storeName!: string;
  public storeAddress!: string;
  public pincode!: string;
  public storeCategory?: string;
  public is_active!: boolean;
  public isSellerOpen!: boolean;
  public latitude?: number;
  public longitude?: number;
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
    storeCategory: { 
      type: DataTypes.ENUM("Men", "Women", "Kids", "All"), 
      allowNull: true 
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    isSellerOpen: { type: DataTypes.BOOLEAN, defaultValue: true },
    latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  },
  {
    sequelize: jiffy,
    tableName: "stores",
    timestamps: true,
  }
);

export default Store;
