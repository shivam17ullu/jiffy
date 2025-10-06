import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface UserAttributes {
  id: number;
  phone_number: string;
  is_active: boolean;
  email?: string;
  password?: string;
  created_at?: Date;
  updated_at?: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  "id" | "is_active" | "created_at" | "updated_at"
>;

class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: number;
  public phone_number!: string;
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
      type: DataTypes.STRING(50),
    },
    password: {
      type: DataTypes.STRING(100),
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
