import { Router } from "express";
import * as ctrl from "../controller/payment/payment.controller.js";
import { authenticate } from "../middleware/auth.js";
const paymentRouter = Router();
// Public webhook route (not protected by JWT authentication)
paymentRouter.post("/webhook/razorpay", ctrl.razorpayWebhook);
// Secure subsequent checkout payment endpoints
paymentRouter.use(authenticate);
paymentRouter.post("/create-order", ctrl.createOrder);
paymentRouter.post("/verify-payment", ctrl.verifyPayment);
export default paymentRouter;
