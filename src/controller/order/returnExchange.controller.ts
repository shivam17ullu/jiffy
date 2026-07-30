import * as service from "../../services/order/returnExchange.service.js";
import { Response } from "express";
import { User, Role } from "../../model/relations.js";
import {
  handleControllerError,
  sendError,
  sendValidationError,
} from "../../middleware/responseHandler.js";
import { uploadMultipleBase64ToS3 } from "../../utils/s3Upload.js";

/**
 * Helper to determine a user's role (buyer, seller, or admin)
 */
const getUserRole = async (userId: number, reqRoleQuery?: string): Promise<string> => {
  const user = await User.findByPk(userId, { include: [Role] });
  if (!user) {
    throw new Error("User account not found.");
  }

  const roles = (user as any).Roles.map((r: any) => r.name);

  // If user requests seller explicitly and has that role
  if (reqRoleQuery === "seller" && roles.includes("seller")) {
    return "seller";
  }
  // Admin role check
  if (roles.includes("admin")) {
    return "admin";
  }
  // Default fallback
  return "buyer";
};

/**
 * @swagger
 * /api/return-exchange:
 *   post:
 *     summary: Create return or exchange request
 *     tags: [Return & Exchange]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - type
 *               - reason
 *               - items
 *             properties:
 *               orderId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [RETURN, EXCHANGE]
 *               reason:
 *                 type: string
 *               comments:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     orderItemId:
 *                       type: integer
 *                     productId:
 *                       type: integer
 *                     variantId:
 *                       type: integer
 *                     qty:
 *                       type: integer
 *                     exchangeVariantId:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Request created successfully
 *       400:
 *         description: Bad request / validation failure
 */
export const createRequest = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    
    // Process base64 image uploads if present
    if (req.body.images && Array.isArray(req.body.images)) {
      // Check if image is base64 (either has data:image prefix or doesn't start with http/https)
      const isBase64 = (img: string) => !img.startsWith("http://") && !img.startsWith("https://");
      
      const base64Images = req.body.images.filter(isBase64);
      const existingUrls = req.body.images.filter((img: string) => !isBase64(img));
      
      let allImages = [...existingUrls];
      if (base64Images.length > 0) {
        const uploadedUrls = await uploadMultipleBase64ToS3(base64Images, "returns");
        allImages = [...allImages, ...uploadedUrls];
      }
      
      req.body.images = allImages;
    }

    const request = await service.createReturnExchangeRequest(userId, req.body);
    res.status(201).json({ success: true, data: request });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/return-exchange:
 *   get:
 *     summary: List return/exchange requests
 *     tags: [Return & Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *     responses:
 *       200:
 *         description: List of requests
 */
export const listRequests = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const role = await getUserRole(userId, req.query.role as string);

    const opts = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      type: req.query.type,
    };

    const result = await service.listRequests(userId, role, opts);
    res.json({ success: true, ...result });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/return-exchange/{id}:
 *   get:
 *     summary: Get return/exchange request details
 *     tags: [Return & Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Request details
 *       404:
 *         description: Request not found
 */
export const getRequestById = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const requestId = parseInt(req.params.id);
    const role = await getUserRole(userId, req.query.role as string);

    const request = await service.getRequestById(requestId, userId, role);
    if (!request) {
      return sendError(res, 404, "Return/Exchange request not found or unauthorized.");
    }

    res.json({ success: true, data: request });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/return-exchange/{id}/status:
 *   patch:
 *     summary: Update return/exchange request status
 *     tags: [Return & Exchange]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *                 enum: [PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Request status updated successfully
 */
export const updateRequestStatus = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const requestId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return sendValidationError(res, "Request status is required", "status");
    }

    const role = await getUserRole(userId, req.query.role as string);
    const updatedRequest = await service.updateRequestStatus(requestId, userId, role, status);

    res.json({ success: true, data: updatedRequest });
  } catch (err: any) {
    return handleControllerError(res, err);
  }
};
