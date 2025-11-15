import User from "./auth/user.js";
import Role from "./auth/role.js";
import UserRole from "./auth/userRole.js";
import OtpLogin from "./auth/otpLogin.js";
import { RefreshToken } from "./auth/refreshToken.js";
import BuyerProfile from "./profile/buyerProfile.js";
import SellerProfile from "./profile/sellerProfile.js";
import Store from "./seller/store.js";
import Document from "./seller/document.js";
import BankDetail from "./seller/bankDetail.js";
import VerifiedSellers from "./seller/verified_sellers.js";

// ---------------- Associations ----------------

// Many-to-Many (Users <-> Roles)
User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });

// User -> RefreshTokens (One-to-Many)
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// User -> SellerProfile (1:1)
User.hasOne(SellerProfile, { foreignKey: "userId" });
SellerProfile.belongsTo(User, { foreignKey: "userId" });

// SellerProfile -> Store (1:M)
SellerProfile.hasMany(Store, { foreignKey: "sellerId" });
Store.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// SellerProfile -> Document (1:1)
SellerProfile.hasOne(Document, { foreignKey: "sellerId" });
Document.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// SellerProfile -> BankDetail (1:1)
SellerProfile.hasOne(BankDetail, { foreignKey: "sellerId" });
BankDetail.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// User -> SellerProfile (1:1)
VerifiedSellers.hasOne(SellerProfile, { foreignKey: "id" });
SellerProfile.belongsTo(VerifiedSellers, { foreignKey: "id" });

// ---------------- Exports ----------------
export {
  User,
  Role,
  UserRole,
  OtpLogin,
  RefreshToken,
  BuyerProfile,
  SellerProfile,
  Store,
  Document,
  BankDetail,
};
