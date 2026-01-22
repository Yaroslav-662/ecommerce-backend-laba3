// src/routes/healthRoutes.js
import express from "express";
import mongoose from "mongoose";
import { redis } from "../config/redis.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  let redisStatus = "disabled";

  try {
    if (redis) {
      const pong = await redis.ping();
      redisStatus = pong === "PONG" ? "ready" : "unknown";
    }
  } catch (e) {
    redisStatus = "error";
  }

  res.json({
    ok: true,
    mongo: mongoose.connection.readyState, // 1 = connected
    redis: redisStatus,
    uptime: process.uptime(),
    time: new Date().toISOString(),
  });
});

export default router;
