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
import { sendNewOrderEmail } from "../../utils/mailer.js";
import { createAndSendNotification } from "../notification/notification.service.js";
import { emitToUser } from "../socket/socket.service.js";

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
    const emailNotifications: any[] = [];

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

      const enrichedPaymentInfo = {
        method: "Online",
        ...(paymentInfo || {}),
      };

      // FIXED — added sellerId in Order.create()
      const order = await Order.create(
        {
          userId,
          sellerId,       // <-- REQUIRED FIELD FIX
          total,
          status: "Created",
          shippingAddress,
          paymentInfo: enrichedPaymentInfo,
        },
        { transaction: t }
      );

      // Fetch seller details for notification
      const sellerUser = await User.findByPk(sellerId, {
        include: [{ model: SellerProfile, required: false }],
        transaction: t,
      });

      const emailItems = groupItems.map((it) => ({
        productName: it.product.name,
        size: it.variant.size || "N/A",
        qty: it.qty,
        price: it.price || it.variant.price,
      }));

      const sellerEmail = sellerUser?.email || "";
      const sellerName =
        (sellerUser as any)?.SellerProfile?.businessName ||
        sellerUser?.phone_number ||
        "Seller";

      if (sellerEmail) {
        emailNotifications.push({
          sellerEmail,
          sellerName,
          orderId: order.id,
          buyerName: shippingAddress.fullName || shippingAddress.name || "Customer",
          buyerPhone: shippingAddress.phone || "N/A",
          shippingCity: shippingAddress.city || "N/A",
          shippingState: shippingAddress.state || "N/A",
          items: emailItems,
          totalAmount: total,
        });
      }

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

    // Trigger emails asynchronously to not block order completion response
    for (const notification of emailNotifications) {
      sendNewOrderEmail(notification).catch((err) => {
        console.error(
          `Failed to send new order email to seller for order #${notification.orderId}:`,
          err
        );
      });
    }

    // Trigger seller push and database notifications asynchronously
    for (const order of createdOrders) {
      createAndSendNotification(
        order.sellerId,
        "New Order Received",
        `You have received a new order #${order.id} of ₹${order.total.toFixed(2)}.`,
        "new_order",
        order.id,
        "seller"
      ).catch((err) => {
        console.error(`Failed to send new order notification to seller #${order.sellerId}:`, err);
      });

      // Emit real-time update via WebSocket
      const orderItems = groups[order.sellerId] || [];
      const itemsPayload = orderItems.map((it: any) => ({
        productId: String(it.productId),
        productName: it.product.name,
        quantity: it.qty,
        price: Number(it.price || it.variant.price),
        imageUrl: it.product.images?.[0] || ""
      }));

      emitToUser(order.sellerId, "new_order", {
        orderId: String(order.id),
        total: Number(order.total),
        message: `You have received a new order #${order.id} of ₹${order.total.toFixed(2)}.`,
        items: itemsPayload,
      });
    }

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
  } else if (role === "all") {
    where[Op.or] = [{ userId: userId }, { sellerId: userId }];
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
  } else if (role === "all") {
    where[Op.or] = [{ userId: userId }, { sellerId: userId }];
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
    "Created",
    "Confirmed",
    "Out For Delivery",
    "Delivered",
    "Return Processed",
    "Return Accepted",
    "Return Rejected",
    "Refund Successful",
    "Rejected",
    "Cancelled",
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

  const order = await Order.findByPk(orderId);
  if (order) {
    // Send status update notification to the buyer
    createAndSendNotification(
      order.userId,
      "Order Status Updated",
      `Your order #${order.id} status has been updated to ${status}.`,
      "order_status_update",
      order.id,
      "buyer"
    ).catch((err) => {
      console.error(
        `Failed to send status update notification to buyer #${order.userId} for order #${order.id}:`,
        err
      );
    });
  }

  return order;
};

/**
 * Cancel order by buyer
 * @param orderId - Order ID
 * @param userId - Buyer User ID
 */
export const cancelOrder = async (orderId: number, userId: number) => {
  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.userId != userId) {
    throw new Error("You don't have permission to cancel this order");
  }

  const cancellableStatuses = ["Created", "Confirmed", "Pending", "Processing"];
  const statusLower = order.status.toLowerCase();
  if (
    statusLower !== "created" &&
    statusLower !== "confirmed" &&
    statusLower !== "pending" &&
    statusLower !== "processing"
  ) {
    throw new Error(`Order cannot be cancelled in status ${order.status}`);
  }

  await Order.update(
    { status: "Cancelled" },
    { where: { id: orderId } }
  );

  const updatedOrder = await Order.findByPk(orderId);

  // Send cancellation notification to the seller
  if (updatedOrder) {
    createAndSendNotification(
      updatedOrder.sellerId,
      "Order Cancelled",
      `Order #${updatedOrder.id} has been cancelled by the buyer.`,
      "order_cancelled",
      updatedOrder.id,
      "seller"
    ).catch((err) => {
      console.error(
        `Failed to send order cancellation notification to seller #${updatedOrder.sellerId} for order #${updatedOrder.id}:`,
        err
      );
    });
  }

  return updatedOrder;
};
