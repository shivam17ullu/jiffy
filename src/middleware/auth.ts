// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role } from "../model/relations.js";
import { sendError, handleControllerError } from "./responseHandler.js";
import { assertSellerCanAccess } from "../services/sellerAccess.service.js";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return sendError(res, 401, "Authentication required. Please provide a valid access token");
  }

  try {
    const payload = jwt.verify(token, process.env.TOKEN as string) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch {
    return sendError(res, 403, "Invalid or expired access token");
  }
};

/**
 * Optional authentication middleware
 * If token is provided and valid, sets userId
 * If no token or invalid token, continues without userId (for public routes that can show personalized data)
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    // If no token, continue without userId
    (req as any).userId = undefined;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.TOKEN as string) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    // If token is invalid, continue without userId
    (req as any).userId = undefined;
    return next();
  }
};

export const authorize = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const user = await User.findByPk(userId, { include: [Role] });
    if (!user) return sendError(res, 404, "User account not found");

    const hasRole = (user as any).Roles.some((r: any) => roles.includes(r.name));
    if (!hasRole) return sendError(res, 403, "You do not have the required role to access this resource");

    // Attach user roles to request for use in controllers
    (req as any).userRoles = (user as any).Roles.map((r: any) => r.name);
    next();
  };
};

/**
 * Middleware to check if user is a seller
 * Must be used after authenticate middleware
 */
export const requireSeller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any).userId;
  const user = await User.findByPk(userId, { include: [Role] });
  
  if (!user) {
    return sendError(res, 404, "User account not found");
  }

  const userRoles = (user as any).Roles.map((r: any) => r.name);
  const isSeller = userRoles.includes("seller");

  if (!isSeller) {
    return sendError(res, 403, "Access denied. Seller role required.");
  }

  try {
    await assertSellerCanAccess(userId);
  } catch (error: unknown) {
    return handleControllerError(res, error, 403);
  }

  (req as any).userRoles = userRoles;
  next();
};
