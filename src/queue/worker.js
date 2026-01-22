import { Worker } from "bullmq";
import Notification from "../models/Notification.js";
import { io } from "../socket/singleton.js";
import { logger } from "../config/logger.js";

export const startWorkers = () => {
  // ✅ якщо Redis не налаштований — воркери не стартують
  if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not set -> BullMQ workers are disabled");
    return;
  }

  const notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { userId, title, message, type = "info" } = job.data;

      const notif = await Notification.create({
        user: userId,
        title,
        message,
        type,
      });

      if (io) {
        io.to(`user_${userId}`).emit("notification", notif);
      }

      return notif;
    },
    {
      // ✅ BullMQ найкраще працює з URL
      connection: {
        url: process.env.REDIS_URL,
      },
    }
  );

  notificationWorker.on("completed", (job) => {
    logger.info(`📨 Notification sent (Job ID: ${job.id})`);
  });

  notificationWorker.on("failed", (job, err) => {
    logger.error(`❌ Notification job failed: ${err.message}`);
  });

  // ✅ щоб не було "тихого падіння"
  notificationWorker.on("error", (err) => {
    logger.error({ err }, "❌ Notification worker error");
  });
};
