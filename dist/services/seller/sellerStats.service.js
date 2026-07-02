import { Product, Order, } from "../../model/relations.js";
import { Op, fn, col } from "sequelize";
/**
 * Get seller statistics/dashboard data
 */
export const getSellerStats = async (sellerId) => {
    // Total products
    const totalProducts = await Product.count({
        where: { sellerId },
    });
    // Active products
    const activeProducts = await Product.count({
        where: { sellerId, isActive: true },
    });
    // Total orders
    const totalOrders = await Order.count({
        where: { sellerId },
    });
    // Orders by status
    const ordersByStatusRaw = await Order.findAll({
        where: { sellerId },
        attributes: [
            "status",
            [fn("COUNT", col("id")), "count"],
        ],
        group: ["status"],
        raw: true,
    });
    const ordersByStatus = ordersByStatusRaw.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count) || 0;
        return acc;
    }, {});
    // Total revenue (sum of all order totals)
    const revenueResult = await Order.findAll({
        where: { sellerId, status: { [Op.ne]: "cancelled" } },
        attributes: [
            [fn("SUM", col("total")), "totalRevenue"],
        ],
        raw: true,
    });
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    // Total refund amount (sum of refunded order totals)
    const refundResult = await Order.findAll({
        where: { sellerId, status: "Refund Successful" },
        attributes: [
            [fn("SUM", col("total")), "totalRefund"],
        ],
        raw: true,
    });
    const totalRefundAmount = refundResult[0]?.totalRefund || 0;
    // Recent orders (last 5)
    const recentOrders = await Order.findAll({
        where: { sellerId },
        limit: 5,
        order: [["createdAt", "DESC"]],
        include: [
            {
                association: "buyer",
                attributes: ["id", "phone_number", "email"],
            },
        ],
    });
    // Low stock products (variants with stock < 10)
    const lowStockProducts = await Product.findAll({
        where: { sellerId },
        include: [
            {
                association: "variants",
                where: { stock: { [Op.lt]: 10 } },
                required: true,
            },
        ],
        limit: 10,
    });
    return {
        overview: {
            totalProducts,
            activeProducts,
            inactiveProducts: totalProducts - activeProducts,
            totalOrders,
            totalRevenue: parseFloat(totalRevenue) || 0,
            totalRefundAmount: parseFloat(totalRefundAmount) || 0,
        },
        ordersByStatus,
        recentOrders: recentOrders.map((order) => ({
            id: order.id,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            buyer: order.buyer,
        })),
        lowStockProducts: lowStockProducts.map((product) => ({
            id: product.id,
            name: product.name,
            variants: product.variants?.map((v) => ({
                id: v.id,
                sku: v.sku,
                stock: v.stock,
            })),
        })),
    };
};
/**
 * Get monthly revenue for a seller
 */
export const getSellerMonthlyRevenue = async (sellerId, year) => {
    const whereClause = {
        sellerId,
        status: { [Op.ne]: "cancelled" },
    };
    if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);
        whereClause.createdAt = {
            [Op.gte]: startDate,
            [Op.lt]: endDate,
        };
    }
    const monthlyRevenue = await Order.findAll({
        where: whereClause,
        attributes: [
            [fn("YEAR", col("createdAt")), "year"],
            [fn("MONTH", col("createdAt")), "month"],
            [fn("SUM", col("total")), "revenue"],
            [fn("COUNT", col("id")), "orderCount"],
        ],
        group: [
            fn("YEAR", col("createdAt")),
            fn("MONTH", col("createdAt")),
        ],
        order: [
            [fn("YEAR", col("createdAt")), "DESC"],
            [fn("MONTH", col("createdAt")), "DESC"],
        ],
        raw: true,
    });
    return monthlyRevenue.map((item) => ({
        year: parseInt(item.year) || 0,
        month: parseInt(item.month) || 0,
        revenue: parseFloat(item.revenue) || 0,
        orderCount: parseInt(item.orderCount) || 0,
    }));
};
/**
 * Get refunded orders for a seller
 */
export const getRefundedOrders = async (sellerId, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    const orders = await Order.findAndCountAll({
        where: {
            sellerId,
            status: "Refund Successful",
        },
        include: [
            {
                association: "items",
                include: [
                    {
                        association: "product",
                    },
                ],
            },
            {
                association: "buyer",
                attributes: ["id", "phone_number", "email"],
            },
        ],
        limit,
        offset,
        order: [["updatedAt", "DESC"]],
        distinct: true,
    });
    return {
        items: orders.rows,
        total: orders.count,
        page,
        limit,
        totalPages: Math.ceil(orders.count / limit),
    };
};
