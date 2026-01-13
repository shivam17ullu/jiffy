// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role } from "../model/relations.js";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.TOKEN as string) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
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
    if (!user) return res.status(404).json({ message: "User not found" });

    const hasRole = (user as any).Roles.some((r: any) => roles.includes(r.name));
    if (!hasRole) return res.status(403).json({ message: "Forbidden" });

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
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const userRoles = (user as any).Roles.map((r: any) => r.name);
  const isSeller = userRoles.includes("seller");

  if (!isSeller) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Seller role required.",
    });
  }

  // Attach user roles to request
  (req as any).userRoles = userRoles;
  next();
};
