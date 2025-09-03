// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, Role } from "../model/relations";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number };
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

export const authorize = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
    const user = await User.findByPk(userId, { include: [Role] });
    if (!user) return res.status(404).json({ message: "User not found" });

    const hasRole = (user as any).Roles.some((r: any) => roles.includes(r.name));
    if (!hasRole) return res.status(403).json({ message: "Forbidden" });

    next();
  };
};
