// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

/**
 * ✅ Middleware: verify JWT (Bearer OR Cookie)
 * - Bearer: Authorization: Bearer <token>
 * - Cookie: accessToken=<token>
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    const cookieToken = req.cookies?.accessToken || null;

    const token = cookieToken || bearerToken;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // ⚠️ ВАЖЛИВО: має збігатися з generateAccessToken()
    // у тебе зараз jwt.verify(..., process.env.JWT_SECRET)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded має містити хоча б id + role
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * ✅ Middleware: admin only
 */
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    return next();
  } catch (err) {
    console.error("Admin check error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
