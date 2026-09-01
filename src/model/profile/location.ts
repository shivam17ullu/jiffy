import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface LocationAttributes {
  id: number;
  userId: number;
  sellerId?: number | null;
  buyerId?: number | null;
  type: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  phone_number?: string;
  name?: string;
  alternate_number?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type LocationCreationAttributes = Optional<
  LocationAttributes,
  "id" | "sellerId" | "buyerId" | "latitude" | "longitude" | "createdAt" | "updatedAt"
>;

class Location extends Model<LocationAttributes, LocationCreationAttributes> implements LocationAttributes {
  public id!: number;
  public userId!: number;
  public sellerId?: number | null;
  public buyerId?: number | null;
  public type!: string;
  public addressLine1!: string;
  public addressLine2?: string;
  public city!: string;
  public state!: string;
  public country!: string;
  public pincode!: string;
  public latitude?: number | null;
  public longitude?: number | null;
  public isDefault!: boolean;
  public phone_number?: string;
  public name?: string;
  public alternate_number?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Location.init(
  {
    id: {
      type: DataTypes.BIGINT,   // MUST MATCH users.id
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.BIGINT,   // FIXED
      allowNull: false,
    },

    sellerId: {
      type: DataTypes.INTEGER,   // FIXED
      allowNull: true,
    },

    buyerId: {
      type: DataTypes.INTEGER,   // FIXED
      allowNull: true,
    },

    type: {
      type: DataTypes.ENUM("home", "office", "store", "shipping", "billing"),
      allowNull: false,
    },

    addressLine1: { type: DataTypes.STRING, allowNull: false },
    addressLine2: { type: DataTypes.STRING },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: "India" },
    pincode: { type: DataTypes.STRING, allowNull: false },

    latitude: { type: DataTypes.FLOAT },
    longitude: { type: DataTypes.FLOAT },

    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false },

    phone_number: { type: DataTypes.STRING(15) },
    name: { type: DataTypes.STRING },
    alternate_number: { type: DataTypes.STRING(15) },
  },
  {
    sequelize: jiffy,
    tableName: "location",
    timestamps: true,
  }
);

export default Location;
