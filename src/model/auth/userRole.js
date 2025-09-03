// models/userRole.js
import { Model } from "sequelize";

export default (sequelize) => {
  class UserRole extends Model {}
  UserRole.init({}, { sequelize, modelName: "UserRole", tableName: "user_roles", timestamps: false });
  return UserRole;
};
