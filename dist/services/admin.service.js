import { SellerProfile, VerifiedSellers, User, Store, Document, BankDetail, Product, ProductVariant, ProductCategory, CartItem, Wishlist, Order, OrderItem, Location, RefreshToken, UserRole, BuyerProfile, OtpLogin, } from "../model/relations.js";
import { Op, Sequelize } from "sequelize";
import { jiffy } from "../config/sequelize.js";
import { sendSellerApprovalEmail, sendSellerRejectionEmail } from "../utils/mailer.js";
export default class AdminService {
    static async getSellers(status) {
        const whereCondition = {};
        if (status) {
            whereCondition.status = status;
        }
        return await SellerProfile.findAll({
            order: [["createdAt", "DESC"]],
            attributes: ["id", "userId", "businessName", "phone", "address", "city", "state", "zipCode", "gstNumber", "createdAt"],
            include: [
                {
                    model: VerifiedSellers,
                    where: whereCondition,
                    attributes: ["id", "is_active", "status", "createdAt"],
                },
                {
                    model: User,
                    attributes: ["email"],
                },
            ],
        });
    }
    static async getSellerDetails(sellerId) {
        return await SellerProfile.findByPk(sellerId, {
            include: [
                {
                    model: User,
                    attributes: { exclude: ["password"] },
                },
                { model: Store },
                { model: Document },
                { model: BankDetail },
                { model: VerifiedSellers },
            ],
        });
    }
    static async getProducts(sellerId, status) {
        const conditions = [];
        if (sellerId) {
            conditions.push({ sellerId });
        }
        if (status === "active") {
            conditions.push({
                isActive: true,
                id: {
                    [Op.and]: [
                        { [Op.notIn]: Sequelize.literal(`(SELECT productId FROM product_variants WHERE isActive = false)`) },
                        { [Op.notIn]: Sequelize.literal(`(SELECT productId FROM product_categories JOIN categories ON product_categories.categoryId = categories.id WHERE categories.isActive = false)`) }
                    ]
                }
            });
        }
        else if (status === "inactive") {
            conditions.push({
                [Op.or]: [
                    { isActive: false },
                    { id: { [Op.in]: Sequelize.literal(`(SELECT productId FROM product_variants WHERE isActive = false)`) } },
                    { id: { [Op.in]: Sequelize.literal(`(SELECT productId FROM product_categories JOIN categories ON product_categories.categoryId = categories.id WHERE categories.isActive = false)`) } }
                ]
            });
        }
        const whereCondition = conditions.length > 0 ? { [Op.and]: conditions } : {};
        return await Product.findAll({
            where: whereCondition,
            include: [
                { association: "variants" },
                { association: "categories" },
                {
                    association: "seller",
                    attributes: ["id", "phone_number", "email"],
                    include: [
                        {
                            model: SellerProfile,
                            attributes: ["businessName", "city", "state"],
                        },
                    ],
                },
            ],
        });
    }
    static async getSellerDocuments(sellerId) {
        return await Document.findOne({
            where: { sellerId },
        });
    }
    static async approveSeller(sellerId, status, reason) {
        const verifiedSeller = await VerifiedSellers.findOne({
            where: { sellerId },
            include: [{ model: SellerProfile }]
        });
        if (!verifiedSeller) {
            return null;
        }
        verifiedSeller.is_active = status === "approved";
        verifiedSeller.status = status;
        if (status === "rejected" && reason) {
            verifiedSeller.rejection_reason = reason;
        }
        else if (status === "approved") {
            verifiedSeller.rejection_reason = null;
        }
        await verifiedSeller.save();
        if (status === "approved" && verifiedSeller.SellerProfile?.userId) {
            const userId = verifiedSeller.SellerProfile.userId;
            await User.update({ is_active: true }, { where: { id: userId } });
            // Send welcome email to the approved seller asynchronously
            try {
                const user = await User.findByPk(Number(userId));
                const userEmail = user?.email || "";
                if (userEmail) {
                    const bankDetail = await BankDetail.findOne({ where: { sellerId } });
                    const sellerName = bankDetail?.accountHolderName || bankDetail?.account_holder_name || "Seller";
                    sendSellerApprovalEmail(userEmail, sellerName).catch(err => {
                        console.error("Seller approval email failed:", err);
                    });
                }
            }
            catch (err) {
                console.error("Error sending seller approval email:", err);
            }
        }
        else if (status === "rejected" && verifiedSeller.SellerProfile?.userId) {
            const userId = verifiedSeller.SellerProfile.userId;
            // Send rejection email to the seller asynchronously
            try {
                const user = await User.findByPk(Number(userId));
                const userEmail = user?.email || "";
                if (userEmail) {
                    const bankDetail = await BankDetail.findOne({ where: { sellerId } });
                    const sellerName = bankDetail?.accountHolderName || bankDetail?.account_holder_name || "Seller";
                    sendSellerRejectionEmail(userEmail, sellerName, reason || "No specific reason provided.").catch(err => {
                        console.error("Seller rejection email failed:", err);
                    });
                }
            }
            catch (err) {
                console.error("Error sending seller rejection email:", err);
            }
        }
        return verifiedSeller;
    }
    static async approveProduct(productId) {
        const product = await Product.findByPk(productId);
        if (!product) {
            return null;
        }
        product.isActive = true;
        await product.save();
        return product;
    }
    static async deleteSeller(sellerProfileId) {
        const sellerProfile = await SellerProfile.findByPk(sellerProfileId, {
            include: [{ model: User }]
        });
        if (!sellerProfile) {
            return false;
        }
        const userId = sellerProfile.userId;
        const user = sellerProfile.User;
        const phone_number = user?.phone_number;
        // 1. Find all product IDs for the seller
        const products = await Product.findAll({
            where: { sellerId: userId },
            attributes: ["id"]
        });
        const productIds = products.map((p) => p.id);
        // 2. Find all variant IDs for these products
        let variantIds = [];
        if (productIds.length > 0) {
            const variants = await ProductVariant.findAll({
                where: { productId: { [Op.in]: productIds } },
                attributes: ["id"]
            });
            variantIds = variants.map((v) => v.id);
        }
        // 3. Find all orders for this seller
        const orders = await Order.findAll({
            where: { sellerId: userId },
            attributes: ["id"]
        });
        const orderIds = orders.map((o) => o.id);
        const transaction = await jiffy.transaction();
        try {
            // Delete CartItem referencing the product IDs or variant IDs
            if (productIds.length > 0) {
                const cartItemConditions = {
                    [Op.or]: [
                        { productId: { [Op.in]: productIds } }
                    ]
                };
                if (variantIds.length > 0) {
                    cartItemConditions[Op.or].push({ variantId: { [Op.in]: variantIds } });
                }
                await CartItem.destroy({
                    where: cartItemConditions,
                    transaction
                });
                // Delete Wishlist referencing the product IDs
                await Wishlist.destroy({
                    where: { productId: { [Op.in]: productIds } },
                    transaction
                });
            }
            // Delete OrderItem records referencing our products or our orders
            const orderItemConditions = [];
            if (productIds.length > 0) {
                orderItemConditions.push({ productId: { [Op.in]: productIds } });
            }
            if (orderIds.length > 0) {
                orderItemConditions.push({ orderId: { [Op.in]: orderIds } });
            }
            if (orderItemConditions.length > 0) {
                await OrderItem.destroy({
                    where: { [Op.or]: orderItemConditions },
                    transaction
                });
            }
            // Delete Order records
            await Order.destroy({
                where: { sellerId: userId },
                transaction
            });
            if (productIds.length > 0) {
                // Delete ProductCategory join records
                await ProductCategory.destroy({
                    where: { productId: { [Op.in]: productIds } },
                    transaction
                });
                // Delete ProductVariant records
                await ProductVariant.destroy({
                    where: { productId: { [Op.in]: productIds } },
                    transaction
                });
            }
            // Delete Product records
            await Product.destroy({
                where: { sellerId: userId },
                transaction
            });
            // Delete Store, Document, BankDetail, VerifiedSellers
            await Store.destroy({
                where: { sellerId: sellerProfileId },
                transaction
            });
            await Document.destroy({
                where: { sellerId: sellerProfileId },
                transaction
            });
            await BankDetail.destroy({
                where: { sellerId: sellerProfileId },
                transaction
            });
            await VerifiedSellers.destroy({
                where: { sellerId: sellerProfileId },
                transaction
            });
            // Delete Locations referencing sellerId or userId
            await Location.destroy({
                where: {
                    [Op.or]: [
                        { sellerId: sellerProfileId },
                        { userId: userId }
                    ]
                },
                transaction
            });
            // Delete RefreshTokens
            await RefreshToken.destroy({
                where: { user_id: userId },
                transaction
            });
            // Delete UserRoles
            await UserRole.destroy({
                where: { user_id: userId },
                transaction
            });
            // Delete BuyerProfile if any (just in case they have one, to avoid orphans/constraints)
            await BuyerProfile.destroy({
                where: { userId: userId },
                transaction
            });
            // Delete OtpLogin records
            if (phone_number) {
                await OtpLogin.destroy({
                    where: { phone_number },
                    transaction
                });
            }
            // Delete SellerProfile
            await SellerProfile.destroy({
                where: { id: sellerProfileId },
                transaction
            });
            // Delete User
            await User.destroy({
                where: { id: userId },
                transaction
            });
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    static async getSellersOrders(filters) {
        const { sellerId, buyerId, status, startDate, endDate, page = 1, limit = 20 } = filters;
        const where = {};
        if (sellerId) {
            where.sellerId = sellerId;
        }
        if (buyerId) {
            where.userId = buyerId;
        }
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                where.createdAt[Op.lte] = new Date(endDate);
            }
        }
        const orders = await Order.findAndCountAll({
            where,
            include: [
                {
                    association: "items",
                    include: [
                        {
                            association: "product",
                            include: [
                                {
                                    association: "categories",
                                },
                            ],
                        },
                    ],
                },
                {
                    association: "buyer",
                    attributes: ["id", "phone_number", "email"],
                    include: [
                        {
                            model: BuyerProfile,
                            required: false,
                            attributes: ["fullName", "phone", "address", "city", "state", "zipCode"],
                        },
                    ],
                },
                {
                    association: "seller",
                    attributes: ["id", "phone_number", "email"],
                    include: [
                        {
                            model: SellerProfile,
                            required: false,
                            attributes: ["businessName", "gstNumber", "address", "city", "state", "zipCode", "phone"],
                        },
                    ],
                },
            ],
            limit: limit,
            offset: (page - 1) * limit,
            order: [["createdAt", "DESC"]],
            distinct: true,
        });
        return {
            items: orders.rows,
            total: orders.count,
            page,
            limit,
            totalPages: Math.ceil(orders.count / limit),
        };
    }
    static async getOrderDetail(orderId) {
        return await Order.findByPk(orderId, {
            include: [
                {
                    association: "items",
                    include: [
                        {
                            association: "product",
                            include: [
                                {
                                    association: "categories",
                                    include: [
                                        {
                                            association: "parent",
                                            include: [{ association: "parent" }],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                {
                    association: "buyer",
                    attributes: ["id", "phone_number", "email"],
                    include: [
                        {
                            model: BuyerProfile,
                            required: false,
                            attributes: ["fullName", "phone", "address", "city", "state", "zipCode"],
                        },
                    ],
                },
                {
                    association: "seller",
                    attributes: ["id", "phone_number", "email"],
                    include: [
                        {
                            model: SellerProfile,
                            required: false,
                            attributes: ["businessName", "gstNumber", "address", "city", "state", "zipCode", "phone"],
                        },
                    ],
                },
            ],
        });
    }
}
