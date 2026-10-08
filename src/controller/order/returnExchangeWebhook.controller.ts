import { Response } from "express";
import crypto from "crypto";
import { processReturnExchangeWebhook } from "../../services/order/returnExchange.service.js";

/**
 * @swagger
 * /api/return-exchange/webhooks/delivar:
 *   post:
 *     summary: Handle incoming status updates from Delivar / Logistics webhook for return & exchange orders
 *     description: Public webhook endpoint authenticated via Secret Key / Signature. Updates return/exchange request delivery and returns all details.
 *     tags: [Return & Exchange]
 *     parameters:
 *       - in: header
 *         name: x-delivar-secret-key
 *         schema:
 *           type: string
 *         description: Webhook secret key
 *       - in: header
 *         name: x-delivar-signature
 *         schema:
 *           type: string
 *         description: HMAC SHA256 signature calculated using the secret key and raw request body
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               booking_id:
 *                 type: string
 *                 example: "DELIVAR_RET_12345"
 *               new_status:
 *                 type: string
 *                 example: "delivered"
 *               old_status:
 *                 type: string
 *                 example: "in_transit"
 *               changed_at:
 *                 type: string
 *                 example: "2026-09-17T14:30:00.000Z"
 *               public_tracking_id:
 *                 type: string
 *                 example: "track-uuid-98765"
 *               request_id:
 *                 type: integer
 *                 example: 12
 *               order_id:
 *                 type: integer
 *                 example: 105
 *     responses:
 *       200:
 *         description: Webhook processed successfully with all return/exchange details
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid secret key or signature
 *       404:
 *         description: Return/Exchange order not found
 *       500:
 *         description: Server error
 */
export const handleReturnExchangeWebhook = async (req: any, res: Response) => {
  try {
    // 1. Resolve body if received as text/plain or raw buffer from Delivar portal
    let payload = req.body;
    if ((!payload || Object.keys(payload).length === 0) && req.rawBody) {
      try {
        const rawStr = req.rawBody.toString("utf-8");
        payload = JSON.parse(rawStr);
      } catch {
        // Not a JSON string
      }
    }

    const {
      booking_id,
      booking_order_id,
      request_id,
      order_id,
      new_status,
      status,
      event,
    } = payload || {};

    const identifier = booking_id || booking_order_id || request_id || order_id;
    const resolvedStatus = new_status || status;

    // 2. Handle "Test URL" / Healthcheck ping from Delivar Dashboard
    const isDashboardPing =
      req.headers["origin"]?.includes("delivar.in") ||
      req.headers["sec-fetch-mode"] === "no-cors" ||
      event === "test" ||
      payload?.type === "test" ||
      (!identifier && !resolvedStatus);

    if (isDashboardPing) {
      console.log("[Return/Exchange Webhook] Test / Reachability ping acknowledged from Delivar Portal. Responding 200 OK.");
      return res.status(200).json({
        success: true,
        message: "Return/Exchange webhook test successful",
      });
    }

    // 3. Extract Secret Key from headers, query params, or body for real event payloads
    const configuredSecret = process.env.DELIVAR_WEBHOOK_SECRET?.trim();

    const secretKeyCandidate = (
      req.headers["secret-key"] ||
      req.headers["secret_key"] ||
      req.headers["secretkey"] ||
      req.headers["x-secret-key"] ||
      req.headers["x-secret"] ||
      req.headers["secret"] ||
      req.headers["x-delivar-secret-key"] ||
      req.headers["x-delivar-secret"] ||
      req.headers["api-key"] ||
      req.headers["apikey"] ||
      req.headers["x-api-key"] ||
      req.headers["x-apikey"] ||
      req.headers["x-auth-token"] ||
      req.headers["authorization"]?.replace(/^Bearer\s+/i, "") ||
      req.query?.secret_key ||
      req.query?.secretKey ||
      req.query?.secret ||
      req.query?.token ||
      payload?.secret_key ||
      payload?.secretKey ||
      payload?.secret ||
      payload?.webhook_secret
    )?.toString().trim();

    // Extract Signature from headers, query params, or body
    const signatureCandidate = (
      req.headers["signature"] ||
      req.headers["x-signature"] ||
      req.headers["x-delivar-signature"] ||
      req.headers["delivar-signature"] ||
      req.headers["x-webhook-signature"] ||
      req.headers["webhook-signature"] ||
      req.headers["x-hub-signature-256"]?.replace(/^sha256=/i, "") ||
      req.headers["x-hub-signature"]?.replace(/^sha1=/i, "") ||
      req.query?.signature ||
      payload?.signature
    )?.toString().trim();

    if (configuredSecret) {
      const isHeaderKeyValid = secretKeyCandidate && secretKeyCandidate === configuredSecret;
      let isSignatureValid = false;

      const rawPayload = req.rawBody || (typeof payload === "string" ? payload : JSON.stringify(payload));
      if (signatureCandidate && rawPayload) {
        const hash = crypto
          .createHmac("sha256", configuredSecret)
          .update(rawPayload)
          .digest("hex");
        isSignatureValid =
          hash.toLowerCase() === signatureCandidate.toLowerCase() ||
          (signatureCandidate.length === hash.length &&
            crypto.timingSafeEqual(
              Buffer.from(hash, "utf-8"),
              Buffer.from(signatureCandidate, "utf-8")
            ));
      }

      if (!isHeaderKeyValid && !isSignatureValid) {
        console.warn(
          `[Return/Exchange Webhook] Unauthorized request received - Invalid Secret/Signature.`
        );
        console.warn("[Return/Exchange Webhook Received Headers]:", JSON.stringify(req.headers, null, 2));
        console.warn("[Return/Exchange Webhook Received Body]:", JSON.stringify(payload, null, 2));
        return res
          .status(401)
          .json({ success: false, message: "Invalid secret key or signature" });
      }
    }

    if (!identifier || !resolvedStatus) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: booking_id (or request_id/order_id) and new_status (or status)",
      });
    }

    // Process Return / Exchange Webhook and get all enriched details
    const returnExchangeDetails = await processReturnExchangeWebhook(req.body);

    console.log(
      `[Return/Exchange Webhook] Request #${returnExchangeDetails?.id} (Booking: ${identifier}) updated with status: ${resolvedStatus}`
    );

    // Return complete enriched return/exchange details in response
    return res.status(200).json({
      success: true,
      message: "Return/Exchange webhook processed successfully",
      data: returnExchangeDetails,
    });
  } catch (error: any) {
    console.error("[Return/Exchange Webhook] Processing error:", error);
    const statusCode = error.message?.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error processing return/exchange webhook",
    });
  }
};

