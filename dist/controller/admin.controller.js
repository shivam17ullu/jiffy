import { createResponse, handleControllerError } from "../middleware/responseHandler.js";
import AdminService from "../services/admin.service.js";
export default class AdminController {
    /**
     * @swagger
     * /api/admin/sellers:
     *   get:
     *     summary: Get sellers list
     *     description: Retrieve a list of sellers with basic details. Optionally filter by status.
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [pending, approved, rejected]
     *         description: Filter sellers by status
     *     responses:
     *       200:
     *         description: List of sellers
     *       400:
     *         description: Invalid status parameter
     */
    static async getSellers(req, res) {
        try {
            const status = req.query.status;
            if (status && !["pending", "approved", "rejected"].includes(status)) {
                return handleControllerError(res, new Error("Invalid status. Must be one of: pending, approved, rejected"), 400);
            }
            const sellers = await AdminService.getSellers(status);
            return createResponse(res, {
                status: 200,
                message: "Sellers retrieved successfully",
                response: sellers,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/sellers/{id}:
     *   get:
     *     summary: Get seller details
     *     description: Retrieve comprehensive details of a specific seller excluding their products
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Seller profile ID
     *     responses:
     *       200:
     *         description: Detailed seller profile retrieved successfully
     *       400:
     *         description: Invalid seller ID
     *       404:
     *         description: Seller not found
     */
    static async getSellerDetails(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid seller ID"));
            }
            const sellerDetails = await AdminService.getSellerDetails(id);
            if (!sellerDetails) {
                return handleControllerError(res, new Error("Seller not found"));
            }
            const responseData = sellerDetails.toJSON();
            const reasonMessage = responseData.VerifiedSeller?.rejection_reason || responseData.VerifiedSellers?.rejection_reason || null;
            return createResponse(res, {
                status: 200,
                message: "Seller details retrieved successfully",
                response: {
                    ...responseData,
                    reason: reasonMessage
                },
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/sellers/{id}/docs:
     *   get:
     *     summary: Get seller documents
     *     description: Retrieve uploaded documents of a specific seller
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Seller profile ID
     *     responses:
     *       200:
     *         description: Seller documents retrieved successfully
     *       400:
     *         description: Invalid seller ID
     *       404:
     *         description: Seller documents not found
     *       500:
     *         description: Internal server error
     */
    static async getSellerDocuments(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid seller ID"));
            }
            const docs = await AdminService.getSellerDocuments(id);
            if (!docs) {
                return handleControllerError(res, new Error("Seller documents not found"));
            }
            return createResponse(res, {
                status: 200,
                message: "Seller documents retrieved successfully",
                response: docs,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/products:
     *   get:
     *     summary: Get all products list
     *     description: Retrieve all products with their details and variants, filterable by seller ID and status
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: sellerId
     *         schema:
     *           type: integer
     *         description: Filter products by seller ID
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [active, inactive]
     *         description: Filter products by status (active or inactive). Returns all if not provided.
     *     responses:
     *       200:
     *         description: List of products retrieved successfully
     *
     * /api/admin/sellers/{sellerId}/products:
     *   get:
     *     summary: Get products for a specific seller
     *     description: Retrieve products with their details and variants for a specific seller
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: sellerId
     *         required: true
     *         schema:
     *           type: integer
     *         description: Seller profile ID
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [active, inactive]
     *         description: Filter products by status (active or inactive). Returns all if not provided.
     *     responses:
     *       200:
     *         description: List of seller's products retrieved successfully
     */
    static async getProducts(req, res) {
        try {
            const sellerId = req.params.sellerId ? Number(req.params.sellerId) : (req.query.sellerId ? Number(req.query.sellerId) : undefined);
            const status = req.query.status;
            const products = await AdminService.getProducts(sellerId, status);
            return createResponse(res, {
                status: 200,
                message: "Products retrieved successfully",
                response: products,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/sellers/{id}/approve:
     *   patch:
     *     summary: Approve or reject a seller
     *     description: Updates a seller account's verified status to active or inactive
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Seller profile ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - action
     *             properties:
     *               action:
     *                 type: string
     *                 enum: [accept, reject]
     *                 description: Action to perform on the seller
     *               reason:
     *                 type: string
     *                 description: Optional reason for rejecting the seller
     *     responses:
     *       200:
     *         description: Seller status updated successfully
     *       400:
     *         description: Invalid input or missing action
     *       404:
     *         description: Seller not found
     */
    static async approveSeller(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid seller ID"), 400);
            }
            const { action, reason } = req.body;
            if (action !== "accept" && action !== "reject") {
                return handleControllerError(res, new Error("Invalid action. Must be 'accept' or 'reject'"), 400);
            }
            const status = action === "accept" ? "approved" : "rejected";
            const result = await AdminService.approveSeller(id, status, reason);
            if (!result) {
                return handleControllerError(res, new Error("Seller not found or could not be updated"), 404);
            }
            return createResponse(res, {
                status: 200,
                message: `Seller ${action === "accept" ? "approved" : "rejected"} successfully`,
                response: result,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/products/{id}/approve:
     *   patch:
     *     summary: Approve an inactive product
     *     description: Activates a product by setting its active status to true
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Product ID
     *     responses:
     *       200:
     *         description: Product approved successfully
     *       400:
     *         description: Invalid product ID
     *       404:
     *         description: Product not found or unable to approve
     */
    static async approveProduct(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid product ID"), 400);
            }
            const result = await AdminService.approveProduct(id);
            if (!result) {
                return handleControllerError(res, new Error("Product not found or could not be approved"), 404);
            }
            return createResponse(res, {
                status: 200,
                message: "Product approved successfully",
                response: result,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/sellers/{id}:
     *   delete:
     *     summary: Delete a seller and all related details
     *     description: Permanently deletes the seller profile, store, documents, bank details, user account, products, variants, and orders.
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: Seller profile ID
     *     responses:
     *       200:
     *         description: Seller and all associated details deleted successfully
     *       400:
     *         description: Invalid seller ID
     *       404:
     *         description: Seller not found
     */
    static async deleteSeller(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid seller ID"), 400);
            }
            const deleted = await AdminService.deleteSeller(id);
            if (!deleted) {
                return handleControllerError(res, new Error("Seller not found"), 404);
            }
            return createResponse(res, {
                status: 200,
                message: "Seller and all associated details deleted successfully",
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/orders:
     *   get:
     *     summary: Get all sellers orders
     *     description: Retrieve all orders across all sellers with pagination and optional filtering
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: sellerId
     *         schema:
     *           type: integer
     *         description: Filter orders by seller's user ID
     *       - in: query
     *         name: buyerId
     *         schema:
     *           type: integer
     *         description: Filter orders by buyer's user ID
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [created, confirmed, processing, shipped, delivered, cancelled, returned, refunded]
     *         description: Filter orders by status
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: Filter orders created on or after this ISO date-time
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *         description: Filter orders created on or before this ISO date-time
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number for pagination
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *         description: Page limit for pagination
     *     responses:
     *       200:
     *         description: List of orders retrieved successfully
     *       400:
     *         description: Bad request or validation error
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Admin role required
     */
    static async getSellersOrders(req, res) {
        try {
            const sellerId = req.query.sellerId ? Number(req.query.sellerId) : undefined;
            const buyerId = req.query.buyerId ? Number(req.query.buyerId) : undefined;
            const status = req.query.status;
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const page = req.query.page ? Number(req.query.page) : 1;
            const limit = req.query.limit ? Number(req.query.limit) : 20;
            if (sellerId !== undefined && isNaN(sellerId)) {
                return handleControllerError(res, new Error("Invalid sellerId"), 400);
            }
            if (buyerId !== undefined && isNaN(buyerId)) {
                return handleControllerError(res, new Error("Invalid buyerId"), 400);
            }
            if (isNaN(page) || page < 1) {
                return handleControllerError(res, new Error("Invalid page number"), 400);
            }
            if (isNaN(limit) || limit < 1) {
                return handleControllerError(res, new Error("Invalid limit value"), 400);
            }
            const result = await AdminService.getSellersOrders({
                sellerId,
                buyerId,
                status,
                startDate,
                endDate,
                page,
                limit,
            });
            return createResponse(res, {
                status: 200,
                message: "Sellers orders retrieved successfully",
                response: result,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/orders/{id}:
     *   get:
     *     summary: Get order details by ID
     *     description: Retrieve detailed order information including items, buyer, and seller details
     *     tags: [Admin]
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
     *         description: Detailed order retrieved successfully
     *       400:
     *         description: Invalid order ID
     *       404:
     *         description: Order not found
     *       401:
     *         description: Unauthorized
     *       403:
     *         description: Forbidden - Admin role required
     */
    static async getOrderDetail(req, res) {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return handleControllerError(res, new Error("Invalid order ID"), 400);
            }
            const order = await AdminService.getOrderDetail(id);
            if (!order) {
                return handleControllerError(res, new Error("Order not found"), 404);
            }
            return createResponse(res, {
                status: 200,
                message: "Order details retrieved successfully",
                response: order,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
}
