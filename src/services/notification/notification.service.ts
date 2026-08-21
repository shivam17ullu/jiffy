// src/services/notification/notification.service.ts
import { Notification, UserDevice } from "../../model/relations.js";
import axios from "axios";
import { App, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "fs";
import path from "path";

let sellerApp: App | undefined;
let buyerApp: App | undefined;

// Initialize Seller Firebase App
try {
  const sellerKeyPath = path.resolve(process.cwd(), "src/config/sellerServiceAccountKey.json");
  const sellerServiceAccount = JSON.parse(readFileSync(sellerKeyPath, "utf8"));
  sellerApp = initializeApp({
    credential: cert(sellerServiceAccount),
  }, 'seller');
  console.log("[Firebase] Seller App initialized successfully.");
} catch (error) {
  console.error("[Firebase] Failed to initialize Seller App:", error);
}

// Initialize Buyer Firebase App
try {
  const buyerKeyPath = path.resolve(process.cwd(), "src/config/buyerServiceAccountKey.json");
  const buyerServiceAccount = JSON.parse(readFileSync(buyerKeyPath, "utf8"));
  buyerApp = initializeApp({
    credential: cert(buyerServiceAccount),
  }, 'buyer');
  console.log("[Firebase] Buyer App initialized successfully.");
} catch (error) {
  // If the buyer config doesn't exist, log a warning but don't crash.
  console.error("[Firebase] Failed to load Buyer config. Error:", error);
  console.log("[Firebase] Buyer specific config not found, will attempt to fallback to Seller config if they share the same project.");
}

/**
 * Send push notification to devices via FCM
 * @param tokens - FCM device tokens
 * @param title - Notification title
 * @param body - Notification body/message
 * @param data - Optional custom payload
 * @param role - Optional role ('buyer' or 'seller') to target specific firebase app configuration
 */
export const sendFcmPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: any,
  role?: string
) => {
  if (!tokens || tokens.length === 0) {
    return;
  }

  // Determine which Firebase App to use
  let appToUse: App | undefined;
  if (role === "buyer") {
    appToUse = buyerApp || sellerApp; // Fallback to sellerApp if they share the project
  } else {
    appToUse = sellerApp;
  }

  if (appToUse) {
    try {
      console.log(`[Push Notification] Attempting to send push to ${tokens.length} devices via Firebase Admin SDK (${role || "unknown"})...`);
      const messaging = getMessaging(appToUse);
      const payload = {
        tokens,
        notification: {
          title,
          body,
        },
        data: data || {},
      };
      const response = await messaging.sendEachForMulticast(payload);
      console.log(
        `[Push Notification] Successfully sent via Firebase Admin SDK. Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];

        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            console.error(`[Push Notification] Failed to send to token ${tokens[idx]}:`, resp.error?.message || resp.error);

            if (
              resp.error?.code === "messaging/registration-token-not-registered" ||
              resp.error?.code === "messaging/invalid-registration-token"
            ) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          try {
            await UserDevice.destroy({
              where: { fcmToken: invalidTokens }
            });
            console.log(`[Push Notification] Automatically removed ${invalidTokens.length} invalid tokens from database.`);
          } catch (dbError) {
            console.error("[Push Notification] Failed to remove invalid tokens from database:", dbError);
          }
        }
      }
    } catch (error: any) {
      console.error(
        "[Push Notification] Failed to send push via Firebase Admin SDK:",
        error?.message || error
      );
    }
  } else {
    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (fcmServerKey) {
      try {
        console.log(`[Push Notification] Attempting to send push to ${tokens.length} devices via FCM Legacy...`);
        const payload: any = {
          notification: {
            title,
            body,
            sound: "default",
          },
          data: data || {},
        };

        if (tokens.length === 1) {
          payload.to = tokens[0];
        } else {
          payload.registration_ids = tokens;
        }

        await axios.post("https://fcm.googleapis.com/fcm/send", payload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${fcmServerKey}`,
          },
        });
        console.log(`[Push Notification] Successfully sent to ${tokens.length} devices.`);
      } catch (error: any) {
        console.error(
          "[Push Notification] Failed to send push via FCM Legacy:",
          error?.response?.data || error?.message
        );
      }
    } else {
      console.log(
        `[Push Notification] (Simulated) Sent push to ${tokens.length} devices. Role: "${role || "any"}", Title: "${title}", Body: "${body}"`
      );
    }
  }
};

/**
 * Create a database notification and send a push notification to registered user devices
 * @param userId - Recipient user ID
 * @param title - Notification title
 * @param message - Notification message
 * @param type - Notification type (e.g. 'new_order', 'order_status_update')
 * @param relatedId - Optional reference ID (e.g., order ID)
 * @param role - Optional role ('buyer' or 'seller') to target specific devices
 */
export const createAndSendNotification = async (
  userId: number,
  title: string,
  message: string,
  type: string,
  relatedId?: number,
  role?: string
) => {
  try {
    // 1. Create database notification record
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      relatedId,
      isRead: false,
    });

    // 2. Fetch active device tokens for the user
    const whereClause: any = { userId };
    if (role) {
      whereClause.role = role;
    }

    const devices = await UserDevice.findAll({
      where: whereClause,
      attributes: ["fcmToken"],
    });

    const fcmTokens = devices
      .map((d) => d.fcmToken)
      .filter((token) => !!token);

    // 3. Send FCM push notification if tokens are found
    if (fcmTokens.length > 0) {
      const dataPayload = {
        type,
        relatedId: relatedId ? String(relatedId) : "",
        order_id: relatedId ? String(relatedId) : "",
      };
      await sendFcmPushNotification(fcmTokens, title, message, dataPayload, role);
    } else {
      console.log(
        `[Notification] No user devices found with role '${role || "any"}' for user ID ${userId}. Saved database notification only.`
      );
    }

    return notification;
  } catch (error) {
    console.error("[Notification] Failed to create or send notification:", error);
    throw error;
  }
};
