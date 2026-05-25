import { Response } from "express";
import { FieldError } from "../utils/ApiError.js";
import { resolveError } from "../utils/errorCatalog.js";

interface ResponseModel<T = unknown> {
  status: number;
  message: string;
  data?: T;
}

export interface ErrorResponseModel {
  success: false;
  message: string;
}

const createResponseModel = <T>(
  status: number,
  message: string,
  data?: T
): ResponseModel<T> => ({
  status,
  message,
  data,
});

/** Success response for auth/profile/location routes (status + message + data) */
export const createResponse = <T>(
  res: Response,
  data: { status: number; message: string; response?: T }
): Response => {
  const response = createResponseModel(
    data.status,
    data.message,
    data.response
  );
  return res.status(data.status).json(response);
};

/** Standard error response — HTTP status on response; body is message only */
export const sendError = (
  res: Response,
  status: number,
  message: string,
  _errors?: FieldError[]
): Response => {
  const body: ErrorResponseModel = {
    success: false,
    message,
  };
  return res.status(status).json(body);
};

export const sendValidationError = (
  res: Response,
  message: string,
  _field?: string,
  _fieldMessage?: string
): Response => sendError(res, 400, message);

/** Map thrown errors (ApiError, catalog, or generic) to a client response */
export const handleControllerError = (
  res: Response,
  error: unknown,
  fallbackStatus = 400
): Response => {
  const resolved = resolveError(error);
  const status =
    resolved.status >= 400 ? resolved.status : fallbackStatus;
  return sendError(res, status, resolved.message, resolved.errors);
};
