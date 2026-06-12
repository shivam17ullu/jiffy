import { createResponse, handleControllerError, sendError, } from "../middleware/responseHandler.js";
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
    static async getStores(req, res) {
        try {
            const { zipCode, storeCategory } = req.query;
            const stores = await StoreService.getstores(zipCode, storeCategory);
            if (!stores || (Array.isArray(stores) && stores.length === 0)) {
                return sendError(res, 404, "No stores found");
            }
            const formattedStores = stores.map((store) => {
                const storeData = store.toJSON();
                if (storeData.Document) {
                    storeData.store_image = storeData.Document.storeImageUrl;
                    delete storeData.Document; // optional: clean up the nested object
                }
                else {
                    storeData.store_image = null;
                }
                return storeData;
            });
            createResponse(res, {
                status: 200,
                message: "Stores retrieved successfully",
                response: formattedStores,
            });
        }
        catch (error) {
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
    static async getStoreById(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return sendError(res, 400, "Invalid store/seller ID");
            }
            const store = await StoreService.getStoreById(id);
            if (!store) {
                return sendError(res, 404, "Store/seller profile not found");
            }
            createResponse(res, {
                status: 200,
                message: "Store/seller profile retrieved successfully",
                response: store,
            });
        }
        catch (error) {
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
    static async updateStoreStatus(req, res) {
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
        }
        catch (error) {
            return handleControllerError(res, error, 500);
        }
    }
}
