import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { handleControllerError } from "./responseHandler.js";

/** Global Express error handler (multer, unhandled route errors) */
export const globalErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const multerErr = err as { code?: string; message?: string; type?: string; status?: number };
  if (multerErr?.code === "LIMIT_FILE_SIZE") {
    handleControllerError(
      res,
      ApiError.badRequest(
        "File size exceeds the 5MB limit",
        "images"
      )
    );
    return;
  }
  if (multerErr?.code === "LIMIT_FILE_COUNT") {
    handleControllerError(
      res,
      ApiError.badRequest("Too many files uploaded. Maximum 20 images allowed", "images")
    );
    return;
  }
  if (multerErr?.code === "LIMIT_FIELD_VALUE") {
    handleControllerError(
      res,
      ApiError.badRequest("Field payload size is too large", "payload")
    );
    return;
  }
  if (multerErr?.code === "LIMIT_UNEXPECTED_FILE") {
    handleControllerError(
      res,
      ApiError.badRequest("Unexpected file field in upload request", "images")
    );
    return;
  }
  if (multerErr?.type === "entity.too.large" || multerErr?.status === 413) {
    handleControllerError(
      res,
      ApiError.badRequest("Request payload exceeds size limit", "payload"),
      413
    );
    return;
  }

  handleControllerError(res, err, 500);
};
