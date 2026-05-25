import { createResponse, handleControllerError } from "../middleware/responseHandler.js";
import AdminService from "../services/admin.service.js";
export default class AdminController {
    /**
     * @swagger
     * /api/admin/sellers/active:
     *   get:
     *     summary: Get active sellers
     *     description: Retrieve a list of active sellers with basic details
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of active sellers
     */
    static async getActiveSellers(req, res) {
        try {
            const sellers = await AdminService.getActiveSellers();
            return createResponse(res, {
                status: 200,
                message: "Active sellers retrieved successfully",
                response: sellers,
            });
        }
        catch (error) {
            return handleControllerError(res, error);
        }
    }
    /**
     * @swagger
     * /api/admin/sellers/inactive:
     *   get:
     *     summary: Get inactive sellers
     *     description: Retrieve a list of inactive sellers with basic details
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: List of inactive sellers
     */
    static async getInactiveSellers(req, res) {
        try {
            const sellers = await AdminService.getInactiveSellers();
            return createResponse(res, {
                status: 200,
                message: "Inactive sellers retrieved successfully",
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
            return createResponse(res, {
                status: 200,
                message: "Seller details retrieved successfully",
                response: sellerDetails,
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
            const { action } = req.body;
            if (action !== "accept" && action !== "reject") {
                return handleControllerError(res, new Error("Invalid action. Must be 'accept' or 'reject'"), 400);
            }
            const result = await AdminService.approveSeller(id, action);
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
}
