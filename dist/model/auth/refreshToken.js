import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize";
export class RefreshToken extends Model {
}
RefreshToken.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },
    token: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    device_info: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
    },
    is_revoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: jiffy,
    tableName: "refresh_tokens",
    modelName: "RefreshToken",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
});
