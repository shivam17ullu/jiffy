import { Router } from "express";
import * as ctrl from "../controller/order/returnExchange.controller.js";
import {
  handleReturnExchangeWebhook,
  handleSellerReturnActionWebhook,
} from "../controller/order/returnExchangeWebhook.controller.js";
import { authenticate } from "../middleware/auth.js";

const returnRouter = Router();

// Webhook endpoints for Delivar / 3rd-party logistics return & exchange status updates
returnRouter.post("/webhooks/delivar", handleReturnExchangeWebhook);
returnRouter.post("/webhook", handleReturnExchangeWebhook);

// Webhook endpoints for seller actions (accept / reject)
returnRouter.post("/webhook/action", handleSellerReturnActionWebhook);
returnRouter.post("/webhooks/action", handleSellerReturnActionWebhook);
returnRouter.post("/webhooks/accept", handleSellerReturnActionWebhook);
returnRouter.post("/webhooks/reject", handleSellerReturnActionWebhook);

// Buyer can create request
returnRouter.post("/", authenticate, ctrl.createRequest);

// List requests (Buyer/Seller/Admin filter based on role query param)
returnRouter.get("/", authenticate, ctrl.listRequests);

// Get single request details
returnRouter.get("/:id", authenticate, ctrl.getRequestById);

// Update status (Approve, Reject, Complete, Cancel)
returnRouter.patch("/:id/status", authenticate, ctrl.updateRequestStatus);

// Store or update return/exchange booking and tracking details (Buyer, Seller, Admin)
returnRouter.post("/:id/tracking", authenticate, ctrl.updateTrackingDetails);
returnRouter.patch("/:id/tracking", authenticate, ctrl.updateTrackingDetails);
returnRouter.put("/:id/tracking", authenticate, ctrl.updateTrackingDetails);
returnRouter.post("/:id/booking-details", authenticate, ctrl.updateTrackingDetails);
returnRouter.patch("/:id/booking-details", authenticate, ctrl.updateTrackingDetails);
returnRouter.put("/:id/booking-details", authenticate, ctrl.updateTrackingDetails);

export default returnRouter;

