import { Router } from "express";
import StoreController from "../controller/stores.controller.js";
import { authenticate } from "../middleware/auth.js";

const storeRouter = Router();

storeRouter.get("/list", StoreController.getStores);
storeRouter.get("/:id", authenticate, StoreController.getStoreById);
storeRouter.patch("/:id/status", authenticate, StoreController.updateStoreStatus);
storeRouter.patch("/:id/operating-hours", authenticate, StoreController.updateStoreOperatingHours);
storeRouter.put("/:id/operating-hours", authenticate, StoreController.updateStoreOperatingHours);

export default storeRouter;

