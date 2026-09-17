import { Request, Response } from "express";
import crypto from "crypto";
import { Order, ReturnExchangeRequest } from "../../model/relations.js";
import { createAndSendNotification } from "../../services/notification/notification.service.js";
import { getIO } from "../../services/socket/socket.service.js";
import { processReturnExchangeWebhook } from "../../services/order/returnExchange.service.js";

/**
 * Handle incoming status updates from Delivar Webhook
 * Endpoint: POST /api/orders/webhooks/delivar
 */
export const handleDelivarWebhook = async (req: any, res: Response) => {
  try {
    const configuredSecret = process.env.DELIVAR_WEBHOOK_SECRET;

    // 1. Validate Secret Key / Signature
    const secretKeyHeader =
      req.headers["secret-key"] ||
      req.headers["x-secret-key"] ||
      req.headers["x-delivar-secret-key"];
    const signatureHeader = req.headers["x-delivar-signature"];

    if (configuredSecret) {
      const isHeaderKeyValid = secretKeyHeader === configuredSecret;
      let isSignatureValid = false;

      if (signatureHeader && req.rawBody) {
        const hash = crypto
          .createHmac("sha256", configuredSecret)
          .update(req.rawBody)
          .digest("hex");
        isSignatureValid = hash === signatureHeader;
      }

      if (!isHeaderKeyValid && !isSignatureValid) {
        console.warn("[Delivar Webhook] Unauthorized request received - Invalid Secret/Signature");
        return res
          .status(401)
          .json({ success: false, message: "Invalid secret key or signature" });
      }
    }

    const {
      booking_id,
      new_status,
      old_status,
      changed_at,
      public_tracking_id,
    } = req.body;

    // Handle "Test URL" ping from Delivar Dashboard
    if (!booking_id && (req.body?.event === "test" || !new_status)) {
      return res
        .status(200)
        .json({ success: true, message: "Delivar webhook test successful" });
    }

    if (!booking_id || !new_status) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields: booking_id and new_status" });
    }

    // 2. Acknowledge Delivar server immediately with 200 OK (< 5 seconds)
    res.status(200).json({ success: true, message: "Webhook acknowledged" });

    // 3. Process Status Asynchronously
    setImmediate(async () => {
      try {
        const order = await Order.findOne({
          where: { booking_order_id: String(booking_id) },
        });

        if (!order) {
          // Check if this booking belongs to a Return / Exchange request
          const returnReq = await ReturnExchangeRequest.findOne({
            where: { booking_order_id: String(booking_id) },
          });

          if (returnReq) {
            console.log(
              `[Delivar Webhook] Found ReturnExchangeRequest #${returnReq.id} for booking_id: ${booking_id}`
            );
            await processReturnExchangeWebhook(req.body);
            return;
          }

          console.warn(
            `[Delivar Webhook] Order or Return Request not found for booking_id: ${booking_id}`
          );
          return;
        }

        // Map Delivar rider status to your internal order status
        let targetStatus = order.status;
        const normalized = String(new_status).toLowerCase().trim();

        if (
          normalized === "assigned" ||
          normalized === "rider.assigned" ||
          normalized === "rider_assigned"
        ) {
          targetStatus = "Confirmed";
        } else if (
          normalized === "picked up" ||
          normalized === "order.picked_up" ||
          normalized === "in_transit" ||
          normalized === "in transit" ||
          normalized === "out for delivery"
        ) {
          targetStatus = "Out For Delivery";
        } else if (
          normalized === "delivered" ||
          normalized === "order.delivered"
        ) {
          targetStatus = "Delivered";
        } else if (
          normalized === "cancelled" ||
          normalized === "order.cancelled"
        ) {
          targetStatus = "Cancelled";
        }

        // Save public tracking UUID if provided
        if (public_tracking_id && !order.public_tracking_id) {
          order.public_tracking_id = public_tracking_id;
        }

        const isStatusChanged = order.status !== targetStatus;
        order.status = targetStatus;
        await order.save();

        console.log(
          `[Delivar Webhook] Order #${order.id} (Booking: ${booking_id}) updated to: ${targetStatus} (Delivar status: ${new_status})`
        );

        // 4. Real-time WebSockets to update Buyer and Seller apps instantly
        try {
          const io = getIO();
          if (io) {
            const socketData = {
              orderId: order.id,
              booking_id: order.booking_order_id,
              status: order.status,
              delivar_status: new_status,
              public_tracking_id: order.public_tracking_id,
              changed_at: changed_at || new Date().toISOString(),
            };

            io.to(`user_${order.userId}`).emit("order_status_updated", socketData);
            io.to(`user_${order.sellerId}`).emit("order_status_updated", socketData);
          }
        } catch (socketErr) {
          console.error("[Delivar Webhook] Socket broadcast error:", socketErr);
        }

        // 5. Send Push Notifications on key milestone transitions
        if (isStatusChanged) {
          if (targetStatus === "Out For Delivery") {
            await createAndSendNotification(
              order.userId,
              "Order Out for Delivery 🛵",
              `Your order #${order.id} has been picked up by the rider and is on the way!`,
              "order_status_update",
              order.id,
              "buyer"
            ).catch((e) => console.error("[Notification Error]", e));
          } else if (targetStatus === "Delivered") {
            await createAndSendNotification(
              order.userId,
              "Order Delivered 🎉",
              `Your order #${order.id} has been delivered successfully.`,
              "order_status_update",
              order.id,
              "buyer"
            ).catch((e) => console.error("[Notification Error]", e));
          } else if (targetStatus === "Cancelled") {
            await createAndSendNotification(
              order.userId,
              "Order Cancelled 🚫",
              `Your delivery for order #${order.id} was cancelled.`,
              "order_status_update",
              order.id,
              "buyer"
            ).catch((e) => console.error("[Notification Error]", e));
          }
        }
      } catch (procErr) {
        console.error(
          `[Delivar Webhook] Processing error for booking_id ${booking_id}:`,
          procErr
        );
      }
    });
  } catch (error: any) {
    console.error("[Delivar Webhook] Request error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
