// src/socket/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Usage: initAuth(io) - sets io.use(async (socket, next) => {...})
 * It decodes Bearer token from query or headers.
 */
export default function initAuth(io) {
  io.use(async (socket, next) => {
    try {
      // token can be in socket.handshake.auth.token or in query
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.query && socket.handshake.query.token) ||
        null;

      if (!token) {
        // allow unauthenticated sockets for public rooms — but mark as guest
        socket.user = null;
        return next();
      }

      const parsed = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
      const decoded = jwt.verify(parsed, process.env.JWT_SECRET);
      // attach user object (minimal)
      const user = await User.findById(decoded.id).select("-password -twoFactor.secret");
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
      return next();
    } catch (err) {
      console.warn("Socket auth failed:", err.message);
      // reject connection when token invalid
      return next(new Error("Authentication error"));
    }
  });
}
