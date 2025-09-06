// src/routes/auth.routes.ts
import { Router } from "express";
import BuyerProfileController from "../controller/profile.controller";
const profileRouter = Router();
profileRouter.get("/:id", BuyerProfileController.getProfile);
profileRouter.post("/setup", BuyerProfileController.createOrUpdate);
export default profileRouter;
