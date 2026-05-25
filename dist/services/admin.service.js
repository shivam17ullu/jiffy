import { SellerProfile, VerifiedSellers, User, Store, Document, BankDetail, Product } from "../model/relations.js";
import { Op, Sequelize } from "sequelize";
export default class AdminService {
    static async getActiveSellers() {
        return await SellerProfile.findAll({
            order: [["createdAt", "DESC"]],
            attributes: ["id", "userId", "businessName", "phone", "address", "city", "state", "zipCode", "gstNumber", "createdAt"],
            include: [
                {
                    model: VerifiedSellers,
                    where: { is_active: true },
                    attributes: ["id", "is_active", "createdAt"],
                },
                {
                    model: User,
                    attributes: ["email"],
                },
            ],
        });
    }
    static async getInactiveSellers() {
        return await SellerProfile.findAll({
            order: [["createdAt", "DESC"]],
            attributes: ["id", "userId", "businessName", "phone", "address", "city", "state", "zipCode", "gstNumber", "createdAt"],
            include: [
                {
                    model: VerifiedSellers,
                    where: { is_active: false },
                    attributes: ["id", "is_active", "createdAt"],
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
    static async approveSeller(sellerId, action) {
        const verifiedSeller = await VerifiedSellers.findOne({
            where: { sellerId },
            include: [{ model: SellerProfile }]
        });
        if (!verifiedSeller) {
            return null;
        }
        verifiedSeller.is_active = action === "accept";
        await verifiedSeller.save();
        if (action === "accept" && verifiedSeller.SellerProfile?.userId) {
            await User.update({ is_active: true }, { where: { id: verifiedSeller.SellerProfile.userId } });
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
}
