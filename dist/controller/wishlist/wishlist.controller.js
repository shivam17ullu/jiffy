import * as service from '../../services/wishlist/wishlist.service.js';
/**
 * @swagger
 * /api/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     description: Get paginated list of products in the user's wishlist with full product details
 *     tags: [Wishlist]
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
 *         description: Wishlist retrieved successfully
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
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           addedAt:
 *                             type: string
 *                             format: date-time
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               brand:
 *                                 type: string
 *                               images:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               tags:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               priceRange:
 *                                 type: object
 *                                 properties:
 *                                   min:
 *                                     type: number
 *                                   max:
 *                                     type: number
 *                               variants:
 *                                 type: array
 *                               categories:
 *                                 type: array
 *                               seller:
 *                                 type: object
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
export const getWishlist = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const params = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        };
        const result = await service.getWishlist(userId, params);
        res.json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/wishlist:
 *   post:
 *     summary: Add product to wishlist
 *     description: Add a product to the user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: integer
 *                 description: Product ID to add to wishlist
 *     responses:
 *       200:
 *         description: Product added to wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Bad request (product not found or already in wishlist)
 *       401:
 *         description: Unauthorized
 */
export const addToWishlist = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }
        await service.addToWishlist(userId, productId);
        res.json({
            success: true,
            message: "Product added to wishlist successfully"
        });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/wishlist/{productId}:
 *   delete:
 *     summary: Remove product from wishlist
 *     description: Remove a product from the user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID to remove from wishlist
 *     responses:
 *       200:
 *         description: Product removed from wishlist successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request (product not in wishlist)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found in wishlist
 */
export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const productId = parseInt(req.params.productId);
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }
        await service.removeFromWishlist(userId, productId);
        res.json({
            success: true,
            message: "Product removed from wishlist successfully"
        });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/wishlist/check/{productId}:
 *   get:
 *     summary: Check if product is in wishlist
 *     description: Check if a specific product is in the user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID to check
 *     responses:
 *       200:
 *         description: Check result
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
 *                     isInWishlist:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
export const checkWishlist = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const productId = parseInt(req.params.productId);
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }
        const isInWishlist = await service.isInWishlist(userId, productId);
        res.json({
            success: true,
            data: { isInWishlist }
        });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
