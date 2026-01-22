// src/config/redis.ts
import Redis from "ioredis";
import { logger } from "./logger.js";

export function createRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    logger.warn("REDIS_URL is not set -> Redis disabled");
    return null;
  }

  const redis = new Redis(url, {
    // важливо для хмарних Redis
    enableReadyCheck: true,
    connectTimeout: 10_000,

    // щоб НЕ було нескінченних ретраїв і підвисань на старті
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      // 0..5 спроб, далі перестаємо душити процес
      if (times > 5) return null;
      return Math.min(times * 500, 2000);
    },

    // якщо Upstash/rediss:// -> TLS ок автоматом
    // але якщо в тебе URL типу redis:// і провайдер вимагає TLS — буде фейл.
    tls: url.startsWith("rediss://") ? {} : undefined,
  });

  redis.on("error", (err) => {
    logger.error({ err }, "Redis error (non-fatal)");
  });

  redis.on("connect", () => logger.info("Redis connecting..."));
  redis.on("ready", () => logger.info("Redis ready"));

  return redis;
}

export const redis = createRedis();
