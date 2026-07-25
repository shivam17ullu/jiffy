// src/model/notification/notification.ts
import { Model, DataTypes } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Notification extends Model {
}
Notification.init({
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
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    relatedId: {
        type: DataTypes.BIGINT,
        allowNull: true,
        field: "related_id",
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_read",
    },
}, {
    tableName: "notifications",
    sequelize: jiffy,
    timestamps: true,
    underscored: true,
});
export default Notification;
