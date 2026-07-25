// src/model/notification/notification.ts
import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface NotificationAttributes {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedId?: number;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationCreation = Optional<
  NotificationAttributes,
  "id" | "relatedId" | "isRead" | "createdAt" | "updatedAt"
>;

class Notification
  extends Model<NotificationAttributes, NotificationCreation>
  implements NotificationAttributes
{
  public id!: number;
  public userId!: number;
  public title!: string;
  public message!: string;
  public type!: string;
  public relatedId?: number;
  public isRead!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
  {
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
  },
  {
    tableName: "notifications",
    sequelize: jiffy,
    timestamps: true,
    underscored: true,
  }
);

export default Notification;
