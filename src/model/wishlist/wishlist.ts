import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface WishlistAttributes {
  id: number;
  userId: number;
  productId: number;
}

type WishlistCreation = Optional<WishlistAttributes, "id">;

class Wishlist
  extends Model<WishlistAttributes, WishlistCreation>
  implements WishlistAttributes
{
  public id!: number;
  public userId!: number;
  public productId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // For populated relations
  public product?: any;
}

Wishlist.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: "wishlists",
    sequelize: jiffy,
    indexes: [
      {
        unique: true,
        fields: ["userId", "productId"], // Prevent duplicate wishlist items
      },
    ],
  }
);

export default Wishlist;

