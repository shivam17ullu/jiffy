import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class OtpLogin extends Model {
}
OtpLogin.init({
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
}, {
    sequelize: jiffy,
    tableName: "otp_logins",
    modelName: "OtpLogin",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
});
export default OtpLogin;
