import { Request, Response } from "express";
import * as brandService from "../../services/product/brand.service.js";
import { handleControllerError } from "../../middleware/responseHandler.js";

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Get list of all brands
 *     description: Retrieve a simple, distinct list of all brands without duplicates.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of all distinct brands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Adidas", "Levis", "Nike"]
 */
export const getBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await brandService.getAllBrands();

    return res.status(200).json({
      success: true,
      total: brands.length,
      data: brands,
    });
  } catch (err: unknown) {
    return handleControllerError(res, err);
  }
};
