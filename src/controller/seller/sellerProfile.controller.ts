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

/**
 * @swagger
 * /api/seller/profile:
 *   get:
 *     summary: Get complete seller profile
 *     description: Retrieve all details of the authenticated seller including profile, store, bank details, documents, and verification status.
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a seller
 *       404:
 *         description: Seller profile not found
 */
export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const profileData = await service.getSellerProfile(userId);
        
        if (!profileData) {
            return handleControllerError(res, new Error("Seller profile not found"), 404);
        }

        res.json({
            success: true,
            status: 200,
            message: "Seller profile retrieved successfully",
            response: profileData,
            data: profileData
        });
    } catch (err: unknown) {
        return handleControllerError(res, err);
    }
};

