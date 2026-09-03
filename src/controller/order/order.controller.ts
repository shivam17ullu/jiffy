import * as service from '../../services/order/order.service.js';
import { getOrCreateWallet, debitWallet } from "../../services/wallet/wallet.service.js";
import { Response } from "express";
import { User, Role, Order } from "../../model/relations.js";
import {
  handleControllerError,
  sendError,
  sendValidationError,
} from "../../middleware/responseHandler.js";
import { uploadMultipleToS3, uploadMultipleBase64ToS3 } from "../../utils/s3Upload.js";

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

export const createOrder = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const cartId = req.body.cartId;
    const { shippingAddress, paymentInfo, isFullWalletPay, walletAmount } = req.body;
    if (!shippingAddress) {
      return sendValidationError(
        res,
        "Shipping address is required",
        "shippingAddress"
      );
    }
    const order = await service.createOrdersFromCart(
      userId,
      shippingAddress,
      paymentInfo,
      cartId,
      isFullWalletPay,
      walletAmount
    );
    res.status(201).json({ success: true, data: order });
  } catch (err: unknown) {
    return handleControllerError(res, err);
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
 *           enum: [Created, Confirmed, 'Out For Delivery', Delivered, 'Return Processed', 'Return Accepted', 'Return Rejected', 'Refund Successful']
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
export const listOrders = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    
    // Get user roles to determine if buyer or seller
    const user = await User.findByPk(userId, { include: [Role] });
    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    const roles = (user as any).Roles.map((r: any) => r.name);
    
    // Support an optional 'role' query param to filter specifically by buyer or seller orders.
    // If not provided, fetch 'all' (orders where they are either buyer or seller).
    let role = (req.query.role as string) || "all";
    if (role === "seller" && !roles.includes("seller")) {
      role = "buyer"; // Fallback if they request seller but aren't one
    }

    const params = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
    };

    const result = await service.listOrders(userId, role, params);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleControllerError(res, err);
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
export const getOrderById = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const orderId = parseInt(req.params.id);

    // Get user roles to determine if buyer or seller
    const user = await User.findByPk(userId, { include: [Role] });
    if (!user) {
      return sendError(res, 404, "User account not found");
    }

    const roles = (user as any).Roles.map((r: any) => r.name);
    const role = "all";

    const order = await service.getOrderById(orderId, userId, role);
    
    if (!order) {
      return sendError(
        res,
        404,
        "Order not found or you do not have permission to view it"
      );
    }

    res.json({ success: true, data: order });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update the status of an order (Sellers can change to allowed statuses; Buyers can cancel)
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
 *                 enum: [Created, Confirmed, 'Out For Delivery', Delivered, 'Return Processed', 'Return Accepted', 'Return Rejected', 'Refund Successful', Rejected, Cancelled]
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
export const updateStatus = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return sendValidationError(res, "Order status is required", "status");
    }

    const order = await Order.findByPk(orderId);
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    const updatedOrder = await service.updateOrderStatus(orderId, order.sellerId, status);
    return res.json({ success: true, data: updatedOrder });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
/**
 * @swagger
 * /api/orders/{id}/upgrade-payment:
 *   post:
 *     summary: Upgrade COD order to Wallet or Online payment
 *     description: Pay the remaining COD amount using Wallet, Razorpay, or a mix of both.
 *     tags: [Orders]
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
 *             properties:
 *               walletAmount:
 *                 type: number
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order upgraded successfully
 *       400:
 *         description: Invalid input or signature
 *       404:
 *         description: Order not found
 */
