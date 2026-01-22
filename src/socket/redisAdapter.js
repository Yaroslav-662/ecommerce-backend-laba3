// src/socket/redisAdapter.js
import { createAdapter } from "@socket.io/redis-adapter";
import { redis } from "../config/redis.js"; // або ../config/redis.ts якщо в тебе експорт через .js білд
// якщо в тебе redis.ts, але проект на commonjs/esmodule без білда ts -> краще зроби redis.js

export function attachRedisAdapter(io) {
  if (!process.env.REDIS_URL) {
    console.log("⚠ Redis adapter disabled (REDIS_URL not set)");
    return;
  }

  if (!redis) {
    console.log("⚠ Redis instance not created -> adapter skipped");
    return;
  }

  try {
    const pubClient = redis;
    const subClient = pubClient.duplicate();

    subClient.on("error", (err) => {
      console.warn("Redis subClient error:", err?.message || err);
    });

    io.adapter(createAdapter(pubClient, subClient));
    console.log("✅ Redis adapter enabled");
  } catch (err) {
    console.warn("⚠ Redis adapter failed, fallback to memory adapter:", err.message);
  }
}
