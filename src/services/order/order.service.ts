// src/services/order/order.service.ts

import { jiffy } from "../../config/sequelize.js";
import {
  Cart,
  CartItem,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  User,
  SellerProfile,
  BuyerProfile,
} from "../../model/relations.js";
import { Op } from "sequelize";

export const createOrdersFromCart = async (
  userId: number,
  shippingAddress: any,
  paymentInfo: any,
  cartId: number
) => {
  const t = await jiffy.transaction();

  try {
    // const cart = await Cart.findOne({
    //   where: { userId },
    //   transaction: t,
    // });
    // if (!cart) throw new Error("Cart not found");

    const items = await CartItem.findAll({
      where: { cartId: cartId },
      include: [
        { model: Product, as: "product" },
        { model: ProductVariant, as: "variant" },
      ],
      transaction: t,
    });

    if (!items.length) throw new Error("Cart is empty");

    // Group by seller
    const groups: Record<number, any[]> = {};
    for (const item of items) {
      const sellerId = item.product.sellerId;
      if (!groups[sellerId]) groups[sellerId] = [];
      groups[sellerId].push(item);
    }

    const createdOrders: Order[] = [];

    // Create one order per seller
    for (const sellerIdStr of Object.keys(groups)) {
      const sellerId = Number(sellerIdStr);
      const groupItems = groups[sellerId];

      let total = 0;

      // stock check + total calculation
      for (const it of groupItems) {
        const variant = it.variant;
        if (variant.stock < it.qty)
          throw new Error("Insufficient stock for variant: " + variant.id);

        total += (it.price || variant.price) * it.qty;
      }

      // FIXED — added sellerId in Order.create()
      const order = await Order.create(
        {
          userId,
          sellerId,       // <-- REQUIRED FIELD FIX
          total,
          status: "created",
          shippingAddress,
          paymentInfo,
        },
        { transaction: t }
      );

      // create OrderItems + reduce stock
      for (const it of groupItems) {
        await OrderItem.create(
          {
            orderId: order.id,
            productId: it.productId,
            variantId: it.variantId,
            qty: it.qty,
            price: it.price,
          },
          { transaction: t }
        );

        await it.variant.update(
          { stock: it.variant.stock - it.qty },
          { transaction: t }
        );
      }

      createdOrders.push(order);
    }

    // clear cart
    await CartItem.destroy({
      where: { cartId: cartId },
      transaction: t,
    });

    await t.commit();

    // reload orders
    return Promise.all(
      createdOrders.map((o) =>
        Order.findByPk(o.id, {
          include: [{ model: OrderItem, as: "items" }],
        })
      )
    );
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Get list of orders for a user (buyer or seller)
 * @param userId - User ID
 * @param role - User role ('buyer' or 'seller')
 * @param opts - Filter options (page, limit, status)
 */
export const listOrders = async (
  userId: number,
  role: string,
  opts: any
) => {
  const { page = 1, limit = 20, status } = opts;

  const where: any = {};

  // Filter by user role
  if (role === "buyer") {
    where.userId = userId;
  } else if (role === "seller") {
    where.sellerId = userId;
  }

  // Filter by status if provided
  if (status) {
    where.status = status;
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
      },
      {
        association: "seller",
        attributes: ["id", "phone_number", "email"],
        include: [
          {
            model: SellerProfile,
            required: false,
            attributes: [
              "businessName",
              "city",
              "state",
              "phone",
            ],
          },
        ],
      },
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
    distinct: true,
  });

  return {
    items: orders.rows,
    total: orders.count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(orders.count / parseInt(limit)),
  };
};

/**
 * Get order details by ID
 * @param orderId - Order ID
 * @param userId - User ID (for authorization)
 * @param role - User role ('buyer' or 'seller')
 */
export const getOrderById = async (
  orderId: number,
  userId: number,
  role: string
) => {
  const where: any = { id: orderId };

  // Filter by user role for authorization
  if (role === "buyer") {
    where.userId = userId;
  } else if (role === "seller") {
    where.sellerId = userId;
  }

  const order = await Order.findOne({
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
                include: [
                  {
                    association: "parent",
                    include: [{ association: "parent" }],
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
                    attributes: [
                      "businessName",
                      "gstNumber",
                      "address",
                      "city",
                      "state",
                      "zipCode",
                      "phone",
                    ],
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
            attributes: [
              "fullName",
              "phone",
              "address",
              "city",
              "state",
              "zipCode",
            ],
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
            attributes: [
              "businessName",
              "gstNumber",
              "address",
              "city",
              "state",
              "zipCode",
              "phone",
            ],
          },
        ],
      },
    ],
  });

  return order;
};

/**
 * Update order status (Seller only)
 * @param orderId - Order ID
 * @param sellerId - Seller ID
 * @param status - New status
 */
export const updateOrderStatus = async (
  orderId: number,
  sellerId: number,
  status: string
) => {
  const allowedStatuses = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`);
  }

  const [updatedCount] = await Order.update(
    { status },
    {
      where: {
        id: orderId,
        sellerId: sellerId,
      },
    }
  );

  if (updatedCount === 0) {
    throw new Error("Order not found or you don't have permission to update it");
  }

  return await Order.findByPk(orderId);
};
