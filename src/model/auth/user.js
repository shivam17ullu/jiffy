import { DataTypes } from "sequelize";
import { sequelize } from "../configs/sequelize.js";

const User = sequelize.define("User", {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  phone_number: { type: DataTypes.STRING(15), allowNull: false, unique: true },
  email: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: "users",
  timestamps: false,
});

export default User;
