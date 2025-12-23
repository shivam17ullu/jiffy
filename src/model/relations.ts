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
import Product from "./product/product.js";
import Cart from "./cart/cart.js";
import CartItem from "./cart/cartItem.js";
import Category from "./product/category.js";
import Order from "./order/order.js";
import OrderItem from "./order/orderItem.js";
import ProductVariant from "./product/productVariant.js";
import { ProductCategory } from "./product/product.js";
import Location from "./profile/location.js";

// ---------------- Associations ----------------

// Users ↔ Roles (Many-to-Many)
User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id" });
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id" });

// User ↔ RefreshToken (1:M)
User.hasMany(RefreshToken, { foreignKey: "user_id" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// User ↔ SellerProfile (1:1)
User.hasOne(SellerProfile, { foreignKey: "userId" });
SellerProfile.belongsTo(User, { foreignKey: "userId" });

// User ↔ BuyerProfile (1:1)
User.hasOne(BuyerProfile, { foreignKey: "userId" });
BuyerProfile.belongsTo(User, { foreignKey: "userId" });

// SellerProfile ↔ Store (1:M)
SellerProfile.hasMany(Store, { foreignKey: "sellerId" });
Store.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// SellerProfile ↔ Document (1:1)
SellerProfile.hasOne(Document, { foreignKey: "sellerId" });
Document.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// SellerProfile ↔ BankDetail (1:1)
SellerProfile.hasOne(BankDetail, { foreignKey: "sellerId" });
BankDetail.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// SellerProfile ↔ VerifiedSellers (1:1)
SellerProfile.hasOne(VerifiedSellers, { foreignKey: "sellerId" });
VerifiedSellers.belongsTo(SellerProfile, { foreignKey: "sellerId" });

// Cart relations
CartItem.belongsTo(Cart, { as: "cart", foreignKey: "cartId" });
Cart.hasMany(CartItem, { as: "items", foreignKey: "cartId" });

CartItem.belongsTo(Product, { as: "product", foreignKey: "productId" });
Product.hasMany(CartItem, { as: "cartItems", foreignKey: "productId" });

// Order relations
OrderItem.belongsTo(Order, { as: "order", foreignKey: "orderId" });
Order.hasMany(OrderItem, { as: "items", foreignKey: "orderId" });

OrderItem.belongsTo(Product, { as: "product", foreignKey: "productId" });

Order.belongsTo(User, { as: "buyer", foreignKey: "userId" });
Order.belongsTo(User, { as: "seller", foreignKey: "sellerId" });
User.hasMany(Order, { as: "orders", foreignKey: "userId" });
User.hasMany(Order, { as: "sellerOrders", foreignKey: "sellerId" });

// Product + Variant
Product.hasMany(ProductVariant, { as: "variants", foreignKey: "productId" });
ProductVariant.belongsTo(Product, { as: "product", foreignKey: "productId" });

// Product ↔ Category (M:M)
Product.belongsToMany(Category, {
  through: ProductCategory,
  as: "categories",
  foreignKey: "productId",
});
Category.belongsToMany(Product, {
  through: ProductCategory,
  as: "products",
  foreignKey: "categoryId",
});

// Product ↔ Seller
Product.belongsTo(User, { as: "seller", foreignKey: "sellerId" });
User.hasMany(Product, { as: "products", foreignKey: "sellerId" });

// Category hierarchy
Category.belongsTo(Category, { as: "parent", foreignKey: "parentId" });
Category.hasMany(Category, { as: "children", foreignKey: "parentId" });

// User -> Locations (1:M)
User.hasMany(Location, { foreignKey: "userId", as: "locations" });
Location.belongsTo(User, { foreignKey: "userId", as: "user" });

// SellerProfile -> Locations (1:M)
SellerProfile.hasMany(Location, { foreignKey: "sellerId", as: "sellerLocations" });
Location.belongsTo(SellerProfile, { foreignKey: "sellerId", as: "seller" });

// BuyerProfile -> Locations (1:M)
BuyerProfile.hasMany(Location, { foreignKey: "buyerId", as: "buyerLocations" });
Location.belongsTo(BuyerProfile, { foreignKey: "buyerId", as: "buyer" });

// EXPORTS
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
  VerifiedSellers,
  Product,
  Cart,
  CartItem,
  Category,
  Order,
  OrderItem,
  ProductVariant,
  ProductCategory,
  Location
};
