import { Router } from "express";
import * as ctrl from "../controller/payment/payment.controller.js";
import { authenticate } from "../middleware/auth.js";

const paymentRouter = Router();

// Secure both checkout payment endpoints
paymentRouter.use(authenticate);

paymentRouter.post("/create-order", ctrl.createOrder);
paymentRouter.post("/verify-payment", ctrl.verifyPayment);

export default paymentRouter;
