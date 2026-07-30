import { jiffy } from "../../config/sequelize.js";
import { ReturnExchangeRequest, ReturnExchangeItem, Order, OrderItem, ProductVariant, } from "../../model/relations.js";
import { Op } from "sequelize";
import { creditWallet } from "../wallet/wallet.service.js";
import { createAndSendNotification } from "../notification/notification.service.js";
/**
 * Create a new Return or Exchange request (Buyer only)
 */
export const createReturnExchangeRequest = async (userId, payload) => {
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
        const returnedQtyMap = {};
        for (const req of existingRequests) {
            const reqItems = req.items || [];
            for (const item of reqItems) {
                returnedQtyMap[item.orderItemId] = (returnedQtyMap[item.orderItemId] || 0) + item.qty;
            }
        }
        // 4. Validate request items
        const verifiedItems = [];
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
                throw new Error(`Requested quantity (${qty}) for item #${orderItemId} exceeds the eligible remaining quantity (${orderItem.qty - alreadyReturned}).`);
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
                    throw new Error(`Exchange variant price (₹${exchangeVariant.price}) must match original variant price (₹${originalVariant.price}).`);
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
        const request = await ReturnExchangeRequest.create({
            orderId: order.id,
            userId,
            sellerId: order.sellerId,
            type,
            status: "PENDING",
            reason,
            comments,
            images: images || [],
        }, { transaction: t });
        // 6. Create request items
        for (const item of verifiedItems) {
            await ReturnExchangeItem.create({
                requestId: request.id,
                orderItemId: item.orderItemId,
                productId: item.productId,
                variantId: item.variantId,
                qty: item.qty,
                price: item.price,
                exchangeVariantId: item.exchangeVariantId,
            }, { transaction: t });
        }
        // 7. Update overall Order status to initial return/exchange status
        const initialOrderStatus = type === "RETURN" ? "Return Processed" : "Exchange Processed";
        await Order.update({ status: initialOrderStatus }, { where: { id: order.id }, transaction: t });
        await t.commit();
        // Send push / DB notification to the seller
        createAndSendNotification(order.sellerId, `New ${type} Request`, `A new return/exchange request #${request.id} has been submitted for order #${order.id}.`, "new_return_exchange", request.id, "seller").catch((err) => {
            console.error(`Failed to send notification to seller #${order.sellerId} for request #${request.id}:`, err);
        });
        // Reload with items
        return await ReturnExchangeRequest.findByPk(request.id, {
            include: [{ association: "items" }],
        });
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
/**
 * Get paginated list of Return & Exchange requests
 */
export const listRequests = async (userId, role, opts) => {
    const { page = 1, limit = 20, status, type } = opts;
    const where = {};
    if (role === "buyer") {
        where.userId = userId;
    }
    else if (role === "seller") {
        where.sellerId = userId;
    }
    if (status) {
        where.status = status;
    }
    if (type) {
        where.type = type;
    }
    const results = await ReturnExchangeRequest.findAndCountAll({
        where,
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
        ],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [["createdAt", "DESC"]],
        distinct: true,
    });
    return {
        items: results.rows,
        total: results.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(results.count / parseInt(limit)),
    };
};
/**
 * Get detailed Return/Exchange Request by ID
 */
export const getRequestById = async (requestId, userId, role) => {
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
    if (!request)
        return null;
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
export const updateRequestStatus = async (requestId, userId, role, newStatus) => {
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
        if (request.status !== "PENDING" && request.status !== "APPROVED") {
            throw new Error(`Cannot cancel a request that is already ${request.status}.`);
        }
    }
    else if (role === "seller") {
        if (request.sellerId != userId) {
            throw new Error("You do not have permission to update this request.");
        }
    }
    const t = await jiffy.transaction();
    try {
        const prevStatus = request.status;
        // Transition logical validation
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
        await ReturnExchangeRequest.update({ status: newStatus }, { where: { id: requestId }, transaction: t });
        // Sync order status for accepted / rejected / cancelled states
        if (newStatus === "APPROVED") {
            const orderStatus = request.type === "RETURN" ? "Return Accepted" : "Exchange Accepted";
            await Order.update({ status: orderStatus }, { where: { id: request.orderId }, transaction: t });
        }
        else if (newStatus === "REJECTED") {
            const orderStatus = request.type === "RETURN" ? "Return Rejected" : "Exchange Rejected";
            await Order.update({ status: orderStatus }, { where: { id: request.orderId }, transaction: t });
        }
        else if (newStatus === "CANCELLED") {
            // Restore overall order status to Delivered if it was return/exchange accepted
            await Order.update({ status: "Delivered" }, { where: { id: request.orderId }, transaction: t });
        }
        // Trigger business processes on completion
        if (newStatus === "COMPLETED") {
            const items = request.items || [];
            if (request.type === "RETURN") {
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
                await creditWallet({
                    userId: request.userId,
                    amount: totalRefund,
                    referenceId: String(request.orderId),
                    referenceType: "ORDER",
                    category: "REFUND",
                    description: `Refund for Return Request #${request.id} on Order #${request.orderId}`,
                }, t);
                // Update overall Order status
                await Order.update({ status: "Refund Successful" }, { where: { id: request.orderId }, transaction: t });
            }
            else if (request.type === "EXCHANGE") {
                for (const item of items) {
                    // Decrement stock of the exchange variant
                    const variant = await ProductVariant.findByPk(item.exchangeVariantId, { transaction: t });
                    if (!variant) {
                        throw new Error(`Exchange variant #${item.exchangeVariantId} not found.`);
                    }
                    if (variant.stock < item.qty) {
                        throw new Error(`Insufficient stock for exchange variant #${item.exchangeVariantId}.`);
                    }
                    await variant.update({ stock: variant.stock - item.qty }, { transaction: t });
                }
                // Update overall Order status
                await Order.update({ status: "Exchange Processed" }, { where: { id: request.orderId }, transaction: t });
            }
        }
        await t.commit();
        // Send push / DB notification to the buyer on status change
        createAndSendNotification(request.userId, "Return/Exchange Status Updated", `Your request #${request.id} status has been updated to ${newStatus}.`, "return_exchange_status_update", request.id, "buyer").catch((err) => {
            console.error(`Failed to send status update notification to buyer #${request.userId}:`, err);
        });
        return await ReturnExchangeRequest.findByPk(requestId, {
            include: [{ association: "items" }],
        });
    }
    catch (err) {
        await t.rollback();
        throw err;
    }
};
