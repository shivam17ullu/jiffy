import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { sendError } from "../../middleware/responseHandler.js";

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

    // Return success only if signatures match
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (err: any) {
    console.error("Razorpay Signature Verification Error:", err);
    return sendError(res, 500, err.message || "Internal server error during signature verification");
  }
};
