import {
  Product,
  Order,
  OrderItem,
  User,
} from "../../model/relations.js";
import { Op, fn, col } from "sequelize";
import { jiffy } from "../../config/sequelize.js";

/**
 * Get seller statistics/dashboard data
 */
export const getSellerStats = async (sellerId: number) => {
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

  const ordersByStatus = ordersByStatusRaw.reduce((acc: any, item: any) => {
    acc[item.status] = parseInt(item.count as any) || 0;
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

  const totalRevenue = (revenueResult[0] as any)?.totalRevenue || 0;

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
      totalRevenue: parseFloat(totalRevenue as any) || 0,
    },
    ordersByStatus,
    recentOrders: recentOrders.map((order: any) => ({
      id: order.id,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      buyer: order.buyer,
    })),
    lowStockProducts: lowStockProducts.map((product: any) => ({
      id: product.id,
      name: product.name,
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        stock: v.stock,
      })),
    })),
  };
};

