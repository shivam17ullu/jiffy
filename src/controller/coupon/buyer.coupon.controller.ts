import { Request, Response } from "express";
import { Op } from "sequelize";
import { createResponse, handleControllerError, sendValidationError } from "../../middleware/responseHandler.js";
import Coupon, { DiscountType } from "../../model/coupon/coupon.js";
import CouponUsage from "../../model/coupon/couponUsage.js";

export default class BuyerCouponController {
  /**
   * @swagger
   * /api/buyer/coupons/applicable:
   *   get:
   *     summary: List applicable coupons for the buyer
   *     tags: [Buyer - Coupons]
   *     responses:
   *       200:
   *         description: List of valid coupons
   */
  static async listApplicable(req: Request, res: Response) {
    try {
      const now = new Date();
      // Using req as any for now, usually req.userId is set by auth middleware
      const userId = (req as any).userId; 

      // Find all active coupons within date range
      const coupons = await Coupon.findAll({
        where: {
          is_active: true,
          [Op.or]: [
            { start_date: null },
            { start_date: { [Op.lte]: now } }
          ],
          [Op.and]: [
            {
              [Op.or]: [
                { end_date: null },
                { end_date: { [Op.gte]: now } }
              ]
            }
          ]
        } as any,
      });

      if (!userId) {
        return createResponse(res, {
          status: 200,
          message: "Applicable coupons",
          response: coupons,
        });
      }

      // Filter out coupons that exceed max uses
      const applicableCoupons = [];

      for (const coupon of coupons) {
        // Check global max uses
        if (coupon.max_uses) {
          const totalUsages = await CouponUsage.count({ where: { coupon_id: coupon.id } });
          if (totalUsages >= coupon.max_uses) {
            continue;
          }
        }

        // Check user specific max uses
        if (coupon.max_uses_per_user) {
          const userUsages = await CouponUsage.count({ where: { coupon_id: coupon.id, user_id: userId } });
          if (userUsages >= coupon.max_uses_per_user) {
            continue;
          }
        }

        applicableCoupons.push(coupon);
      }

      return createResponse(res, {
        status: 200,
        message: "Applicable coupons retrieved successfully",
        response: applicableCoupons,
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }

  /**
   * @swagger
   * /api/buyer/coupons/verify:
   *   post:
   *     summary: Verify a coupon code and calculate discount
   *     tags: [Buyer - Coupons]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               code:
   *                 type: string
   *               cart_total:
   *                 type: number
   *     responses:
   *       200:
   *         description: Coupon verified and discount calculated
   */
  static async verify(req: Request, res: Response) {
    try {
      const { code, cart_total } = req.body;
      const userId = (req as any).userId;

      if (!code || cart_total === undefined) {
        return sendValidationError(res, "code and cart_total are required");
      }

      if (!userId) {
        return sendValidationError(res, "User authentication required to verify coupon");
      }

      const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });

      if (!coupon) {
        return sendValidationError(res, "Invalid coupon code");
      }

      if (!coupon.is_active) {
        return sendValidationError(res, "Coupon is not active");
      }

      const now = new Date();
      if (coupon.start_date && new Date(coupon.start_date) > now) {
        return sendValidationError(res, "Coupon is not valid yet");
      }

      if (coupon.end_date && new Date(coupon.end_date) < now) {
        return sendValidationError(res, "Coupon has expired");
      }

      if (coupon.min_order_amount && cart_total < Number(coupon.min_order_amount)) {
        return sendValidationError(res, `Minimum order amount of ₹${coupon.min_order_amount} is required`);
      }

      // Check global limit
      if (coupon.max_uses) {
        const totalUsages = await CouponUsage.count({ where: { coupon_id: coupon.id } });
        if (totalUsages >= coupon.max_uses) {
          return sendValidationError(res, "Coupon usage limit reached");
        }
      }

      // Check user limit
      if (coupon.max_uses_per_user) {
        const userUsages = await CouponUsage.count({ where: { coupon_id: coupon.id, user_id: userId } });
        if (userUsages >= coupon.max_uses_per_user) {
          return sendValidationError(res, "You have reached the maximum usage limit for this coupon");
        }
      }

      // Calculate discount
      let discountAmount = 0;
      const discountValue = Number(coupon.discount_value);

      if (coupon.discount_type === DiscountType.PERCENTAGE) {
        discountAmount = (cart_total * discountValue) / 100;
        const maxDiscount = coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null;
        if (maxDiscount && discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
      } else if (coupon.discount_type === DiscountType.FIXED) {
        discountAmount = discountValue;
      }

      // Ensure discount doesn't exceed cart total
      if (discountAmount > cart_total) {
        discountAmount = cart_total;
      }

      return createResponse(res, {
        status: 200,
        message: "Coupon is valid",
        response: {
          original_total: cart_total,
          discount_amount: discountAmount,
          final_total: cart_total - discountAmount,
          coupon_id: coupon.id,
          code: coupon.code
        },
      });
    } catch (error) {
      return handleControllerError(res, error);
    }
  }
}