/**
 * @swagger
 * /api/return-exchange/webhook/action:
 *   post:
 *     summary: Seller webhook action to accept or reject return/exchange request
 *     tags: [Return & Exchange]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestId
 *               - action
 *             properties:
 *               requestId:
 *                 type: integer
 *                 example: 12
 *               action:
 *                 type: string
 *                 enum: [ACCEPT, REJECT, APPROVE, COMPLETE, CANCEL]
 *                 example: "ACCEPT"
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, COMPLETED, CANCELLED]
 *               sellerId:
 *                 type: integer
 *                 example: 8
 *     responses:
 *       200:
 *         description: Action processed successfully with all return/exchange details
 */
export const handleSellerReturnActionWebhook = async (req: any, res: Response) => {
  try {
    const { requestId, id, action, status, sellerId } = req.body;
    const resolvedId = parseInt(requestId || id);

    if (!resolvedId || isNaN(resolvedId)) {
      return res.status(400).json({
        success: false,
        message: "requestId is required",
      });
    }

    let targetStatus = status;
    const normalizedAction = String(action || "").toUpperCase().trim();

    if (normalizedAction === "ACCEPT" || normalizedAction === "APPROVE") {
      targetStatus = "APPROVED";
    } else if (normalizedAction === "REJECT") {
      targetStatus = "REJECTED";
    } else if (normalizedAction === "COMPLETE") {
      targetStatus = "COMPLETED";
    } else if (normalizedAction === "CANCEL") {
      targetStatus = "CANCELLED";
    }

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: "Invalid action or status. Allowed actions: ACCEPT, REJECT, APPROVE, COMPLETE, CANCEL",
      });
    }

    const effectiveUserId = sellerId || req.userId || req.user?.id || 0;
    const { updateRequestStatus } = await import("../../services/order/returnExchange.service.js");
    const updatedDetails = await updateRequestStatus(
      resolvedId,
      effectiveUserId,
      "admin",
      targetStatus
    );

    return res.status(200).json({
      success: true,
      message: `Return/Exchange request #${resolvedId} marked as ${targetStatus} successfully`,
      data: updatedDetails,
    });
  } catch (error: any) {
    console.error("[Seller Return Action Webhook Error]:", error);
    const statusCode = error.message?.includes("not found") ? 404 : 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to process return/exchange action",
    });
  }
};