export const upgradeOrderPayment = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const orderId = req.params.id;
    const { walletAmount, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await Order.findOne({ where: { id: orderId, userId } });
    if (!order) {
      return sendError(res, 404, "Order not found");
    }

    const validStatuses = ["created", "confirmed", "processing", "shipped", "out for delivery"];
    const currentStatusLower = (order.status || "").toLowerCase();
    if (!validStatuses.includes(currentStatusLower)) {
      return sendError(res, 400, `Cannot upgrade payment for order in status: ${order.status}`);
    }

    let pInfo = typeof order.paymentInfo === "object" ? order.paymentInfo : {};
    if (pInfo.mode !== "COD") {
      return sendError(res, 400, "Order is not COD");
    }

    const currentWalletDeducted = Number(pInfo.walletAmount || 0);
    const remainingAmount = Number((order.total - currentWalletDeducted).toFixed(2));
    
    if (remainingAmount <= 0) {
      return sendError(res, 400, "Order is already fully paid");
    }

    let debitAmount = 0;
    if (walletAmount && Number(walletAmount) > 0) {
      debitAmount = Number(walletAmount);
      if (debitAmount > remainingAmount) {
        return sendError(res, 400, "Wallet amount cannot exceed remaining order total");
      }
      
      const wallet = await getOrCreateWallet(userId);
      if (Number(wallet.balance) < debitAmount) {
        return sendError(res, 400, "Insufficient wallet balance");
      }
    }

    let isFullWallet = debitAmount === remainingAmount;

    // Verify Razorpay if it's not a full wallet payment
    if (!isFullWallet) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return sendError(res, 400, "Razorpay details are required for partial/full online payment");
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) {
        return sendError(res, 500, "Razorpay credentials not configured");
      }

      const crypto = require("crypto");
      const generated_signature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return sendError(res, 400, "Payment signature verification failed");
      }
    }

    let transaction = null;
    if (debitAmount > 0) {
      const { jiffy } = require("../../config/sequelize.js");
      transaction = await jiffy.transaction();
      try {
        await debitWallet(
          {
            userId,
            amount: debitAmount,
            referenceId: orderId.toString(),
            referenceType: "ORDER",
            category: "ORDER_PAYMENT",
            description: `Order ${orderId} upgraded payment`
          },
          transaction
        );
        await transaction.commit();
      } catch (err) {
        if (transaction) await transaction.rollback();
        throw err;
      }
    }

    // Update Order
    const newWalletTotal = currentWalletDeducted + debitAmount;
    
    pInfo = {
      ...pInfo,
      mode: isFullWallet ? "Wallet" : "Online",
      method: isFullWallet ? "wallet" : "Razorpay",
      walletAmount: newWalletTotal,
      status: "captured",
      payment_verified_at: new Date().toISOString()
    };

    if (!isFullWallet) {
      pInfo.razorpay_order_id = razorpay_order_id;
      pInfo.razorpay_payment_id = razorpay_payment_id;
      pInfo.razorpay_signature = razorpay_signature;
    }

    order.paymentInfo = pInfo;
    if (currentStatusLower === "created") {
      order.status = "confirmed";
    }
    
    order.changed("paymentInfo", true);
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order payment upgraded successfully",
      data: { id: order.id, status: order.status, paymentInfo: order.paymentInfo }
    });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

/**
 * @swagger
 * /api/orders/{id}/verification-images:
 *   post:
 *     summary: Upload order verification/dispatch images (Seller only)
 *     description: Upload between 1 and 3 verification images after accepting an order to prevent damage/wrong item disputes.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 1 to 3 verification image files
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 1 to 3 base64 encoded image strings or URLs
 *     responses:
 *       200:
 *         description: Verification images uploaded successfully
 *       400:
 *         description: Bad request / Invalid image count or order status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the order's seller
 *       404:
 *         description: Order not found
 */
export const uploadVerificationImages = async (req: any, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;
    const orderId = parseInt(req.params.id);

    if (isNaN(orderId)) {
      return sendValidationError(res, "Invalid order ID", "id");
    }

    let files: Express.Multer.File[] = [];
    if (req.files) {
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (typeof req.files === "object") {
        Object.values(req.files).forEach((f: any) => {
          if (Array.isArray(f)) {
            files.push(...f);
          } else if (f) {
            files.push(f);
          }
        });
      }
    } else if (req.file) {
      files = [req.file];
    }

    let rawBodyImages = req.body.images || req.body.verificationImages || [];
    if (typeof rawBodyImages === "string") {
      try {
        rawBodyImages = JSON.parse(rawBodyImages);
      } catch {
        rawBodyImages = [rawBodyImages];
      }
    }
    if (!Array.isArray(rawBodyImages)) {
      rawBodyImages = [rawBodyImages];
    }

    // Filter out invalid/empty strings
    const validBodyImages = rawBodyImages.filter(
      (img: any) => typeof img === "string" && img.trim().length > 0
    );

    const isBase64 = (img: string) =>
      !img.startsWith("http://") && !img.startsWith("https://");

    const base64Images = validBodyImages.filter(isBase64);
    const existingUrls = validBodyImages.filter((img: string) => !isBase64(img));

    const totalProvided = files.length + validBodyImages.length;
    if (totalProvided < 1) {
      return sendValidationError(
        res,
        "Please provide between 1 and 3 verification images",
        "images"
      );
    }
    if (totalProvided > 3) {
      return sendValidationError(
        res,
        "Maximum 3 verification images are allowed",
        "images"
      );
    }

    let uploadedUrls: string[] = [];

    if (files.length > 0) {
      const s3Urls = await uploadMultipleToS3(files, "order-verification");
      uploadedUrls.push(...s3Urls);
    }

    if (base64Images.length > 0) {
      const s3Base64Urls = await uploadMultipleBase64ToS3(
        base64Images,
        "order-verification"
      );
      uploadedUrls.push(...s3Base64Urls);
    }

    const finalImageUrls = [...existingUrls, ...uploadedUrls];

    const updatedOrder = await service.uploadOrderVerificationImages(
      orderId,
      userId,
      finalImageUrls
    );

    return res.status(200).json({
      success: true,
      message: "Order verification images uploaded successfully",
      data: updatedOrder,
    });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};

