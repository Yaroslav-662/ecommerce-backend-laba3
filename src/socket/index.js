// src/socket/index.js
import { Server as IOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import initAuth from "./auth.js";
import initRooms from "./rooms.js";
import initOrderEvents from "./events/orderEvents.js";
import initUserEvents from "./events/userEvents.js";
import initNotificationEvents from "./events/notificationEvents.js";
import initRedisAdapter from "./redisAdapter.js";
import { initMetrics } from "../monitoring/metrics.js";
import { setIO } from "./singleton.js"; // register io instance for other modules

export default function initSocket(server) {
  const io = new IOServer(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // expose io via singleton so controllers/workers can use getIo/setIo
  try {
    setIO(io);
  } catch (err) {
    console.warn("Warning: setIO failed", err?.message || err);
  }

  if (process.env.SOCKET_ADMIN === "true") {
    try {
      instrument(io, { auth: false });
      console.log("Socket Admin UI enabled");
    } catch (err) {
      console.warn("Socket Admin UI init failed:", err?.message || err);
    }
  }

  // Redis adapter init (optional)
  if (process.env.REDIS_URL) {
    initRedisAdapter(io).catch((err) => {
      console.error("Redis adapter init failed:", err);
    });
  } else {
    console.log("No REDIS_URL provided — running without Redis adapter");
  }

  // metrics (best-effort)
  try {
    initMetrics(io);
  } catch (err) {
    console.warn("initMetrics failed:", err?.message || err);
  }

  // Initialize auth before other event modules so socket.user is available
  try {
    initAuth(io);
    console.log("Socket auth middleware initialized");
  } catch (err) {
    console.error("initAuth error:", err?.message || err);
  }

  // Initialize rooms and domain event handlers (each is best-effort)
  try {
    initRooms(io);
    console.log("Rooms initialized");
  } catch (err) {
    console.error("initRooms error:", err?.message || err);
  }

  try {
    initOrderEvents(io);
    console.log("Order events initialized");
  } catch (err) {
    console.error("initOrderEvents error:", err?.message || err);
  }

  try {
    initUserEvents(io);
    console.log("User events initialized");
  } catch (err) {
    console.error("initUserEvents error:", err?.message || err);
  }

  try {
    initNotificationEvents(io);
    console.log("Notification events initialized");
  } catch (err) {
    console.error("initNotificationEvents error:", err?.message || err);
  }

  // Global connection logging
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} user=${socket.user?.id || "anon"}`);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} reason=${reason}`);
    });
  });

  return io;
}
