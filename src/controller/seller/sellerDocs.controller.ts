import * as service from '../../services/seller/sellerDocs.service.js';
import { Response } from "express";
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
export const getDocs = async (req: any, res: Response) => {
  try {
    const userId = req.userId;
    const docs = await service.getSellerDocs(userId);
    
    if (!docs) {
      return res.status(404).json({ success: false, message: "Documents not found" });
    }

    res.json({ success: true, data: docs });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
