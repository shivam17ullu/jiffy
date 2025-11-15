import * as service from '../../services/cart/cart.service.js';
/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart
 *     description: Add a product (with optional variant) to the user's cart
 *     tags: [Cart]
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
 *                 description: Product ID
 *               variantId:
 *                 type: integer
 *                 description: Product variant ID (optional)
 *               qty:
 *                 type: integer
 *                 default: 1
 *                 description: Quantity to add
 *     responses:
 *       200:
 *         description: Item added to cart successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export const addItem = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { productId, variantId, qty } = req.body;
        const items = await service.addToCart(userId, productId, variantId ?? null, qty ?? 1);
        res.json({ success: true, data: items });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get cart details
 *     description: Get detailed cart information including all items with product details, variants, seller info, and price summary
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart details
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
 *                     cart:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         userId:
 *                           type: integer
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           variantId:
 *                             type: integer
 *                           qty:
 *                             type: integer
 *                           price:
 *                             type: number
 *                           subtotal:
 *                             type: number
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
 *                               categories:
 *                                 type: array
 *                               seller:
 *                                 type: object
 *                           variant:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               sku:
 *                                 type: string
 *                               size:
 *                                 type: string
 *                               color:
 *                                 type: string
 *                               price:
 *                                 type: number
 *                               stock:
 *                                 type: integer
 *                           stockAvailable:
 *                             type: boolean
 *                     summary:
 *                       type: object
 *                       properties:
 *                         itemCount:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         subtotal:
 *                           type: number
 *                         total:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
export const getCart = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const cart = await service.getCart(userId);
        res.json({ success: true, data: cart });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/cart/item/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     description: Update the quantity of a specific cart item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qty
 *             properties:
 *               qty:
 *                 type: integer
 *                 minimum: 1
 *                 description: New quantity
 *     responses:
 *       200:
 *         description: Cart item updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
export const updateQty = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { itemId } = req.params;
        const { qty } = req.body;
        if (!qty || qty < 1) {
            return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
        }
        const updated = await service.updateQty(userId, +itemId, qty);
        res.json({ success: true, data: updated });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/cart/item/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     description: Remove a specific item from the cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Cart item ID
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cart item not found
 */
export const removeItem = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const { itemId } = req.params;
        await service.removeItem(userId, +itemId);
        res.json({ success: true, message: "Item removed from cart" });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
