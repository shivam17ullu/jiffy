import { Request, Response } from "express";
import ProfileService from "../services/profile.service.js";
import {
  createResponse,
  handleControllerError,
  sendError,
  sendValidationError,
} from "../middleware/responseHandler.js";

export default class BuyerProfileController {
  /**
   * @swagger
   * /api/profile/setup:
   *   post:
   *     summary: Create or update buyer profile
   *     description: Creates a new buyer profile or updates existing one
   *     tags: [Profile]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - fullName
   *             properties:
   *               userId:
   *                 type: integer
   *               fullName:
   *                 type: string
   *               phone:
   *                 type: string
   *               address:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               zipCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: Profile created/updated successfully
   *       400:
   *         description: Bad request
   *       401:
   *         description: Unauthorized
   */
  static async createOrUpdate(req: Request, res: Response) {
    try {
      const { userId, fullName } = req.body;
      if (!userId) {
        return sendValidationError(res, "User ID is required", "userId");
      }
      if (!fullName) {
        return sendValidationError(res, "Full name is required", "fullName");
      }
      const profile = await ProfileService.createOrUpdateProfile(req.body);
      createResponse(res, { status: 200, message: "Profile saved successfully", response: profile });
    } catch (error: unknown) {
      return handleControllerError(res, error, 500);
    }
  }

  /**
   * @swagger
   * /api/profile/{id}:
   *   get:
   *     summary: Get buyer profile
   *     description: Get buyer profile by user ID
   *     tags: [Profile]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: User ID
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *       404:
   *         description: Profile not found
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const profile = await ProfileService.getProfile(
        Number(req.params.id)
      );

      if (!profile) {
        return sendError(res, 404, "Profile not found");
      }
      createResponse(res, { status: 200, message: "Profile retrieved successfully", response: profile });
    } catch (error: unknown) {
      return handleControllerError(res, error, 500);
    }
  }
}
