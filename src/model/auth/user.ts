import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize";

interface UserAttributes {
  id: number;
  phone_number: string;
  email?: string | null;
  name?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<UserAttributes, "id" | "is_active" | "created_at" | "updated_at">;

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public phone_number!: string;
  public email!: string | null;
  public name!: string | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    phone_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize: jiffy,
    tableName: "users",
    modelName: "User",
    timestamps: true,
    underscored: true,
  }
);

export default User;
