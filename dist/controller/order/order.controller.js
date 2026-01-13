import * as service from '../../services/order/order.service.js';
import { User, Role } from "../../model/relations.js";
/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order from cart
 *     description: Create order(s) from cart items, grouped by seller
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *             properties:
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zipCode:
 *                     type: string
 *                   phone:
 *                     type: string
 *               paymentInfo:
 *                 type: object
 *     responses:
 *       201:
 *         description: Order(s) created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
export const createOrder = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const cartId = req.body.cartId;
        const { shippingAddress, paymentInfo } = req.body;
        const order = await service.createOrdersFromCart(userId, shippingAddress, paymentInfo, cartId);
        res.status(201).json({ success: true, data: order });
    }
    catch (err) {
        console.log(err);
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get list of orders
 *     description: Get paginated list of orders for the authenticated user (buyer or seller)
 *     tags: [Orders]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *         description: Filter by order status
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
export const listOrders = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        // Get user roles to determine if buyer or seller
        const user = await User.findByPk(userId, { include: [Role] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const roles = user.Roles.map((r) => r.name);
        const role = roles.includes("seller") ? "seller" : "buyer";
        const params = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status,
        };
        const result = await service.listOrders(userId, role, params);
        res.json({ success: true, ...result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details by ID
 *     description: Get detailed order information including items, products, buyer, and seller details
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
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
 *                     id:
 *                       type: integer
 *                     userId:
 *                       type: integer
 *                     sellerId:
 *                       type: integer
 *                     total:
 *                       type: number
 *                     status:
 *                       type: string
 *                     shippingAddress:
 *                       type: object
 *                     paymentInfo:
 *                       type: object
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     buyer:
 *                       type: object
 *                     seller:
 *                       type: object
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Order does not belong to user
 */
export const getOrderById = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const orderId = parseInt(req.params.id);
        // Get user roles to determine if buyer or seller
        const user = await User.findByPk(userId, { include: [Role] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const roles = user.Roles.map((r) => r.name);
        const role = roles.includes("seller") ? "seller" : "buyer";
        const order = await service.getOrderById(orderId, userId, role);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found or you don't have permission to view it"
            });
        }
        res.json({ success: true, data: order });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update the status of an order (Seller only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const updateStatus = async (req, res) => {
    try {
        const userId = req.userId || req.user?.id;
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: "Status is required" });
        }
        // Get user roles to ensure it's a seller
        const user = await User.findByPk(userId, { include: [Role] });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const roles = user.Roles.map((r) => r.name);
        if (!roles.includes("seller")) {
            return res.status(403).json({ success: false, message: "Only sellers can update order status" });
        }
        const updatedOrder = await service.updateOrderStatus(orderId, userId, status);
        res.json({ success: true, data: updatedOrder });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};
