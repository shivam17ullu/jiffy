import User from "./auth/user";
import Role from "./auth/role";
import UserRole from "./auth/userRole";
import OtpLogin from "./auth/otpLogin";
import RefreshToken from "./auth/refreshToken";

// ---------------- Associations ----------------

// Many-to-Many (Users <-> Roles)
User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });

// User -> RefreshTokens (One-to-Many)
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// OtpLogin is independent, no relation needed

// ---------------- Exports ----------------
export { User, Role, UserRole, OtpLogin, RefreshToken };
