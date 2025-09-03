// models/user.js
import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsToMany(models.Role, { through: models.UserRole, foreignKey: "user_id" });
      User.hasMany(models.RefreshToken, { foreignKey: "user_id" });
    }
  }

  User.init({
    phone_number: { type: DataTypes.STRING(15), allowNull: false, unique: true },
    email: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: "User", tableName: "users", timestamps: true, underscored: true });

  return User;
};
