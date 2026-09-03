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
  WalletTransaction,
} from "../../model/relations.js";
import { Op } from "sequelize";
import { sendNewOrderEmail } from "../../utils/mailer.js";
import { createAndSendNotification } from "../notification/notification.service.js";
import { emitToUser } from "../socket/socket.service.js";
import { creditWallet, debitWallet } from "../wallet/wallet.service.js";

export const createOrdersFromCart = async (
  userId: number,
  shippingAddress: any,
  paymentInfo: any,
  cartId: number,
  isFullWalletPay?: boolean,
  walletAmount?: number
) => {
  const t = await jiffy.transaction();

  try {
    const items = await CartItem.findAll({
      where: { cartId: cartId },
      include: [
        { model: Product, as: "product" },
        { model: ProductVariant, as: "variant" },
      ],
      transaction: t,
    });

    if (!items.length) throw new Error("Cart is empty");

    // Calculate overall cart total first and verify stock
    let overallCartTotal = 0;
    for (const item of items) {
      const variant = item.variant;
      if (variant.stock < item.qty) {
        throw new Error("Insufficient stock for variant: " + variant.id);
      }
      overallCartTotal += (item.price || variant.price) * item.qty;
    }

    let finalWalletDeduction = 0;
    if (isFullWalletPay) {
      finalWalletDeduction = overallCartTotal;
    } else if (walletAmount && walletAmount > 0) {
      if (walletAmount >= overallCartTotal) {
        throw new Error("Partial wallet payment amount must be less than the total order amount.");
      }
      finalWalletDeduction = walletAmount;
    }

    if (finalWalletDeduction > 0) {
      await debitWallet(
        {
          userId,
          amount: finalWalletDeduction,
          referenceId: `cart_${cartId}`,
          referenceType: "ORDER",
          category: "ORDER_PAYMENT",
          description: `Payment for cart checkout (Cart #${cartId})`,
        },
        t
      );
    }

    // Group by seller
    const groups: Record<number, any[]> = {};
    for (const item of items) {
      const sellerId = item.product.sellerId;
      if (!groups[sellerId]) groups[sellerId] = [];
      groups[sellerId].push(item);
    }

    const createdOrders: Order[] = [];
    const emailNotifications: any[] = [];
    const sellerIds = Object.keys(groups);

    let allocatedWallet = 0;

    // Create one order per seller
    for (let i = 0; i < sellerIds.length; i++) {
      const sellerId = Number(sellerIds[i]);
      const groupItems = groups[sellerId];
      const isLastOrder = i === sellerIds.length - 1;

      let total = 0;
      for (const it of groupItems) {
        const variant = it.variant;
        total += (it.price || variant.price) * it.qty;
      }

      let orderWalletShare = 0;
      if (finalWalletDeduction > 0) {
        if (isFullWalletPay) {
          orderWalletShare = total;
        } else {
          orderWalletShare = isLastOrder
            ? Number((finalWalletDeduction - allocatedWallet).toFixed(2))
            : Number(((total / overallCartTotal) * finalWalletDeduction).toFixed(2));
          allocatedWallet += orderWalletShare;
        }
      }

      const orderStatus = isFullWalletPay ? "Confirmed" : "Created";
      const enrichedPaymentInfo = {
        method: isFullWalletPay
          ? "Wallet"
          : orderWalletShare > 0
          ? "Partial (Wallet + Online)"
          : "Online",
        status: isFullWalletPay ? "captured" : "pending",
        walletAmount: orderWalletShare,
        razorpayAmount: Number((total - orderWalletShare).toFixed(2)),
        ...(paymentInfo || {}),
      };

      const order = await Order.create(
        {
          userId,
          sellerId,
          total,
          status: orderStatus,
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

    // Update wallet ledger transaction with the actual order ID(s)
    if (finalWalletDeduction > 0 && createdOrders.length > 0) {
      const orderIdsStr = createdOrders.map((o) => o.id).join(", ");
      await WalletTransaction.update(
        {
          referenceId: String(createdOrders[0].id),
          description: `Payment for checkout: Jiffy Order(s) #${orderIdsStr}`,
        },
        {
          where: { referenceId: `cart_${cartId}`, userId },
          transaction: t,
        }
      );
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
      const itemsPayload = orderItems.map((it: any) => {
        let rawImages = it.variant?.images || it.product?.images || [];
        if (typeof rawImages === "string") {
          try {
            rawImages = JSON.parse(rawImages);
          } catch {
            rawImages = [rawImages];
          }
        }
        const images: string[] = Array.isArray(rawImages)
          ? rawImages.filter(Boolean)
          : [];
        const imageUrl = images[0] || "";

        return {
          productId: String(it.productId),
          productName: it.product?.name || "",
          quantity: it.qty,
          price: Number(it.price || it.variant?.price || 0),
          imageUrl: imageUrl,
          images: images,
          size: it.variant?.size || "",
          color: it.variant?.color || "",
        };
      });

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

  // 1. Get count and paginated IDs first to avoid ER_OUT_OF_SORTMEMORY with large JOINs
  const { count, rows: idRows } = await Order.findAndCountAll({
    where,
    attributes: ["id"],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });

  const ids = idRows.map((row) => row.id);

  let fullRows: any[] = [];
  if (ids.length > 0) {
    // 2. Fetch full relations for those specific IDs without an SQL ORDER BY
    fullRows = await Order.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          association: "items",
          include: [
            {
              association: "variant",
            },
            {
              association: "product",
              include: [
                {
                  association: "categories",
                },
                {
                  association: "variants",
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
    });

    // 3. Sort the joined results in JavaScript to match the paginated ID order
    fullRows.sort((a, b) => {
      return ids.indexOf(a.id) - ids.indexOf(b.id);
    });
  }

  return {
    items: fullRows,
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(count / parseInt(limit)),
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
            association: "variant",
          },
          {
            association: "product",
            include: [
              {
                association: "variants",
              },
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
    "Exchange Processed",
    "Exchange Accepted",
    "Exchange Rejected",
    "Rejected",
    "Cancelled",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(`Invalid status. Allowed: ${allowedStatuses.join(", ")}`);
  }

  const t = await jiffy.transaction();
  try {
    const lockedOrder = await Order.findOne({
      where: {
        id: orderId,
        sellerId: sellerId,
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedOrder) {
      throw new Error("Order not found or you don't have permission to update it");
    }

    const isRefunding = (status === "Refund Successful" || status === "Return Accepted") &&
                        (lockedOrder.status !== "Refund Successful" && lockedOrder.status !== "Return Accepted");

    let cancellationRefundAmount = 0;
    if (status === "Cancelled" && lockedOrder.status !== "Cancelled") {
      const pInfo = lockedOrder.paymentInfo || {};
      if (lockedOrder.status.toLowerCase() === "confirmed") {
        cancellationRefundAmount = lockedOrder.total;
      } else if (lockedOrder.status.toLowerCase() === "created" && pInfo.walletAmount > 0) {
        cancellationRefundAmount = Number(pInfo.walletAmount);
      }
    }

    await lockedOrder.update({ status }, { transaction: t });

    if (isRefunding) {
      await creditWallet(
        {
          userId: lockedOrder.userId,
          amount: lockedOrder.total,
          referenceId: `order_refund_${orderId}`,
          referenceType: "ORDER",
          category: "REFUND",
          description: `Refund for returned order #${orderId}`,
        },
        t
      );
    }

    if (cancellationRefundAmount > 0) {
      await creditWallet(
        {
          userId: lockedOrder.userId,
          amount: cancellationRefundAmount,
          referenceId: `order_cancel_${orderId}`,
          referenceType: "ORDER",
          category: "REFUND",
          description: `Refund for cancelled order #${orderId}`,
        },
        t
      );
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const order = await Order.findByPk(orderId);
  if (order) {
    // Generate custom title and message based on status
    let title = "Order Status Updated";
    let message = `Your order #${order.id} status has been updated to ${status}.`;

    if (status.toLowerCase() === "accepted") {
      title = "Order Accepted! 🎉";
      message = `Great news! Your order #${order.id} has been accepted by the seller.`;
    } else if (status.toLowerCase() === "rejected") {
      title = "Order Rejected ❌";
      message = `Unfortunately, your order #${order.id} was rejected by the seller.`;
    } else if (status.toLowerCase() === "cancelled") {
      title = "Order Cancelled 🚫";
      message = `Your order #${order.id} has been cancelled.`;
    } else if (status.toLowerCase() === "shipped") {
      title = "Order Shipped! 🚚";
      message = `Your order #${order.id} is on the way!`;
    } else if (status.toLowerCase() === "delivered") {
      title = "Order Delivered! 📦";
      message = `Your order #${order.id} has been delivered. Enjoy!`;
    }

    // Send status update notification to the buyer
    createAndSendNotification(
      order.userId,
      title,
      message,
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

  const t = await jiffy.transaction();
  try {
    const lockedOrder = await Order.findByPk(orderId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedOrder) {
      throw new Error("Order not found");
    }

    const currentStatus = lockedOrder.status.toLowerCase();
    if (
      currentStatus !== "created" &&
      currentStatus !== "confirmed" &&
      currentStatus !== "pending" &&
      currentStatus !== "processing"
    ) {
      throw new Error(`Order cannot be cancelled in status ${lockedOrder.status}`);
    }

    let refundAmount = 0;
    const pInfo = lockedOrder.paymentInfo || {};
    if (currentStatus === "confirmed") {
      refundAmount = lockedOrder.total;
    } else if (currentStatus === "created" && pInfo.walletAmount > 0) {
      refundAmount = Number(pInfo.walletAmount);
    }

    await lockedOrder.update({ status: "Cancelled" }, { transaction: t });

    if (refundAmount > 0) {
      await creditWallet(
        {
          userId,
          amount: refundAmount,
          referenceId: `order_cancel_${orderId}`,
          referenceType: "ORDER",
          category: "REFUND",
          description: `Refund for cancelled order #${orderId}`,
        },
        t
      );
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

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

/**
 * Upload verification/dispatch images for an order (Seller only)
 * @param orderId - Order ID
 * @param sellerId - Seller User ID
 * @param imageUrls - Array of image URLs (min 1, max 3)
 */
export const uploadOrderVerificationImages = async (
  orderId: number,
  sellerId: number,
  imageUrls: string[]
) => {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > 3) {
    throw new Error("Verification images count must be between 1 and 3");
  }

  const order = await Order.findByPk(orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  if (Number(order.sellerId) !== Number(sellerId)) {
    throw new Error("You do not have permission to upload verification images for this order");
  }

  const currentStatus = (order.status || "").toLowerCase();
  if (currentStatus === "cancelled" || currentStatus === "rejected") {
    throw new Error(`Cannot upload verification images for an order that is ${order.status}`);
  }

  order.verificationImages = imageUrls;
  order.changed("verificationImages", true);
  await order.save();

  return order;
};
