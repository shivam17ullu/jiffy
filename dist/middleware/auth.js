import jwt from "jsonwebtoken";
import { User, Role } from "../model/relations.js";
import { sendError, handleControllerError } from "./responseHandler.js";
import { assertSellerCanAccess } from "../services/sellerAccess.service.js";
export const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return sendError(res, 401, "Authentication required. Please provide a valid access token");
    }
    try {
        const payload = jwt.verify(token, process.env.TOKEN);
        req.userId = payload.userId;
        next();
    }
    catch {
        return sendError(res, 403, "Invalid or expired access token");
    }
};
/**
 * Optional authentication middleware
 * If token is provided and valid, sets userId
 * If no token or invalid token, continues without userId (for public routes that can show personalized data)
 */
export const optionalAuthenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        // If no token, continue without userId
        req.userId = undefined;
        return next();
    }
    try {
        const payload = jwt.verify(token, process.env.TOKEN);
        req.userId = payload.userId;
        next();
    }
    catch (err) {
        // If token is invalid, continue without userId
        req.userId = undefined;
        return next();
    }
};
export const authorize = (roles) => {
    return async (req, res, next) => {
        const userId = req.userId;
        const user = await User.findByPk(userId, { include: [Role] });
        if (!user)
            return sendError(res, 404, "User account not found");
        const hasRole = user.Roles.some((r) => roles.includes(r.name));
        if (!hasRole)
            return sendError(res, 403, "You do not have the required role to access this resource");
        // Attach user roles to request for use in controllers
        req.userRoles = user.Roles.map((r) => r.name);
        next();
    };
};
/**
 * Middleware to check if user is a seller
 * Must be used after authenticate middleware
 */
export const requireSeller = async (req, res, next) => {
    const userId = req.userId;
    const user = await User.findByPk(userId, { include: [Role] });
    if (!user) {
        return sendError(res, 404, "User account not found");
    }
    const userRoles = user.Roles.map((r) => r.name);
    const isSeller = userRoles.includes("seller");
    if (!isSeller) {
        return sendError(res, 403, "Access denied. Seller role required.");
    }
    try {
        await assertSellerCanAccess(userId);
    }
    catch (error) {
        return handleControllerError(res, error, 403);
    }
    req.userRoles = userRoles;
    next();
};
