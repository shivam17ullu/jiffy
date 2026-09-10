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

/**
 * @swagger
 * /api/seller/operating-hours:
 *   put:
 *     summary: Update seller operating hours and days
 *     description: Update the operating days, opening time, and closing time for the authenticated seller's store
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               openingDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
 *                 description: Operating days of the week (array of strings or comma-separated string)
 *               openingTime:
 *                 type: string
 *                 example: "09:00 AM"
 *                 description: Store opening time
 *               closingTime:
 *                 type: string
 *                 example: "09:00 PM"
 *                 description: Store closing time
 *               isSellerOpen:
 *                 type: boolean
 *                 example: true
 *                 description: Whether the store is open
 *     responses:
 *       200:
 *         description: Operating hours and days updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a seller
 *       404:
 *         description: Seller profile or store not found
 */
export const updateOperatingHours = async (req: any, res: Response) => {
    try {
        const userId = req.userId;
        const store = await service.updateOperatingHours(userId, req.body);

        res.json({
            success: true,
            status: 200,
            message: "Operating hours and days updated successfully",
            response: store,
            data: store
        });
    } catch (err: unknown) {
        return handleControllerError(res, err);
    }
};

