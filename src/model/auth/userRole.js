import { DataTypes } from "sequelize";
import { sequelize } from "../configs/sequelize.js";

const UserRole = sequelize.define("UserRole", {
  user_id: { type: DataTypes.BIGINT, primaryKey: true },
  role_id: { type: DataTypes.INTEGER, primaryKey: true },
}, {
  tableName: "user_roles",
  timestamps: false,
});

export default UserRole;
