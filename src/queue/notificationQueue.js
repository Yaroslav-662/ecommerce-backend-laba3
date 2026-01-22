// src/queue/notificationQueue.js
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "../config/logger.js";

const redisUrl = process.env.REDIS_URL;

let connection = null;
let notificationQueue = null;

if (!redisUrl) {
  logger.warn("REDIS_URL not set -> notificationQueue disabled");
} else {
  connection = new IORedis(redisUrl, {
    // ✅ BullMQ best-practice
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
  });

  connection.on("error", (err) => {
    logger.error({ err }, "Redis connection error (BullMQ)");
  });

  notificationQueue = new Queue("notifications", { connection });
  logger.info("✅ notificationQueue enabled");
}

export { notificationQueue };

export async function addNotificationJob(payload) {
  // payload: { toUserId, type, title, body, meta }

  if (!notificationQueue) {
    // ✅ не валимо бекенд на Render
    logger.warn("notificationQueue is disabled -> job skipped");
    return { skipped: true, reason: "REDIS_DISABLED" };
  }

  return notificationQueue.add("sendNotification", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 500 },
    removeOnComplete: true,
    removeOnFail: 100,
  });
}
