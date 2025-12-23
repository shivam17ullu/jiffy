import { Request, Response } from "express";
import LocationService from "../services/location.service.js";
import { createResponse } from "../middleware/responseHandler.js";

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
