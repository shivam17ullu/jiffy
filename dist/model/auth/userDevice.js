import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class UserDevice extends Model {
}
UserDevice.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "user_id",
        references: {
            model: "users",
            key: "id",
        },
        onDelete: "CASCADE",
    },
    deviceId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "device_id",
    },
    platform: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    fcmToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "fcm_token",
    },
    appVersion: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "app_version",
    },
    role: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    sequelize: jiffy,
    tableName: "user_devices",
    modelName: "UserDevice",
    timestamps: true,
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ["user_id", "device_id", "role"],
        },
        {
            fields: ["device_id"],
        },
    ],
});
export default UserDevice;
