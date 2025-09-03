import { Response } from "express";

interface ResponseModel<T = any> {
  status: number;
  message: string;
  data?: T;
}

const createResponseModel = <T>(status: number, message: string, data?: T): ResponseModel<T> => ({
  status,
  message,
  data,
});

export const createResponse = <T>(
  res: Response,
  data: { status: number; message: string; response?: T }
): Response => {
  const response = createResponseModel(data.status, data.message, data.response);
  return res.status(data.status).json(response);
};
