// src/routes/auth.routes.ts
import { Router } from "express";
import StoreController from "../controller/stores.controller.js";

const storeRouter = Router();

storeRouter.get("/list", StoreController.getStores);

export default storeRouter;
