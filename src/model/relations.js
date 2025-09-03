import User from "./auth/user.js";
import Role from "./auth/role.js";
import UserRole from "./auth/userRole.js";
import OtpLogin from "./auth/otpLogin.js";
import RefreshToken from "./auth/refreshToken.js";

// Many-to-Many (Users <-> Roles)
User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });

// User -> RefreshTokens (One-to-Many)
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// OtpLogin is independent, no relation needed
export { User, Role, UserRole, OtpLogin, RefreshToken };
