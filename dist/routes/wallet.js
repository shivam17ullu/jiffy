import { Router } from "express";
import * as ctrl from "../controller/wallet/wallet.controller.js";
import { authenticate } from "../middleware/auth.js";
const walletRouter = Router();
// Protect all wallet routes with JWT verification
walletRouter.use(authenticate);
walletRouter.get("/", ctrl.getWalletInfo);
walletRouter.get("/transactions", ctrl.getTransactions);
export default walletRouter;
