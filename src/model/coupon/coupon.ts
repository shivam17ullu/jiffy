import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export enum DiscountType {
  PERCENTAGE = "PERCENTAGE",
  FIXED = "FIXED",
}

export interface CouponAttributes {
  id: number;
  code: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_amount?: number;
  min_order_amount?: number;
  start_date?: Date;
  end_date?: Date;
  max_uses?: number;
  max_uses_per_user?: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type CouponCreationAttributes = Optional<
  CouponAttributes,
  "id" | "description" | "max_discount_amount" | "min_order_amount" | "start_date" | "end_date" | "max_uses" | "max_uses_per_user" | "is_active" | "created_at" | "updated_at"
>;

class Coupon
  extends Model<CouponAttributes, CouponCreationAttributes>
  implements CouponAttributes
{
  public id!: number;
  public code!: string;
  public description?: string;
  public discount_type!: DiscountType;
  public discount_value!: number;
  public max_discount_amount?: number;
  public min_order_amount?: number;
  public start_date?: Date;
  public end_date?: Date;
  public max_uses?: number;
  public max_uses_per_user?: number;
  public is_active!: boolean;
  
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Coupon.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    discount_type: {
      type: DataTypes.ENUM(...Object.values(DiscountType)),
      allowNull: false,
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    max_discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    min_order_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_uses_per_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize: jiffy,
    tableName: "coupons",
    modelName: "Coupon",
    timestamps: true,
    underscored: true,
  }
);

export default Coupon;
