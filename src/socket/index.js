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

  if (process.env.SOCKET_ADMIN === "true") {
    instrument(io, { auth: false });
  }

  if (process.env.REDIS_URL) {
    initRedisAdapter(io).catch((err) => {
      console.error("Redis adapter init failed:", err);
    });
  }

  initMetrics(io);
  initAuth(io);
  initRooms(io);
  initOrderEvents(io);
  initUserEvents(io);
  initNotificationEvents(io);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} user=${socket.user?.id || "anon"}`);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} reason=${reason}`);
    });
  });

  return io;
}
