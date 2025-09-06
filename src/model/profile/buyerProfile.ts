import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

// Types for BuyerProfile attributes
interface BuyerProfileAttributes {
  id: number;
  userId: number;
  fullName: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Fields required for creation
type BuyerProfileCreationAttributes = Optional<BuyerProfileAttributes, "id" | "createdAt" | "updatedAt">;

// Sequelize Model
class BuyerProfile extends Model<BuyerProfileAttributes, BuyerProfileCreationAttributes>
  implements BuyerProfileAttributes {
  public id!: number;
  public userId!: number;
  public fullName!: string;
  public phone?: string;
  public address?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BuyerProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.STRING,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    zipCode: {
      type: DataTypes.STRING,
    },
  },
  {
    sequelize: jiffy,
    tableName: "buyer_profile",
    timestamps: true,
  }
);

export default BuyerProfile;
