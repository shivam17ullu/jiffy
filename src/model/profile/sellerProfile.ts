import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface SellerProfileAttributes {
  id: number;
  userId: number;
  businessName: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type SellerProfileCreationAttributes = Optional<SellerProfileAttributes, "id" | "gstNumber" | "address" | "city" | "state" | "zipCode" | "phone" | "createdAt" | "updatedAt">;

class SellerProfile extends Model<SellerProfileAttributes, SellerProfileCreationAttributes>
  implements SellerProfileAttributes {
  public id!: number;
  public userId!: number;
  public businessName!: string;
  public gstNumber?: string;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public phone?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SellerProfile.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: false },
    businessName: { type: DataTypes.STRING(150), allowNull: false },
    gstNumber: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    state: { type: DataTypes.STRING(100) },
    zipCode: { type: DataTypes.STRING(10) },
    phone: { type: DataTypes.STRING(15) },
  },
  {
    sequelize: jiffy,
    tableName: "seller_profile",
    timestamps: true,
  }
);

export default SellerProfile;
