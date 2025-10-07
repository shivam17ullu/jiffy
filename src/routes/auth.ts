// src/routes/auth.routes.ts
import { Router } from "express";
import AuthController from "../controller/auth.controller.js";

const authRouter = Router();

authRouter.post("/send-otp", AuthController.sendOtp);
authRouter.post("/verify-otp", AuthController.verifyOtp);
authRouter.post("/refresh-token", AuthController.refreshToken);
authRouter.post("/logout", AuthController.logout);
authRouter.post("/register-seller", AuthController.registerSeller);
authRouter.post("/verify-seller-otp", AuthController.verifySellerOtp);
authRouter.post("/onboard-seller", AuthController.onboardSeller);

export default authRouter;
