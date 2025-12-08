// src/socket/index.js
import { Server as IOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import initAuth from "./auth.js";
import initRooms from "./rooms.js";
import initOrderEvents from "./events/orderEvents.js";
import initUserEvents from "./events/userEvents.js";
import initNotificationEvents from "./events/notificationEvents.js";

import { initMetrics } from "../monitoring/metrics.js";
import { setIO } from "./singleton.js"; // global io reference

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

  // Store global io instance
  setIO(io);

  // Admin UI (optional)
  if (process.env.SOCKET_ADMIN === "true") {
    try {
      instrument(io, { auth: false });
      console.log("🔧 Admin UI enabled");
    } catch (err) {
      console.warn("Admin UI failed:", err.message);
    }
  }

  // No Redis on Render
  console.log("⚠ Redis adapter disabled (no REDIS_URL)");

  // Metrics
  try {
    initMetrics(io);
  } catch (err) {
    console.warn("Metrics init failed:", err.message);
  }

  // Middleware: Auth must go first
  try {
    initAuth(io);
    console.log("🔐 Auth middleware ready");
  } catch (err) {
    console.error("initAuth error:", err.message);
  }

  // Rooms
  try {
    initRooms(io);
    console.log("📡 Rooms ready");
  } catch (err) {
    console.error("initRooms error:", err.message);
  }

  // Domain events
  try {
    initOrderEvents(io);
    console.log("📦 Order events ready");
  } catch (err) {
    console.error("initOrderEvents error:", err.message);
  }

  try {
    initUserEvents(io);
    console.log("👤 User events ready");
  } catch (err) {
    console.error("initUserEvents error:", err.message);
  }

  try {
    initNotificationEvents(io);
    console.log("🔔 Notification events ready");
  } catch (err) {
    console.error("initNotificationEvents error:", err.message);
  }

  // Global logging
  io.on("connection", (socket) => {
    console.log(
      `⚡ Socket connected: ${socket.id}, user=${socket.user?.id || "anon"}`
    );

    socket.on("disconnect", (reason) => {
      console.log(`⚡ Socket disconnected: ${socket.id}, reason=${reason}`);
    });
  });

  return io;
}
