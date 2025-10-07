import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Document extends Model {
}
Document.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    aadhaarUrl: { type: DataTypes.STRING(255) },
    panUrl: { type: DataTypes.STRING(255) },
    gstUrl: { type: DataTypes.STRING(255) },
}, {
    sequelize: jiffy,
    tableName: "documents",
    timestamps: true,
});
export default Document;
