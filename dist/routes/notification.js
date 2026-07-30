// src/routes/notification.ts
import { Router } from "express";
import * as ctrl from "../controller/notification/notification.controller.js";
import { authenticate } from "../middleware/auth.js";
const notificationRouter = Router();
// Retrieve user's notifications
notificationRouter.get("/", authenticate, ctrl.getNotifications);
// Mark all notifications as read
notificationRouter.post("/read-all", authenticate, ctrl.markAllAsRead);
// Mark single notification as read
notificationRouter.patch("/:id/read", authenticate, ctrl.markAsRead);
export default notificationRouter;
