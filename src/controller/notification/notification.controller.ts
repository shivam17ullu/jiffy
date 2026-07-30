// src/controller/notification/notification.controller.ts
import { Response } from "express";
import { Notification } from "../../model/relations.js";
import {
  handleControllerError,
  sendError,
} from "../../middleware/responseHandler.js";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get notifications for the authenticated user
 *     description: Retrieve a paginated list of notifications for the authenticated buyer or seller.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter notifications by read status (true/false)
 *     responses:
 *       200:
 *         description: A paginated list of notifications
 *       401:
 *         description: Unauthorized
 */
export const getNotifications = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isReadQuery = req.query.isRead;

    const where: any = { userId };
    if (isReadQuery !== undefined) {
      where.isRead = isReadQuery === "true";
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Update the isRead status of a specific notification to true.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
export const markAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const notificationId = parseInt(req.params.id);

    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return sendError(res, 404, "Notification not found");
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     description: Update the isRead status of all unread notifications of the user to true.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
export const markAllAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;

    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );

    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
