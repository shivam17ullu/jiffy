import { jiffy } from "../../config/sequelize.js";
import {
  ReturnExchangeRequest,
  ReturnExchangeItem,
  Order,
  OrderItem,
  ProductVariant,
  User,
  SellerProfile,
  BuyerProfile,
} from "../../model/relations.js";
import { Op, Transaction } from "sequelize";
import { creditWallet } from "../wallet/wallet.service.js";
import { createAndSendNotification } from "../notification/notification.service.js";

/**
 * Create a new Return or Exchange request (Buyer only)
 */
export const createReturnExchangeRequest = async (
  userId: number,
  payload: any
) => {
  const { orderId, type, reason, comments, images, items } = payload;

  if (!orderId || !type || !reason || !items || !items.length) {
    throw new Error("Missing required fields: orderId, type, reason, or items.");
  }

  if (type !== "RETURN" && type !== "EXCHANGE") {
    throw new Error("Invalid request type. Allowed: RETURN, EXCHANGE");
  }

  const t = await jiffy.transaction();

  try {
    // 1. Fetch Order and check status
    const order = await Order.findByPk(orderId, { transaction: t });
    if (!order) {
      throw new Error("Order not found");
    }

    if (order.userId != userId) {
      throw new Error("You do not have permission to return items from this order.");
    }

    if (order.status !== "Delivered") {
      throw new Error("Only delivered orders are eligible for return or exchange.");
    }

    // 2. Validate 1-Hour Eligibility Window
    const deliveryTime = new Date(order.updatedAt).getTime();
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    if (now - deliveryTime > oneHourMs) {
      throw new Error("Return/Exchange requests can only be made within 1 hour of delivery.");
    }

    // 3. Fetch existing requests to prevent duplicate quantity returns
    const existingRequests = await ReturnExchangeRequest.findAll({
      where: {
        orderId: order.id,
        status: { [Op.ne]: "CANCELLED" },
      },
      include: [{ association: "items" }],
      transaction: t,
    });

    const returnedQtyMap: Record<number, number> = {};
    for (const req of existingRequests) {
      const reqItems = (req as any).items || [];
      for (const item of reqItems) {
        returnedQtyMap[item.orderItemId] = (returnedQtyMap[item.orderItemId] || 0) + item.qty;
      }
    }

    // 4. Validate request items
    const verifiedItems: any[] = [];
    for (const reqItem of items) {
      const { orderItemId, productId, variantId, qty, exchangeVariantId } = reqItem;

      if (!orderItemId || !productId || !variantId || !qty || qty <= 0) {
        throw new Error("Invalid item format in request payload.");
      }

      // Fetch corresponding order item
      const orderItem = await OrderItem.findOne({
        where: { id: orderItemId, orderId: order.id },
        transaction: t,
      });

      if (!orderItem) {
        throw new Error(`Order item #${orderItemId} does not exist in order #${order.id}.`);
      }

      if (orderItem.productId !== productId || orderItem.variantId !== variantId) {
        throw new Error(`Item specifications for order item #${orderItemId} do not match the database.`);
      }

      // Check remaining returnable quantity
      const alreadyReturned = returnedQtyMap[orderItemId] || 0;
      if (alreadyReturned + qty > orderItem.qty) {
        throw new Error(
          `Requested quantity (${qty}) for item #${orderItemId} exceeds the eligible remaining quantity (${orderItem.qty - alreadyReturned}).`
        );
      }

      // Validate exchange variant constraints if EXCHANGE
      let verifiedExchangeVariantId = null;
      if (type === "EXCHANGE") {
        if (!exchangeVariantId) {
          throw new Error(`Exchange variant is required for exchanging order item #${orderItemId}.`);
        }

        const exchangeVariant = await ProductVariant.findByPk(exchangeVariantId, { transaction: t });
        if (!exchangeVariant) {
          throw new Error(`Exchange variant #${exchangeVariantId} not found.`);
        }

        if (exchangeVariant.productId !== productId) {
          throw new Error("Exchange variant must belong to the same product.");
        }

        if (exchangeVariant.stock < qty) {
          throw new Error(`Insufficient stock for requested exchange variant #${exchangeVariantId}.`);
        }

        // Compare price snapshot from order item (which is what buyer paid) with original variant price
        const originalVariant = await ProductVariant.findByPk(variantId, { transaction: t });
        if (!originalVariant) {
          throw new Error(`Original variant #${variantId} not found.`);
        }

        if (Number(exchangeVariant.price) !== Number(originalVariant.price)) {
          throw new Error(
            `Exchange variant price (₹${exchangeVariant.price}) must match original variant price (₹${originalVariant.price}).`
          );
        }

        verifiedExchangeVariantId = exchangeVariantId;
      }

      verifiedItems.push({
        orderItemId,
        productId,
        variantId,
        qty,
        price: orderItem.price,
        exchangeVariantId: verifiedExchangeVariantId,
      });
    }

    // 5. Create Request record
    const request = await ReturnExchangeRequest.create(
      {
        orderId: order.id,
        userId,
        sellerId: order.sellerId,
        type,
        status: "PENDING",
        reason,
        comments,
        images: images || [],
      },
      { transaction: t }
    );

    // 6. Create request items
    for (const item of verifiedItems) {
      await ReturnExchangeItem.create(
        {
          requestId: request.id,
          orderItemId: item.orderItemId,
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
          price: item.price,
          exchangeVariantId: item.exchangeVariantId,
        },
        { transaction: t }
      );
    }

    // 7. Update overall Order status to initial return/exchange status
    const initialOrderStatus = type === "RETURN" ? "Return Requested" : "Exchange Requested";
    // Optional: You could remove the global Order.update if you want to rely purely on item status.
    // For backwards compatibility, we'll keep it but also update OrderItem.
    
    for (const item of verifiedItems) {
      await OrderItem.update(
        { status: initialOrderStatus },
        { where: { id: item.orderItemId }, transaction: t }
      );
    }

    await t.commit();

    // Send push / DB notification to the seller
    createAndSendNotification(
      order.sellerId,
      `New ${type} Request`,
      `A new return/exchange request #${request.id} has been submitted for order #${order.id}.`,
      "new_return_exchange",
      request.id,
      "seller"
    ).catch((err) => {
      console.error(`Failed to send notification to seller #${order.sellerId} for request #${request.id}:`, err);
    });

    // Reload with items
    return await ReturnExchangeRequest.findByPk(request.id, {
      include: [{ association: "items" }],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * Get paginated list of Return & Exchange requests
 */
export const listRequests = async (userId: number, role: string, opts: any) => {
  const { page = 1, limit = 20, status, type } = opts;
  const where: any = {};

  if (role === "buyer") {
    where.userId = userId;
  } else if (role === "seller") {
    where.sellerId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  // 1. Get count and paginated IDs first to avoid ER_OUT_OF_SORTMEMORY with large JOINs
  const { count, rows: idRows } = await ReturnExchangeRequest.findAndCountAll({
    where,
    attributes: ["id"],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [["createdAt", "DESC"]],
  });

  const ids = idRows.map((row) => row.id);

  let fullRows: any[] = [];
  if (ids.length > 0) {
    // 2. Fetch full relations for those specific IDs
    fullRows = await ReturnExchangeRequest.findAll({
      where: { id: { [Op.in]: ids } },
      include: [
        {
          association: "items",
          include: [
            { association: "originalVariant", attributes: ["size", "color", "price"] },
            { association: "exchangeVariant", attributes: ["size", "color", "price"] },
          ],
        },
        {
          association: "order",
          attributes: ["id", "total", "status", "createdAt"],
        },
        {
          association: "seller",
          attributes: ["id", "email"],
          include: [
            {
              association: "SellerProfile",
              attributes: ["businessName"],
            },
          ],
        },
      ],
    });

    // Sort the joined results in JavaScript to avoid MySQL sort_buffer exhaustion
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
 * Get detailed Return/Exchange Request by ID
 */
export const getRequestById = async (
  requestId: number,
  userId: number,
  role: string
) => {
  const request = await ReturnExchangeRequest.findByPk(requestId, {
    include: [
      {
        association: "items",
        include: [
          { association: "originalVariant" },
          { association: "exchangeVariant" },
        ],
      },
      {
        association: "order",
      },
    ],
  });

  if (!request) return null;

  if (role === "buyer" && request.userId != userId) {
    throw new Error("You do not have permission to view this request.");
  }
  if (role === "seller" && request.sellerId != userId) {
    throw new Error("You do not have permission to view this request.");
  }

  return request;
};

/**
 * Update request status (Approvals by Seller/Admin, Cancel by Buyer)
 */
export const updateRequestStatus = async (
  requestId: number,
  userId: number,
  role: string,
  newStatus: string
) => {
  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED"];
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid request status. Allowed: ${allowedStatuses.join(", ")}`);
  }

  const request = await ReturnExchangeRequest.findByPk(requestId, {
    include: [{ association: "items" }],
  });
  if (!request) {
    throw new Error("Return/Exchange request not found.");
  }

  // Authorization checks
  if (role === "buyer") {
    if (request.userId != userId) {
      throw new Error("You do not have permission to modify this request.");
    }
    if (newStatus !== "CANCELLED") {
      throw new Error("Buyers can only cancel their return/exchange requests.");
    }
  } else if (role === "seller") {
    if (request.sellerId != userId) {
      throw new Error("You do not have permission to update this request.");
    }
  }

  const t = await jiffy.transaction();

  try {
    // Lock the request row to prevent race conditions during status update
    const lockedRequest = await ReturnExchangeRequest.findByPk(requestId, {
      include: [{ association: "items" }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!lockedRequest) {
      throw new Error("Return/Exchange request not found.");
    }

    const prevStatus = lockedRequest.status;

    // Transition logical validation
    if (newStatus === "CANCELLED" && prevStatus !== "PENDING" && prevStatus !== "APPROVED") {
      throw new Error(`Cannot cancel a request in ${prevStatus} state.`);
    }
    if (newStatus === "APPROVED" && prevStatus !== "PENDING") {
      throw new Error(`Cannot approve a request in ${prevStatus} state.`);
    }
    if (newStatus === "REJECTED" && prevStatus !== "PENDING") {
      throw new Error(`Cannot reject a request in ${prevStatus} state.`);
    }
    if (newStatus === "COMPLETED" && prevStatus !== "APPROVED") {
      throw new Error(`Cannot mark a request as completed without approval first.`);
    }

    // Update status in the database
    await lockedRequest.update({ status: newStatus as any }, { transaction: t });

    // Sync order status for accepted / rejected / cancelled states
    if (newStatus === "APPROVED") {
      const itemStatus = lockedRequest.type === "RETURN" ? "Return Accepted" : "Exchange Accepted";
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: itemStatus },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }

      if (lockedRequest.type === "EXCHANGE") {
        const originalOrder = await Order.findByPk(lockedRequest.orderId, { transaction: t });
        if (!originalOrder) {
          throw new Error("Original order not found.");
        }

        const exchangeItems = (lockedRequest as any).items || [];

        let exchangeTotal = 0;

        for (const item of exchangeItems) {
          // Decrement stock of the exchange variant
          const variant = await ProductVariant.findByPk(item.exchangeVariantId, { transaction: t });
          if (!variant) {
            throw new Error(`Exchange variant #${item.exchangeVariantId} not found.`);
          }
          if (variant.stock < item.qty) {
            throw new Error(`Insufficient stock for exchange variant #${item.exchangeVariantId}.`);
          }
          await variant.update({ stock: variant.stock - item.qty }, { transaction: t });
          
          exchangeTotal += (item.price * item.qty);
        }

        const newExchangeOrder = await Order.create({
          userId: lockedRequest.userId,
          sellerId: lockedRequest.sellerId,
          total: exchangeTotal,
          status: "Confirmed",
          shippingAddress: originalOrder.shippingAddress,
          paymentInfo: originalOrder.paymentInfo || {
            method: "Exchange",
            status: "captured",
            originalOrderId: lockedRequest.orderId,
            exchangeRequestId: lockedRequest.id,
          },
        }, { transaction: t });

        for (const item of exchangeItems) {
          await OrderItem.create({
            orderId: newExchangeOrder.id,
            productId: item.productId,
            variantId: item.exchangeVariantId,
            qty: item.qty,
            price: item.price,
            isReplacement: true, // Mark this as a replacement to prevent recursive exchanges
            status: 'Delivered', // Skip fulfillment for replacement? Or 'Created' depending on logic
          } as any, { transaction: t });
        }

        // Send push notification for new exchange order
        createAndSendNotification(
          lockedRequest.userId,
          "Exchange Order Created",
          `A new order #${newExchangeOrder.id} has been created for your exchange request #${lockedRequest.id}.`,
          "exchange_order_created",
          newExchangeOrder.id,
          "buyer"
        ).catch((err) => {
          console.error(`Failed to send exchange order creation notification to buyer #${lockedRequest.userId}:`, err);
        });
      }
    } else if (newStatus === "REJECTED") {
      const itemStatus = lockedRequest.type === "RETURN" ? "Return Rejected" : "Exchange Rejected";
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: itemStatus },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }
    } else if (newStatus === "CANCELLED") {
      // Restore overall order item status to null/empty if cancelled
      const exchangeItems = (lockedRequest as any).items || [];
      for (const item of exchangeItems) {
        await OrderItem.update(
          { status: "" },
          { where: { id: item.orderItemId }, transaction: t }
        );
      }
    }

    // Trigger business processes on completion
    if (newStatus === "COMPLETED") {
      const items = (lockedRequest as any).items || [];

      if (lockedRequest.type === "RETURN") {
        let totalRefund = 0;
        for (const item of items) {
          totalRefund += item.price * item.qty;

          // Increment inventory back for returned variants
          const variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
          if (variant) {
            await variant.update({ stock: variant.stock + item.qty }, { transaction: t });
          }
        }

        // Credit to wallet
        await creditWallet(
          {
            userId: lockedRequest.userId,
            amount: totalRefund,
            referenceId: `return_${lockedRequest.id}`,
            referenceType: "ORDER",
            category: "REFUND",
            description: `Refund for Return Request #${lockedRequest.id} on Order #${lockedRequest.orderId}`,
          },
          t
        );

        for (const item of items) {
          await OrderItem.update(
            { status: "Refund Successful" },
            { where: { id: item.orderItemId }, transaction: t }
          );
        }
      } else if (lockedRequest.type === "EXCHANGE") {
        for (const item of items) {
          await OrderItem.update(
            { status: "Exchange Processed" },
            { where: { id: item.orderItemId }, transaction: t }
          );
        }
        
        // Ensure the parent order status returns to Delivered after partial exchanges
        await Order.update(
          { status: "Delivered" },
          { where: { id: lockedRequest.orderId }, transaction: t }
        );
      }
    }

    await t.commit();

    // Send push / DB notification to the buyer on status change
    createAndSendNotification(
      request.userId,
      "Return/Exchange Status Updated",
      `Your request #${request.id} status has been updated to ${newStatus}.`,
      "return_exchange_status_update",
      request.id,
      "buyer"
    ).catch((err) => {
      console.error(`Failed to send status update notification to buyer #${request.userId}:`, err);
    });

    return await ReturnExchangeRequest.findByPk(requestId, {
      include: [{ association: "items" }],
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
};
