import jwt from "jsonwebtoken";
import { User, Role } from "../model/relations.js";
export const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const payload = jwt.verify(token, process.env.TOKEN);
        req.userId = payload.userId;
        next();
    }
    catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};
export const authorize = (roles) => {
    return async (req, res, next) => {
        const userId = req.userId;
        const user = await User.findByPk(userId, { include: [Role] });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const hasRole = user.Roles.some((r) => roles.includes(r.name));
        if (!hasRole)
            return res.status(403).json({ message: "Forbidden" });
        next();
    };
};
