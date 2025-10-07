import { DataTypes, Model } from "sequelize";
import { jiffy } from "../../config/sequelize.js";
class User extends Model {
}
User.init({
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
    },
    phone_number: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING(50),
    },
    password: {
        type: DataTypes.STRING(100),
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    sequelize: jiffy,
    tableName: "users",
    modelName: "User",
    timestamps: true,
    underscored: true,
});
export default User;
