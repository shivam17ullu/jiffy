import { Request, Response } from "express";
import {
  createResponse,
  handleControllerError,
  sendError,
} from "../middleware/responseHandler.js";
import StoreService from "../services/stores.service.js";

export default class StoreController {
  /**
   * @swagger
   * /api/stores/list:
   *   get:
   *     summary: Get list of verified stores
   *     description: Get all verified and active seller stores with optional filtering by zip code, store category, and geo coordinates
   *     tags: [Stores]
   *     parameters:
   *       - in: query
   *         name: zipCode
   *         schema:
   *           type: string
   *         description: Pincode / ZipCode filter
   *       - in: query
   *         name: storeCategory
   *         schema:
   *           type: string
   *         description: "Filter by store category (e.g. 'Men', 'Women', 'Kids', 'All', or comma-separated 'Men,Women')"
   *       - in: query
   *         name: lat
   *         schema:
   *           type: number
   *         description: User latitude
   *       - in: query
   *         name: lng
   *         schema:
   *           type: number
   *         description: User longitude
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
      const zipCode = (req.query.zipCode || req.query.pincode) as string | undefined;
      const storeCategory = (req.query.storeCategory || req.query.category) as string | string[] | undefined;

      const rawLat = req.query.lat ?? req.query.latitude;
      const rawLng = req.query.lng ?? req.query.longitude ?? req.query.long;

      const latNum = rawLat !== undefined && rawLat !== '' ? parseFloat(rawLat as string) : undefined;
      const lngNum = rawLng !== undefined && rawLng !== '' ? parseFloat(rawLng as string) : undefined;

      const stores = await StoreService.getstores(zipCode, storeCategory, latNum, lngNum);

      if (!stores || (Array.isArray(stores) && stores.length === 0)) {
        return createResponse(res, {
          status: 200,
          message: "No stores found",
          response: [],
        });
      }

      const formattedStores = stores.map((store: any) => {
        const storeData = store.toJSON();
        if (storeData.Document) {
          storeData.store_image = storeData.Document.storeImageUrl;
          delete storeData.Document; // optional: clean up the nested object
        } else {
          storeData.store_image = null;
        }

        const firstStore = storeData.Stores?.[0] || storeData.Store || null;
        if (firstStore && typeof firstStore.storeCategory === "string") {
          try {
            firstStore.storeCategory = JSON.parse(firstStore.storeCategory);
          } catch {
            firstStore.storeCategory = [firstStore.storeCategory];
          }
        }
        storeData.store = firstStore;
        storeData.Store = firstStore;
        if (firstStore) {
          storeData.distanceKm = firstStore.distanceKm;
          storeData.estimatedTimeMins = firstStore.estimatedTimeMins;
          storeData.isSellerOpen = firstStore.isSellerOpen;
        }

        return storeData;
      });

      createResponse(res, {
        status: 200,
        message: "Stores retrieved successfully",
        response: formattedStores,
      });
    } catch (error: unknown) {
      return handleControllerError(res, error, 500);
    }
  }

  /**
   * @swagger
   * /api/stores/{id}:
   *   get:
   *     summary: Get seller profile by ID
   *     description: Get seller store profile and user details using seller profile ID
   *     tags: [Stores]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Seller profile ID
   *     responses:
   *       200:
   *         description: Store/seller profile retrieved successfully
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
   *                   type: object
   *       400:
   *         description: Invalid store/seller ID
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Store/seller profile not found
   */
  static async getStoreById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return sendError(res, 400, "Invalid store/seller ID");
      }

      const store = await StoreService.getStoreById(id);

      if (!store) {
        return sendError(res, 404, "Store/seller profile not found");
      }

      const storeData = store.toJSON() as any;
      storeData.store = storeData.Stores?.[0] || storeData.Store || null;
      storeData.Store = storeData.Store || storeData.Stores?.[0] || null;

      createResponse(res, {
        status: 200,
        message: "Store/seller profile retrieved successfully",
        response: storeData,
      });
    } catch (error: unknown) {
      return handleControllerError(res, error, 500);
    }
  }

  /**
   * @swagger
   * /api/stores/{id}/status:
   *   patch:
   *     summary: Enable or disable a store
   *     description: Update the active status of a store by its ID
   *     tags: [Stores]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Store ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               isSellerOpen:
   *                 type: boolean
   *                 description: The new status of the store (true for open, false for closed)
   *             required:
   *               - isSellerOpen
   *     responses:
   *       200:
   *         description: Store status updated successfully
   *       400:
   *         description: Invalid store ID or request body
   *       401:
   *         description: Unauthorized
   *       404:
   *         description: Store not found
   *       500:
   *         description: Internal server error
   */
  static async updateStoreStatus(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { isSellerOpen } = req.body;

      if (isNaN(id)) {
        return sendError(res, 400, "Invalid store ID");
      }

      if (typeof isSellerOpen !== "boolean") {
        return sendError(res, 400, "isSellerOpen must be a boolean value");
      }

      const store = await StoreService.updateStoreStatus(id, isSellerOpen);

      if (!store) {
        return sendError(res, 404, "Store not found");
      }

      createResponse(res, {
        status: 200,
        message: "Store status updated successfully",
        response: store,
      });
    } catch (error: unknown) {
      return handleControllerError(res, error, 500);
    }
  }
}

