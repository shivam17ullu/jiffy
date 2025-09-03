import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface RefreshTokenAttributes {
  id: number;
  user_id: number;
  token: string;
  device_info?: string | null;
  ip_address?: string | null;
  is_revoked: boolean;
  expires_at: Date;
  created_at?: Date;
}

export type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  "id" | "is_revoked" | "created_at"
>;

export class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  declare id: number;
  declare user_id: number;
  declare token: string;
  declare device_info: string | null;
  declare ip_address: string | null;
  declare is_revoked: boolean;
  declare expires_at: Date;
  declare readonly created_at: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    device_info: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: jiffy,
    tableName: "refresh_tokens",
    modelName: "RefreshToken",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);
