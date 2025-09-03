import { DataTypes } from "sequelize";
import { sequelize } from "../configs/sequelize.js";

const OtpLogin = sequelize.define("OtpLogin", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  phone_number: { type: DataTypes.STRING(15), allowNull: false },
  otp: { type: DataTypes.STRING, allowNull: false },
  is_used: { type: DataTypes.BOOLEAN, defaultValue: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "otp_logins",
  timestamps: false,
});

export default OtpLogin;
