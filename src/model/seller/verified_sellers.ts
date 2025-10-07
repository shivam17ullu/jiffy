import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface VerifiedSellersAttribute {
  id: number;
  sellerId: number;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type SellerCreationAttributes = Optional<VerifiedSellersAttribute, "id" | "createdAt" | "updatedAt">;

class VerifiedSellers extends Model<VerifiedSellersAttribute, SellerCreationAttributes> implements VerifiedSellersAttribute {
  public id!: number;
  public sellerId!: number;
  public is_active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

VerifiedSellers.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    is_active: {type: DataTypes.BOOLEAN, defaultValue: true}
  },
  {
    sequelize: jiffy,
    tableName: "verified_sellers",
    timestamps: true,
  }
);

export default VerifiedSellers;
