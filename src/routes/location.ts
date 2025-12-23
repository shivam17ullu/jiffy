import { Router } from "express";
import LocationController from "../controller/location.controller.js";

const locationRouter = Router();

locationRouter.post("/", LocationController.create);
locationRouter.get("/:userId", LocationController.list);
locationRouter.put("/:id", LocationController.update);
locationRouter.delete("/:id", LocationController.delete);

export default locationRouter;
