import { Request, Response } from "express";
import { createResponse } from "../middleware/responseHandler.js";
import StoreService from "../services/stores.service.js";

export default class StoreController {
  static async getStores(req: Request, res: Response) {
    try {
      const stores = await StoreService.getstores();

      if (!stores) {
        return createResponse(res, {status: 404, message: 'Stores not found'});
      }
       createResponse(res, {status: 200, message: 'success', response: stores});
    } catch (error: any) {
      createResponse(res, { status: 500, message: error.message });
    }
  }
}
