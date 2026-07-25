import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface UserDeviceAttributes {
  id: number;
  userId: number;
  deviceId: string;
  platform: string;
  fcmToken: string;
  appVersion?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDeviceCreationAttributes = Optional<
  UserDeviceAttributes,
  "id" | "appVersion" | "createdAt" | "updatedAt"
>;

class UserDevice
  extends Model<UserDeviceAttributes, UserDeviceCreationAttributes>
  implements UserDeviceAttributes
{
  public id!: number;
  public userId!: number;
  public deviceId!: string;
  public platform!: string;
  public fcmToken!: string;
  public appVersion?: string;
  public role!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserDevice.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    deviceId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "device_id",
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    fcmToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "fcm_token",
    },
    appVersion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "app_version",
    },
    role: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize: jiffy,
    tableName: "user_devices",
    modelName: "UserDevice",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "device_id", "role"],
      },
      {
        fields: ["device_id"],
      },
    ],
  }
);

export default UserDevice;
