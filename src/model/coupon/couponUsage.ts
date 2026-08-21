import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
import Coupon from "./coupon.js";
import User from "../auth/user.js";
import Order from "../order/order.js";

export interface CouponUsageAttributes {
  id: number;
  coupon_id: number;
  user_id: number;
  order_id?: number;
  discount_applied: number;
  created_at?: Date;
  updated_at?: Date;
}

export type CouponUsageCreationAttributes = Optional<
  CouponUsageAttributes,
  "id" | "order_id" | "created_at" | "updated_at"
>;

class CouponUsage
  extends Model<CouponUsageAttributes, CouponUsageCreationAttributes>
  implements CouponUsageAttributes
{
  public id!: number;
  public coupon_id!: number;
  public user_id!: number;
  public order_id?: number;
  public discount_applied!: number;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

CouponUsage.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    coupon_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: Coupon,
        key: 'id',
      },
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    order_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: Order,
        key: 'id',
      },
    },
    discount_applied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize: jiffy,
    tableName: "coupon_usages",
    modelName: "CouponUsage",
    timestamps: true,
    underscored: true,
  }
);

export default CouponUsage;
