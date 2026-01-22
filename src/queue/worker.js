// src/queue/worker.js
import { Worker } from "bullmq";
import IORedis from "ioredis";
import Notification from "../models/Notification.js";
import { io } from "../socket/singleton.js";
import { logger } from "../config/logger.js";

export const startWorkers = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("REDIS_URL not set -> workers disabled");
    return;
  }

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
  });

  connection.on("error", (err) => {
    logger.error({ err }, "Redis worker connection error");
  });

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
    { connection }
  );

  notificationWorker.on("completed", (job) => {
    logger.info(`📨 Notification sent (Job ID: ${job.id})`);
  });

  notificationWorker.on("failed", (job, err) => {
    logger.error(`❌ Notification job failed: ${err.message}`);
  });

  notificationWorker.on("error", (err) => {
    logger.error({ err }, "❌ Notification worker error");
  });
};
