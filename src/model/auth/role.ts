import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize";

interface RoleAttributes {
  id: number;
  name: string;
}

type RoleCreationAttributes = Optional<RoleAttributes, "id">;

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize: jiffy,
    tableName: "roles",
    modelName: "Role",
    timestamps: false,
  }
);

export default Role;
