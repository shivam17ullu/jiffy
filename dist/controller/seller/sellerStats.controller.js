import * as service from '../../services/seller/sellerStats.service.js';
import { handleControllerError } from "../../middleware/responseHandler.js";
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
export const getStats = async (req, res) => {
    try {
        const sellerId = req.userId;
        const stats = await service.getSellerStats(sellerId);
        res.json({ success: true, data: stats });
    }
    catch (err) {
        return handleControllerError(res, err);
    }
};
/**
 * @swagger
 * /api/seller/revenue/monthly:
 *   get:
 *     summary: Get seller monthly-wise revenue
 *     description: Retrieve the monthly-wise revenue for the authenticated seller
 *     tags: [Seller]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Optional year to filter the monthly revenue
 *     responses:
 *       200:
 *         description: Monthly revenue retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year:
 *                         type: integer
 *                       month:
 *                         type: integer
 *                       revenue:
 *                         type: number
 *                       orderCount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not a seller
 */
export const getMonthlyRevenue = async (req, res) => {
    try {
        const sellerId = req.userId;
        const yearQuery = req.query.year;
        let year = undefined;
        if (yearQuery) {
            year = parseInt(yearQuery, 10);
            if (isNaN(year)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid year parameter. It must be a valid integer."
                });
            }
        }
        const data = await service.getSellerMonthlyRevenue(sellerId, year);
        res.json({ success: true, data });
    }
    catch (err) {
        return handleControllerError(res, err);
    }
};
