import * as service from '../../services/seller/sellerStats.service.js';
import { Request, Response } from "express";

/**
 * @swagger
 * /api/seller/stats:
 *   get:
 *     summary: Get seller dashboard statistics
 *     description: Get comprehensive statistics for seller dashboard including products, orders, revenue, and low stock alerts
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seller statistics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalProducts:
 *                           type: integer
 *                         activeProducts:
 *                           type: integer
 *                         inactiveProducts:
 *                           type: integer
 *                         totalOrders:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                     ordersByStatus:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     recentOrders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           total:
 *                             type: number
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           buyer:
 *                             type: object
 *                     lowStockProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           variants:
 *                             type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a seller
 */
export const getStats = async (req: any, res: Response) => {
  try {
    const sellerId = req.userId;
    const stats = await service.getSellerStats(sellerId);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

