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
// User -> BuyerProfile (1:1)
User.hasOne(BuyerProfile, { foreignKey: "userId" });
BuyerProfile.belongsTo(User, { foreignKey: "userId" });
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
CartItem.belongsTo(Cart, { as: "cart", foreignKey: "cartId" });
Cart.hasMany(CartItem, { as: "items", foreignKey: "cartId" });
CartItem.belongsTo(Product, { as: "product", foreignKey: "productId" });
Product.hasMany(CartItem, { as: "cartItems", foreignKey: "productId" });
OrderItem.belongsTo(Order, { as: "order", foreignKey: "orderId" });
Order.hasMany(OrderItem, { as: "items", foreignKey: "orderId" });
OrderItem.belongsTo(Product, { as: "product", foreignKey: "productId" });
// Order associations
Order.belongsTo(User, { as: "buyer", foreignKey: "userId" });
Order.belongsTo(User, { as: "seller", foreignKey: "sellerId" });
User.hasMany(Order, { as: "orders", foreignKey: "userId" });
User.hasMany(Order, { as: "sellerOrders", foreignKey: "sellerId" });
Product.hasMany(ProductVariant, { as: "variants", foreignKey: "productId" });
ProductVariant.belongsTo(Product, { as: "product", foreignKey: "productId" });
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
Product.belongsTo(User, { as: "seller", foreignKey: "sellerId" });
User.hasMany(Product, { as: "products", foreignKey: "sellerId" });
// CATEGORY TREE
Category.belongsTo(Category, { as: "parent", foreignKey: "parentId" });
Category.hasMany(Category, { as: "children", foreignKey: "parentId" });
// ---------------- Exports ----------------
export { User, Role, UserRole, OtpLogin, RefreshToken, BuyerProfile, SellerProfile, Store, Document, BankDetail, VerifiedSellers, Product, Cart, CartItem, Category, Order, OrderItem, ProductVariant, ProductCategory, };
