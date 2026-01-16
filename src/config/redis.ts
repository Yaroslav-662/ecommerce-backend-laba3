// src/config/redis.ts
import Redis from "ioredis";

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })
  : null;
