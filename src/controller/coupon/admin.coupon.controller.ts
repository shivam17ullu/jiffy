import { Request, Response } from "express";
import { createResponse, handleControllerError, sendValidationError } from "../../middleware/responseHandler.js";
import Coupon from "../../model/coupon/coupon.js";

export default class AdminCouponController {
  /**
   * @swagger
   * /api/admin/coupons:
   *   post:
   *     summary: Create a new coupon
   *     tags: [Admin - Coupons]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               description:
   *                 type: string
   *               discount_type:
   *                 type: string
   *                 enum: [PERCENTAGE, FIXED]
   *               discount_value:
   *                 type: number
   *               max_discount_amount:
   *                 type: number
   *               min_order_amount:
   *                 type: number
   *               start_date:
   *                 type: string
   *                 format: date-time
   *               end_date:
   *                 type: string
   *                 format: date-time
   *               max_uses:
   *                 type: number
   *               max_uses_per_user:
   *                 type: number
   *               is_active:
   *                 type: boolean
   *     responses:
   *       201:
   *         description: Coupon created successfully
   */
  static async create(req: Request, res: Response) {
    try {
      const {
        code,
        description,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        start_date,
        end_date,
        max_uses,
        max_uses_per_user,
        is_active,
      } = req.body;

      if (!code || !discount_type || discount_value === undefined) {
        return sendValidationError(res, "code, discount_type, and discount_value are required");
      }

      const existingCoupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });
      if (existingCoupon) {
        return sendValidationError(res, "Coupon with this code already exists");
      }

      const newCoupon = await Coupon.create({
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        start_date,
        end_date,
        max_uses,
        max_uses_per_user,
        is_active: is_active ?? true,
      });

      return createResponse(res, {
        status: 201,
        message: "Coupon created successfully",
        response: newCoupon,
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * @swagger
   * /api/admin/coupons:
   *   get:
   *     summary: List all coupons
   *     tags: [Admin - Coupons]
   *     responses:
   *       200:
   *         description: List of coupons
   */
  static async list(req: Request, res: Response) {
    try {
      const coupons = await Coupon.findAll({
        order: [["created_at", "DESC"]],
      });

      return createResponse(res, {
        status: 200,
        message: "Coupons retrieved successfully",
        response: coupons,
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * @swagger
   * /api/admin/coupons/{id}:
   *   get:
   *     summary: Get coupon details
   *     tags: [Admin - Coupons]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Coupon details
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findByPk(id);

      if (!coupon) {
        return sendValidationError(res, "Coupon not found");
      }

      return createResponse(res, {
        status: 200,
        message: "Coupon retrieved successfully",
        response: coupon,
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * @swagger
   * /api/admin/coupons/{id}:
   *   put:
   *     summary: Update coupon details
   *     tags: [Admin - Coupons]
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
   *               description:
   *                 type: string
   *               is_active:
   *                 type: boolean
   *               end_date:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Coupon updated successfully
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const coupon = await Coupon.findByPk(id);
      if (!coupon) {
        return sendValidationError(res, "Coupon not found");
      }

      await coupon.update(updates);

      return createResponse(res, {
        status: 200,
        message: "Coupon updated successfully",
        response: coupon,
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * @swagger
   * /api/admin/coupons/{id}:
   *   delete:
   *     summary: Delete a coupon
   *     tags: [Admin - Coupons]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Coupon deleted successfully
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const coupon = await Coupon.findByPk(id);
      if (!coupon) {
        return sendValidationError(res, "Coupon not found");
      }

      await coupon.destroy();

      return createResponse(res, {
        status: 200,
        message: "Coupon deleted successfully",
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }
}
