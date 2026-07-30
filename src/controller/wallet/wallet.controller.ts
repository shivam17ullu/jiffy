import { Response } from "express";
import * as service from "../../services/wallet/wallet.service.js";
import {
  handleControllerError,
  sendError,
} from "../../middleware/responseHandler.js";

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get buyer wallet available balance
 *     description: Retrieve the active wallet and current balance of the logged-in buyer
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
export const getWalletInfo = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const wallet = await service.getOrCreateWallet(userId);
    res.json({
      success: true,
      data: {
        balance: Number(wallet.balance),
        currency: wallet.currency,
        isActive: wallet.isActive,
      },
    });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get buyer wallet transaction history
 *     description: Retrieve a paginated list of wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
export const getTransactions = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await service.getWalletTransactions(userId, page, limit);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
