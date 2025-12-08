// src/socket/index.js
import { Server as IOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import initAuth from "./auth.js";
import initRooms from "./rooms.js";
import initOrderEvents from "./events/orderEvents.js";
import initUserEvents from "./events/userEvents.js";
import initNotificationEvents from "./events/notificationEvents.js";
import { initMetrics } from "../monitoring/metrics.js";

// Redis adapter (вимкнено на час Render)
import initRedisAdapter from "./redisAdapter.js";

export default function initSocket(server) {
  const io = new IOServer(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // важливо для Render
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Вмикаємо Socket.io Admin Panel (опціонально)
  if (process.env.SOCKET_ADMIN === "true") {
    instrument(io, { auth: false });
  }

  // =============================
  // 🚫 REDIS ВИМКНЕНО ДЛЯ RENDER
  // =============================
  console.log("⚠️ Redis adapter disabled (Render does not support localhost Redis)");

  /*
  // Якщо буде Redis Cloud → розкоментуй
  if (process.env.REDIS_URL) {
    initRedisAdapter(io)
      .then(() => console.log("Redis adapter enabled"))
      .catch((err) => console.error("Redis adapter init failed:", err));
  }
  */

  // Ініціалізація всіх модулів Socket.io
  initMetrics(io);
  initAuth(io);
  initRooms(io);
  initOrderEvents(io);
  initUserEvents(io);
  initNotificationEvents(io);

  // Логування підключення
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} user=${socket.user?.id || "anon"}`);

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}, reason=${reason}`);
    });
  });

  return io;
}
