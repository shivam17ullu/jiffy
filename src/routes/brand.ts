import { Router } from "express";
import * as ctrl from "../controller/product/brand.controller.js";

const brandRouter = Router();

// GET /api/brands - Get list of all distinct brands
brandRouter.get("/", ctrl.getBrands);

export default brandRouter;
