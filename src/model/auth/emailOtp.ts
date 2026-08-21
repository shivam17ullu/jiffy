import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface EmailOtpAttributes {
  id: number;
  email: string;
  otp: string;
  is_used: boolean;
  expires_at: Date;
  created_at?: Date;
}

type EmailOtpCreationAttributes = Optional<EmailOtpAttributes, "id" | "is_used" | "created_at">;

class EmailOtp extends Model<EmailOtpAttributes, EmailOtpCreationAttributes> implements EmailOtpAttributes {
  public id!: number;
  public email!: string;
  public otp!: string;
  public is_used!: boolean;
  public expires_at!: Date;
  public readonly created_at!: Date;
}

EmailOtp.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(50),
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
    tableName: "email_otps",
    modelName: "EmailOtp",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

export default EmailOtp;
