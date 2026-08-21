import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendError } from "../../middleware/responseHandler.js";
import { Order } from "../../model/relations.js";
import { Op } from "sequelize";

// Initialize Razorpay SDK instance
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) must be set in environment variables.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Helper to update order payment verification status and info
 */
export const confirmOrderPayment = async (
  orderIdOrReceipt: string | undefined,
  razorpayOrderId: string,
  paymentId: string,
  signature: string
) => {
  const matchedOrders: Order[] = [];

  // Strategy 1: Find by order ID(s) parsed from receipt/ID parameter
  if (orderIdOrReceipt) {
    const matches = orderIdOrReceipt.match(/\d+/g);
    if (matches && matches.length > 0) {
      const orderIds = matches.map(m => parseInt(m)).filter(id => !isNaN(id));
      if (orderIds.length > 0) {
        const orders = await Order.findAll({
          where: { id: { [Op.in]: orderIds } }
        });
        matchedOrders.push(...orders);
      }
    }
  }

  // Strategy 2: Search for any order with paymentInfo containing the razorpay_order_id
  if (matchedOrders.length === 0 && razorpayOrderId) {
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          {
            paymentInfo: {
              razorpay_order_id: razorpayOrderId
            }
          },
          {
            paymentInfo: {
              order_id: razorpayOrderId
            }
          }
        ]
      }
    });
    matchedOrders.push(...orders);
  }

  // Strategy 3: Search for any order with paymentInfo containing the paymentId/payment_id
  if (matchedOrders.length === 0 && paymentId) {
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          {
            paymentInfo: {
              paymentId: paymentId
            }
          },
          {
            paymentInfo: {
              payment_id: paymentId
            }
          },
          {
            paymentInfo: {
              razorpay_payment_id: paymentId
            }
          }
        ]
      }
    });
    matchedOrders.push(...orders);
  }

  // Fallback: Search all 'created' orders in memory to inspect JSON paymentInfo directly
  if (matchedOrders.length === 0) {
    const createdOrders = await Order.findAll({
      where: { status: "created" }
    });
    for (const o of createdOrders) {
      const info = o.paymentInfo;
      if (info && typeof info === "object") {
        if (
          (razorpayOrderId && (info.razorpay_order_id === razorpayOrderId || info.order_id === razorpayOrderId)) ||
          (paymentId && (info.paymentId === paymentId || info.payment_id === paymentId || info.razorpay_payment_id === paymentId))
        ) {
          matchedOrders.push(o);
        }
      }
    }
  }

  if (matchedOrders.length === 0) {
    console.warn(`No orders found to update for receipt/ID: ${orderIdOrReceipt}, razorpayOrderId: ${razorpayOrderId}`);
    return [];
  }

  const razorpay = getRazorpayInstance();
  let paymentMethod = "Online";
  let paymentDetails: any = null;

  if (paymentId) {
    try {
      paymentDetails = await razorpay.payments.fetch(paymentId);
      if (paymentDetails && paymentDetails.method) {
        const rawMethod = paymentDetails.method;
        paymentMethod = rawMethod.toUpperCase();
        
        if (rawMethod === "upi" && paymentDetails.vpa) {
          paymentMethod = `UPI (${paymentDetails.vpa})`;
        } else if (rawMethod === "card" && paymentDetails.card?.network) {
          paymentMethod = `Card (${paymentDetails.card.network})`;
        } else if (rawMethod === "wallet" && paymentDetails.wallet) {
          paymentMethod = `Wallet (${paymentDetails.wallet})`;
        } else if (rawMethod === "netbanking" && paymentDetails.bank) {
          paymentMethod = `Netbanking (${paymentDetails.bank})`;
        }
      }
    } catch (err) {
      console.error(`Failed to fetch payment details for paymentId ${paymentId}:`, err);
    }
  }

  const updatedOrders: Order[] = [];
  for (const order of matchedOrders) {
    const validStatuses = ["created", "confirmed", "processing", "shipped", "out for delivery"];
    const currentStatusLower = (order.status || "").toLowerCase();
    if (validStatuses.includes(currentStatusLower)) {
      if (currentStatusLower === "created") {
        order.status = "confirmed";
      }
      
      const currentInfo = typeof order.paymentInfo === "object" ? order.paymentInfo : {};
      order.paymentInfo = {
        ...currentInfo,
        mode: "Online",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: "captured",
        method: paymentMethod,
        payment_verified_at: new Date().toISOString()
      };
      
      order.changed('paymentInfo', true);
      await order.save();
      updatedOrders.push(order);
      console.log(`Order ID ${order.id} payment info updated (status: ${order.status}).`);
    } else {
      console.log(`Order ID ${order.id} is already in status: ${order.status}. Skipping status/payment update.`);
      updatedOrders.push(order);
    }
  }

  return updatedOrders;
};

/**
 * Helper to update order payment failure info in database
 */
