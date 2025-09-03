// models/refreshToken.js
import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class RefreshToken extends Model {}

  RefreshToken.init({
    token: { type: DataTypes.STRING, allowNull: false },
    device_info: { type: DataTypes.STRING },
    ip_address: { type: DataTypes.STRING },
    is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "RefreshToken", tableName: "refresh_tokens", timestamps: true, underscored: true });

  return RefreshToken;
};
