import { Router } from "express";
import * as ctrl from "../controller/order/returnExchange.controller.js";
import { authenticate } from "../middleware/auth.js";

const returnRouter = Router();

// Buyer can create request
returnRouter.post("/", authenticate, ctrl.createRequest);

// List requests (Buyer/Seller/Admin filter based on role query param)
returnRouter.get("/", authenticate, ctrl.listRequests);

// Get single request details
returnRouter.get("/:id", authenticate, ctrl.getRequestById);

// Update status (Approve, Reject, Complete, Cancel)
returnRouter.patch("/:id/status", authenticate, ctrl.updateRequestStatus);

export default returnRouter;
