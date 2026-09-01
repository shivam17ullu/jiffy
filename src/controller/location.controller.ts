import { Request, Response } from "express";
import LocationService from "../services/location.service.js";
import {
  createResponse,
  handleControllerError,
  sendError,
  sendValidationError,
} from "../middleware/responseHandler.js";

/**
 * @swagger
 * /api/location:
 *   post:
 *     summary: Create a new location
 *     description: Add a new shipping address/location for the user
 *     tags: [Location]
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
 *               - address
 *             properties:
 *               userId:
 *                 type: integer
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               phone_number:
 *                 type: string
 *               name:
 *                 type: string
 *               alternate_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Location created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
class LocationController {
  static async create(req: Request, res: Response) {
    try {
      const userId = (req as any).userId || req.body.userId;
      const { addressLine1 } = req.body;
      if (!userId) {
        return sendValidationError(res, "User ID is required", "userId");
      }
      if (!addressLine1) {
        return sendValidationError(res, "Address is required", "addressLine1");
      }
      const result = await LocationService.createLocation({
        ...req.body,
        userId: Number(userId),
      });
      return createResponse(res, {
        status: 201,
        message: "Location added successfully",
        response: result,
      });
    } catch (e: unknown) {
      return handleControllerError(res, e, 500);
    }
  }

  /**
   * @swagger
   * /api/location/{userId}:
   *   get:
   *     summary: Get user locations
   *     description: Get all shipping addresses for a user
   *     tags: [Location]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Locations retrieved successfully
   *       401:
   *         description: Unauthorized
   */
  static async list(req: Request, res: Response) {
    try {
      const userId = Number(req.params.userId || (req as any).userId);
      if (isNaN(userId)) {
        return sendError(res, 400, "Invalid user ID");
      }
      const result = await LocationService.getUserLocations(userId);
      return createResponse(res, {
        status: 200,
        message: "Locations fetched",
        response: result,
      });
    } catch (e: unknown) {
      return handleControllerError(res, e, 500);
    }
  }

  /**
   * @swagger
   * /api/location/{id}:
   *   put:
   *     summary: Update location
   *     description: Update a shipping address
   *     tags: [Location]
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
   *               userId:
   *                 type: integer
   *               addressLine1:
   *                 type: string
   *               addressLine2:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               zipCode:
   *                 type: string
   *               isDefault:
   *                 type: boolean
   *               phone_number:
   *                 type: string
   *               name:
   *                 type: string
   *               alternate_number:
   *                 type: string
   *     responses:
   *       200:
   *         description: Location updated successfully
   *       401:
   *         description: Unauthorized
   */
  static async update(req: Request, res: Response) {
    try {
      const locationId = Number(req.params.id);
      if (isNaN(locationId)) {
        return sendError(res, 400, "Invalid location ID");
      }

      let userId = Number((req as any).userId || req.body?.userId || req.query?.userId);

      if (!userId || isNaN(userId)) {
        const loc = await LocationService.getLocationById(locationId);
        if (!loc) {
          return sendError(res, 404, "Location not found");
        }
        userId = Number((loc as any).userId);
      }

      const result = await LocationService.updateLocation(
        locationId,
        userId,
        req.body
      );

      return createResponse(res, {
        status: 200,
        message: "Location updated",
        response: result,
      });
    } catch (e: unknown) {
      return handleControllerError(res, e, 500);
    }
  }

  /**
   * @swagger
   * /api/location/{id}:
   *   delete:
   *     summary: Delete location
   *     description: Delete a shipping address
   *     tags: [Location]
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
   *         description: Location deleted successfully
   *       401:
   *         description: Unauthorized
   */
  static async delete(req: Request, res: Response) {
    try {
      const locationId = Number(req.params.id);
      if (isNaN(locationId)) {
        return sendError(res, 400, "Invalid location ID");
      }

      let userId = Number((req as any).userId || req.body?.userId || req.query?.userId);

      const loc = await LocationService.getLocationById(locationId);
      if (!loc) {
        return sendError(res, 404, "Location not found");
      }

      if (userId && !isNaN(userId) && loc.userId && Number(loc.userId) !== userId) {
        return sendError(res, 403, "Unauthorized to delete this location");
      }

      await LocationService.deleteLocation(
        locationId,
        !isNaN(userId) && userId > 0 ? userId : undefined
      );

      return createResponse(res, {
        status: 200,
        message: "Location deleted successfully",
      });
    } catch (e: unknown) {
      return handleControllerError(res, e, 500);
    }
  }
}

export default LocationController;
