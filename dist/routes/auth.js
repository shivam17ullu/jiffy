// src/routes/auth.routes.ts
import { Router } from "express";
import AuthController from "../controller/auth.controller";
const authRouter = Router();
authRouter.post("/send-otp", AuthController.sendOtp);
authRouter.post("/verify-otp", AuthController.verifyOtp);
authRouter.post("/refresh-token", AuthController.refreshToken);
authRouter.post("/logout", AuthController.logout);
export default authRouter;
