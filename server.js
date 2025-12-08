// server.js
import "./src/config/db.js";
import app from "./src/app.js";
import { logger } from "./src/config/logger.js";
import dotenv from "dotenv";
import http from "http";

import initSocket from "./src/socket/index.js";
import { setIO } from "./src/socket/singleton.js";
import { metricsHandler } from "./src/monitoring/metrics.js";

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Init Socket.IO (no Redis)
const io = initSocket(server);

// Make io globally accessible
setIO(io);

// Metrics endpoint
app.get("/metrics", metricsHandler);

// -----------------------------
// 🚫 DO NOT run workers on Render
// -----------------------------
if (process.env.REDIS_URL) {
  console.log("🟢 Redis detected → Workers starting...");
  const { startWorkers } = await import("./src/queue/worker.js");
  startWorkers();
} else {
  console.log("⚠ No REDIS_URL → Workers DISABLED on Render");
}

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server + WebSockets started on port ${PORT}`);
  console.log(`🚀 Server + WebSockets started on port ${PORT}`);
});
