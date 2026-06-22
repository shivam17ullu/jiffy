import { Response } from "express";
import { handleControllerError } from "../../middleware/responseHandler.js";
import * as service from '../../services/seller/sellerProfile.service.js';

/**
 * @swagger
 * /api/seller/status:
 *   get:
 *     summary: Get seller status
 *     description: Retrieve the approval status and rejection reason (if any) of the currently authenticated seller
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller status retrieved successfully
 *       404:
 *         description: Seller profile not found
 */
export const getStatus = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const statusData = await service.getSellerStatus(userId);
        
        if (!statusData) {
            return handleControllerError(res, new Error("Seller profile not found"), 404);
        }

        res.json({ success: true, data: statusData });
    } catch (err: unknown) {
        return handleControllerError(res, err);
    }
};
