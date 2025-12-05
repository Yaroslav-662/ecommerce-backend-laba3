// src/queue/notificationQueue.js
import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisOpts = { connection: process.env.REDIS_URL || "redis://127.0.0.1:6379" };
const connection = new IORedis(redisOpts.connection || redisOpts);

export const notificationQueue = new Queue("notifications", { connection });

export async function addNotificationJob(payload) {
  // payload: { toUserId, type, title, body, meta }
  return notificationQueue.add("sendNotification", payload, { attempts: 3, backoff: { type: "exponential", delay: 500 } });
}
