import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize";
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
        unique: true,
    },
}, {
    sequelize: jiffy,
    tableName: "roles",
    modelName: "Role",
    timestamps: false,
});
export default Role;
