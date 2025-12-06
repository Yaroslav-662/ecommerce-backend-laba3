import { Worker } from "bullmq";
import Notification from "../models/Notification.js";
import { io } from "../socket/singleton.js";
import { logger } from "../config/logger.js";

export const startWorkers = () => {
  // 🔥 Worker for notifications
  const notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { userId, title, message, type = "info" } = job.data;

      // Save to DB
      const notif = await Notification.create({
        user: userId,
        title,
        message,
        type,
      });

      // Send via WebSocket
      if (io) {
        io.to(`user_${userId}`).emit("notification", notif);
      }

      return notif;
    },
    {
      connection: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
      },
    }
  );

  notificationWorker.on("completed", (job) => {
    logger.info(`📨 Notification sent (Job ID: ${job.id})`);
  });

  notificationWorker.on("failed", (job, err) => {
    logger.error(`❌ Notification job failed: ${err.message}`);
  });
};
