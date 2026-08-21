import { Router } from "express";
import BuyerCouponController from "../controller/coupon/buyer.coupon.controller.js";
import { authenticate } from "../middleware/auth.js";

const couponRouter = Router();

// Buyer can view applicable coupons (authenticated or not, depending on the requirement, but usually authenticated)
couponRouter.get("/applicable", authenticate, BuyerCouponController.listApplicable);

// Verify/Apply a coupon
couponRouter.post("/verify", authenticate, BuyerCouponController.verify);

export default couponRouter;
