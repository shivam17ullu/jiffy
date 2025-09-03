import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize";

interface OtpLoginAttributes {
  id: number;
  phone_number: string;
  otp: string;
  is_used: boolean;
  expires_at: Date;
  created_at?: Date;
}

type OtpLoginCreationAttributes = Optional<OtpLoginAttributes, "id" | "is_used" | "created_at">;

class OtpLogin extends Model<OtpLoginAttributes, OtpLoginCreationAttributes> implements OtpLoginAttributes {
  public id!: number;
  public phone_number!: string;
  public otp!: string;
  public is_used!: boolean;
  public expires_at!: Date;
  public readonly created_at!: Date;
}

OtpLogin.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    phone_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: jiffy,
    tableName: "otp_logins",
    modelName: "OtpLogin",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

export default OtpLogin;
