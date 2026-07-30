import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

export interface ReturnExchangeItemAttributes {
  id: number;
  requestId: number;
  orderItemId: number;
  productId: number;
  variantId: number;
  qty: number;
  price: number;
  exchangeVariantId?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReturnExchangeItemCreation = Optional<
  ReturnExchangeItemAttributes,
  "id" | "exchangeVariantId"
>;

class ReturnExchangeItem
  extends Model<ReturnExchangeItemAttributes, ReturnExchangeItemCreation>
  implements ReturnExchangeItemAttributes
{
  public id!: number;
  public requestId!: number;
  public orderItemId!: number;
  public productId!: number;
  public variantId!: number;
  public qty!: number;
  public price!: number;
  public exchangeVariantId?: number | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ReturnExchangeItem.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    requestId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    orderItemId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    variantId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    qty: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    exchangeVariantId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: "return_exchange_items",
    sequelize: jiffy,
  }
);

export default ReturnExchangeItem;