export const handleOrderPaymentFailure = async (
  orderIdOrReceipt: string | undefined,
  razorpayOrderId: string,
  paymentId: string,
  errorCode?: string,
  errorDesc?: string
) => {
  const matchedOrders: Order[] = [];

  // Strategy 1: Find by order ID(s) parsed from receipt/ID parameter
  if (orderIdOrReceipt) {
    const matches = orderIdOrReceipt.match(/\d+/g);
    if (matches && matches.length > 0) {
      const orderIds = matches.map(m => parseInt(m)).filter(id => !isNaN(id));
      if (orderIds.length > 0) {
        const orders = await Order.findAll({
          where: { id: { [Op.in]: orderIds } }
        });
        matchedOrders.push(...orders);
      }
    }
  }

  // Strategy 2: Search for any order with paymentInfo containing the razorpay_order_id
  if (matchedOrders.length === 0 && razorpayOrderId) {
    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          {
            paymentInfo: {
              razorpay_order_id: razorpayOrderId
            }
          },
          {
            paymentInfo: {
              order_id: razorpayOrderId
            }
          }
        ]
      }
    });
    matchedOrders.push(...orders);

    // Fallback: Search all 'created' orders in memory to inspect JSON paymentInfo directly
    if (matchedOrders.length === 0) {
      const createdOrders = await Order.findAll({
        where: { status: "created" }
      });
      for (const o of createdOrders) {
        const info = o.paymentInfo;
        if (info && typeof info === "object") {
          if (
            info.razorpay_order_id === razorpayOrderId ||
            info.order_id === razorpayOrderId
          ) {
            matchedOrders.push(o);
          }
        }
      }
    }
  }

  const updatedOrders: Order[] = [];
  for (const order of matchedOrders) {
    if (order.status === "created") {
      const currentInfo = typeof order.paymentInfo === "object" ? order.paymentInfo : {};
      order.paymentInfo = {
        ...currentInfo,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        status: "failed",
        error_code: errorCode,
        error_description: errorDesc,
        payment_failed_at: new Date().toISOString()
      };
      
      await order.save();
      updatedOrders.push(order);
      console.log(`Order ID ${order.id} payment failure logged.`);
    }
  }

  return updatedOrders;
};

/**
 * Create order endpoint
 * POST /api/create-order
 */
export const createOrder = async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body.amount);
    
    // Validate amount >= 100 paise
    if (isNaN(amount) || amount < 100) {
      return sendError(res, 400, "Amount is required and must be at least 100 paise");
    }

    const currency = "INR"; // Currency always will be rupees (INR)
    const receipt = req.body.receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const razorpay = getRazorpayInstance();
    
    // Call Razorpay API: POST https://api.razorpay.com/v1/orders
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });

    // Return: { order_id, amount, currency }
    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("Razorpay Create Order Error:", err);
    
    // Handle auth failures specifically (e.g. invalid key/secret returned by Razorpay API)
    if (err.statusCode === 401) {
      return sendError(res, 401, "Razorpay authentication failed. Invalid API credentials.");
    }

    // Handle other Razorpay API errors (return 500)
    return sendError(res, 500, err.message || "Failed to create order with Razorpay");
  }
};

/**
 * Verify Payment Signature endpoint
 * POST /api/verify-payment
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const order_id = req.body.order_id || req.body.razorpay_order_id;
    const payment_id = req.body.payment_id || req.body.razorpay_payment_id;
    const razorpay_signature = req.body.signature || req.body.razorpay_signature;
    const receipt = req.body.receipt;

    // Missing fields: return 400
    if (!order_id || !payment_id || !razorpay_signature) {
      return sendError(res, 400, "Missing required fields. order_id, payment_id, and signature are required.");
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return sendError(res, 500, "Razorpay credentials are not configured on the server.");
    }

    // Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const generated_signature = crypto
      .createHmac("sha256", keySecret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    // Compare generated signature with razorpay_signature
    if (generated_signature !== razorpay_signature) {
      // Signature mismatch: return 400, do NOT mark as paid
      return sendError(res, 400, "Payment signature verification failed. Signature mismatch.");
    }

    // Confirm payment status update in database
    const updatedOrders = await confirmOrderPayment(
      receipt || order_id,
      order_id,
      payment_id,
      razorpay_signature
    );

    // Return success only if signatures match
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: updatedOrders.map(o => ({ id: o.id, status: o.status }))
    });
  } catch (err: any) {
    console.error("Razorpay Signature Verification Error:", err);
    return sendError(res, 500, err.message || "Internal server error during signature verification");
  }
};

/**
 * Razorpay Webhook endpoint
 * POST /api/webhook/razorpay
 */
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      return sendError(res, 400, "Webhook signature missing.");
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return sendError(res, 500, "Razorpay Webhook secret is not configured on the server.");
    }

    // Verify webhook signature using the raw body Buffer if available, fallback to req.body string representation
    const payload = (req as any).rawBody ? (req as any).rawBody.toString("utf8") : JSON.stringify(req.body);

    const generated_signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");

    if (generated_signature !== signature) {
      console.error("Razorpay Webhook Signature verification failed.");
      return sendError(res, 400, "Webhook signature verification failed.");
    }

    const eventData = req.body;
    console.log(`Razorpay Webhook Event Received: ${eventData.event}`);

    // Listen to order.paid or payment.captured
    if (eventData.event === "order.paid" || eventData.event === "payment.captured") {
      const paymentEntity = eventData.payload?.payment?.entity;
      const orderEntity = eventData.payload?.order?.entity;

      const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const receipt = orderEntity?.receipt;

      if (razorpayOrderId && paymentId) {
        await confirmOrderPayment(
          receipt || razorpayOrderId,
          razorpayOrderId,
          paymentId,
          signature
        );
      }
    } else if (eventData.event === "payment.failed") {
      const paymentEntity = eventData.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const errorCode = paymentEntity?.error_code;
      const errorDesc = paymentEntity?.error_description;

      if (razorpayOrderId && paymentId) {
        await handleOrderPaymentFailure(
          razorpayOrderId,
          razorpayOrderId,
          paymentId,
          errorCode,
          errorDesc
        );
      }
    }

    // Always respond with 200 to acknowledge receipt of webhook
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Razorpay Webhook Error:", err);
    return sendError(res, 500, err.message || "Internal server error during webhook handling");
  }
};
