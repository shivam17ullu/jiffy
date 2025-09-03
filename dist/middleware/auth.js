import jwt from "jsonwebtoken";
const JWT_SECRET = "supersecret";
export const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "No token provided" });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    }
    catch {
        return res.status(403).json({ error: "Invalid token" });
    }
};
