import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

class UserRole extends Model {
  public user_id!: number;
  public role_id!: number;
}

UserRole.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    sequelize: jiffy,
    tableName: "user_roles",
    modelName: "UserRole",
    timestamps: false,
  }
);

export default UserRole;
