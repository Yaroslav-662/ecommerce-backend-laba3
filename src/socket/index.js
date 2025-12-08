// src/socket/index.js
import { Server as IOServer } from "socket.io";
import { instrument } from "@socket.io/admin-ui";

import initAuth from "./auth.js";
import initRooms from "./rooms.js";
import initOrderEvents from "./events/orderEvents.js";
import initUserEvents from "./events/userEvents.js";
import initNotificationEvents from "./events/notificationEvents.js";

import { initMetrics } from "../monitoring/metrics.js";
import { setIO } from "./singleton.js";

export default function initSocket(server) {
  const io = new IOServer(server, {
    path: "/socket.io",
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Expose global io reference
  setIO(io);

  // Admin UI (optional)
  if (process.env.SOCKET_ADMIN === "true") {
    instrument(io, { auth: false });
    console.log("🛠 Socket Admin UI enabled");
  }

  // ====== Redis Disabled for Render ======
  console.log("⚠️ Redis disabled — running single-instance Socket.IO");

  // ====== Metrics (optional) ======
  try {
    initMetrics(io);
  } catch (e) {
    console.log("Metrics disabled");
  }

  // ====== Initialize middlewares & events ======
  initAuth(io);                // JWT auth
  initRooms(io);               // rooms, presence
  initOrderEvents(io);         // order:created, order:updated
  initUserEvents(io);          // message, typing, online
  initNotificationEvents(io);  // notification:send (realtime)

  // ====== Connection logs ======
  io.on("connection", (socket) => {
    console.log(
      `🔌 Socket connected: ${socket.id} user=${socket.user?.id || "anon"}`
    );

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}, reason=${reason}`);
    });
  });

  return io;
}
