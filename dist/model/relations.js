import User from "./auth/user.js";
import Role from "./auth/role.js";
import UserRole from "./auth/userRole.js";
import OtpLogin from "./auth/otpLogin.js";
import { RefreshToken } from "./auth/refreshToken.js";
// ---------------- Associations ----------------
// Many-to-Many (Users <-> Roles)
User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });
// User -> RefreshTokens (One-to-Many)
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });
// ---------------- Exports ----------------
export { User, Role, UserRole, OtpLogin, RefreshToken };
