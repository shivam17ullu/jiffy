import { Model, DataTypes, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface CategoryAttributes {
  id: number;
  name: string;
  slug: string;
  parentId?: number | null;
  level: 0 | 1 | 2;
  isActive: boolean;
}
type CategoryCreation = Optional<
  CategoryAttributes,
  "id" | "parentId" | "isActive"
>;

class Category
  extends Model<CategoryAttributes, CategoryCreation>
  implements CategoryAttributes
{
  public id!: number;
  public name!: string;
  public slug!: string;
  public parentId!: number | null;
  public level!: 0 | 1 | 2;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    parentId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    level: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "categories", sequelize: jiffy, }
);


export default Category;
