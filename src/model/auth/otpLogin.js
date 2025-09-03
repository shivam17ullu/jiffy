// models/otpLogin.js
import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class OtpLogin extends Model {}

  OtpLogin.init({
    phone_number: { type: DataTypes.STRING(15), allowNull: false },
    otp: { type: DataTypes.STRING, allowNull: false },
    is_used: { type: DataTypes.BOOLEAN, defaultValue: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
  }, { sequelize, modelName: "OtpLogin", tableName: "otp_logins", timestamps: true, underscored: true });

  return OtpLogin;
};
