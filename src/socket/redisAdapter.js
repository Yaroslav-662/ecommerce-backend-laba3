// src/socket/redisAdapter.js
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

export async function attachRedisAdapter(io) {
  if (!redis) {
    logger.warn("Redis disabled -> Socket.IO without redis-adapter");
    return;
  }

  // Для адаптера треба pub/sub, робимо дублікат
  const pubClient = redis;
  const subClient = pubClient.duplicate();

  subClient.on("error", (err) => logger.error({ err }, "Redis subClient error"));

  try {
    // ioredis підключається сам, але duplicate краще дочекатись
    await subClient.connect?.().catch(() => {});
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO redis-adapter enabled");
  } catch (e) {
    logger.error({ e }, "Failed to enable redis-adapter -> fallback to memory adapter");
    // ВАЖЛИВО: не валимо процес
  }
}
