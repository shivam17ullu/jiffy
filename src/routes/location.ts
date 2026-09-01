import { Router } from "express";
import LocationController from "../controller/location.controller.js";
import { optionalAuthenticate } from "../middleware/auth.js";

const locationRouter = Router();

locationRouter.post("/", optionalAuthenticate, LocationController.create);
locationRouter.get("/:userId", optionalAuthenticate, LocationController.list);
locationRouter.put("/:id", optionalAuthenticate, LocationController.update);
locationRouter.delete("/:id", optionalAuthenticate, LocationController.delete);

export default locationRouter;
