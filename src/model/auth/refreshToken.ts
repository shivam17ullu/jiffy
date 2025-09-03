import { DataTypes } from "sequelize";
import { sequelize } from "../configs/sequelize.js";

const RefreshToken = sequelize.define("RefreshToken", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false },
  device_info: { type: DataTypes.STRING },
  ip_address: { type: DataTypes.STRING },
  is_revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "refresh_tokens",
  timestamps: false,
});

export default RefreshToken;
