import { Request, Response } from "express";
import { createResponse } from "../middleware/responseHandler.js";
import StoreService from "../services/stores.service.js";

export default class StoreController {
  /**
   * @swagger
   * /api/stores/list:
   *   get:
   *     summary: Get list of verified stores
   *     description: Get all verified and active seller stores
   *     tags: [Stores]
   *     responses:
   *       200:
   *         description: List of verified stores
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: integer
   *                 message:
   *                   type: string
   *                 response:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       businessName:
   *                         type: string
   *                       city:
   *                         type: string
   *                       state:
   *                         type: string
   *       404:
   *         description: No stores found
   */
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
