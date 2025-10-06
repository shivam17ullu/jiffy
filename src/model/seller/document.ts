import { DataTypes, Model, Optional } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

interface DocumentAttributes {
  id: number;
  sellerId: number;
  aadhaarUrl?: string;
  panUrl?: string;
  gstUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type DocumentCreationAttributes = Optional<DocumentAttributes, "id" | "aadhaarUrl" | "panUrl" | "gstUrl" | "createdAt" | "updatedAt">;

class Document extends Model<DocumentAttributes, DocumentCreationAttributes> implements DocumentAttributes {
  public id!: number;
  public sellerId!: number;
  public aadhaarUrl?: string;
  public panUrl?: string;
  public gstUrl?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Document.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    aadhaarUrl: { type: DataTypes.STRING(255) },
    panUrl: { type: DataTypes.STRING(255) },
    gstUrl: { type: DataTypes.STRING(255) },
  },
  {
    sequelize: jiffy,
    tableName: "documents",
    timestamps: true,
  }
);

export default Document;
