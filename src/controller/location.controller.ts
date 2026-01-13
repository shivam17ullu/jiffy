import { Request, Response } from "express";
import LocationService from "../services/location.service.js";
import { createResponse } from "../middleware/responseHandler.js";

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
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
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
      const result = await LocationService.createLocation(req.body);
      return createResponse(res, {
        status: 201,
        message: "Location added",
        response: result,
      });
    } catch (e: any) {
      return createResponse(res, {
        status: 500,
        message: e.message,
      });
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
      const result = await LocationService.getUserLocations(Number(req.params.userId));
      return createResponse(res, {
        status: 200,
        message: "Locations fetched",
        response: result,
      });
    } catch (e: any) {
      return createResponse(res, {
        status: 500,
        message: e.message,
      });
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
   *               address:
   *                 type: string
   *               city:
   *                 type: string
   *               state:
   *                 type: string
   *               zipCode:
   *                 type: string
   *               isDefault:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Location updated successfully
   *       401:
   *         description: Unauthorized
   */
  static async update(req: Request, res: Response) {
    try {
      const result = await LocationService.updateLocation(
        Number(req.params.id),
        Number(req.body.userId),
        req.body
      );

      return createResponse(res, {
        status: 200,
        message: "Location updated",
        response: result,
      });
    } catch (e: any) {
      return createResponse(res, {
        status: 500,
        message: e.message,
      });
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
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *             properties:
   *               userId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Location deleted successfully
   *       401:
   *         description: Unauthorized
   */
  static async delete(req: Request, res: Response) {
    try {
      await LocationService.deleteLocation(
        Number(req.params.id),
        Number(req.body.userId)
      );

      return createResponse(res, {
        status: 200,
        message: "Location deleted",
      });
    } catch (e: any) {
      return createResponse(res, {
        status: 500,
        message: e.message,
      });
    }
  }
}

export default LocationController;
