// src/services/notification/notification.service.ts
import { Notification, UserDevice } from "../../model/relations.js";
import axios from "axios";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { readFileSync } from "fs";
let sellerApp;
try {
    const sellerServiceAccount = JSON.parse(readFileSync(new URL("../../config/sellerServiceAccountKey.json", import.meta.url), "utf8"));
    sellerApp = initializeApp({
        credential: cert(sellerServiceAccount),
    }, 'seller');
    console.log("[Firebase] Seller App initialized successfully.");
}
catch (error) {
    console.error("[Firebase] Failed to initialize Seller App:", error);
}
/**
 * Send push notification to devices via FCM
 * @param tokens - FCM device tokens
 * @param title - Notification title
 * @param body - Notification body/message
 * @param data - Optional custom payload
 * @param role - Optional role ('buyer' or 'seller') to target specific firebase app configuration
 */
export const sendFcmPushNotification = async (tokens, title, body, data, role) => {
    if (!tokens || tokens.length === 0) {
        return;
    }
    if (role === "seller" && sellerApp) {
        try {
            console.log(`[Push Notification] Attempting to send push to ${tokens.length} devices via Firebase Admin SDK (Seller)...`);
            const messaging = getMessaging(sellerApp);
            const payload = {
                tokens,
                notification: {
                    title,
                    body,
                },
                data: data || {},
            };
            const response = await messaging.sendEachForMulticast(payload);
            console.log(`[Push Notification] Successfully sent via Firebase Admin SDK. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`[Push Notification] Failed to send to token ${tokens[idx]}:`, resp.error);
                    }
                });
            }
        }
        catch (error) {
            console.error("[Push Notification] Failed to send push via Firebase Admin SDK:", error?.message || error);
        }
    }
    else {
        const fcmServerKey = process.env.FCM_SERVER_KEY;
        if (fcmServerKey) {
            try {
                console.log(`[Push Notification] Attempting to send push to ${tokens.length} devices via FCM Legacy...`);
                const payload = {
                    notification: {
                        title,
                        body,
                        sound: "default",
                    },
                    data: data || {},
                };
                if (tokens.length === 1) {
                    payload.to = tokens[0];
                }
                else {
                    payload.registration_ids = tokens;
                }
                await axios.post("https://fcm.googleapis.com/fcm/send", payload, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `key=${fcmServerKey}`,
                    },
                });
                console.log(`[Push Notification] Successfully sent to ${tokens.length} devices.`);
            }
            catch (error) {
                console.error("[Push Notification] Failed to send push via FCM Legacy:", error?.response?.data || error?.message);
            }
        }
        else {
            console.log(`[Push Notification] (Simulated) Sent push to ${tokens.length} devices. Role: "${role || "any"}", Title: "${title}", Body: "${body}"`);
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
export const createAndSendNotification = async (userId, title, message, type, relatedId, role) => {
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
        const whereClause = { userId };
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
            };
            await sendFcmPushNotification(fcmTokens, title, message, dataPayload, role);
        }
        else {
            console.log(`[Notification] No user devices found with role '${role || "any"}' for user ID ${userId}. Saved database notification only.`);
        }
        return notification;
    }
    catch (error) {
        console.error("[Notification] Failed to create or send notification:", error);
        throw error;
    }
};
