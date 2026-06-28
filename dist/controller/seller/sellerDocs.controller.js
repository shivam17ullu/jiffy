import * as service from '../../services/seller/sellerDocs.service.js';
import { handleControllerError } from "../../middleware/responseHandler.js";
/**
 * @swagger
 * /api/seller/docs:
 *   get:
 *     summary: Get seller uploaded documents
 *     description: Retrieve the uploaded documents for the currently authenticated seller
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a seller
 *       404:
 *         description: Documents not found
 */
export const getDocs = async (req, res) => {
    try {
        const userId = req.userId;
        const docs = await service.getSellerDocs(userId);
        if (!docs) {
            return res.status(404).json({ success: false, message: "Documents not found" });
        }
        res.json({ success: true, data: docs });
    }
    catch (err) {
        return handleControllerError(res, err);
    }
};
/**
 * @swagger
 * /api/seller/reupload-docs:
 *   post:
 *     summary: Reupload seller documents after rejection
 *     description: Reupload Aadhaar ID, PAN Card, GST Certificate, and Store Document in one go.
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
 *               aadhaarUrl:
 *                 type: string
 *                 description: Base64 data URI or existing URL for Aadhaar
 *               panUrl:
 *                 type: string
 *                 description: Base64 data URI or existing URL for PAN
 *               gstUrl:
 *                 type: string
 *                 description: Base64 data URI or existing URL for GST Certificate
 *               storeDocUrl:
 *                 type: string
 *                 description: Base64 data URI or existing URL for Store Document
 *     responses:
 *       200:
 *         description: Documents reuploaded successfully, status pending, is_active false
 *       400:
 *         description: Bad Request - Seller not rejected or invalid data
 *       404:
 *         description: Seller profile not found
 */
export const reuploadDocs = async (req, res) => {
    try {
        const userId = req.userId;
        const result = await service.reuploadSellerDocs(userId, req.body);
        res.json({ success: true, ...result });
    }
    catch (err) {
        return handleControllerError(res, err);
    }
};
