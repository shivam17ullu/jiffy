import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class Role extends Model {
}
Role.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    sequelize: jiffy,
    tableName: "roles",
    modelName: "Role",
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ["name"],
        },
    ],
});
export default Role;
