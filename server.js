// server.js
import "./src/config/db.js";
import app from "./src/app.js";
import { logger } from "./src/config/logger.js";
import dotenv from "dotenv";
import http from "http";

import initSocket from "./src/socket/index.js";
import { setIO } from "./src/socket/singleton.js";
import { startWorkers } from "./src/queue/worker.js";
import { metricsHandler } from "./src/monitoring/metrics.js";

dotenv.config();

// Create HTTP server
const server = http.createServer(app);

// Init Socket.IO with Redis, Auth, Events
const io = initSocket(server);

// Set global io instance for workers
setIO(io);

// Metrics endpoint
app.get("/metrics", metricsHandler);

// Start BullMQ workers (DO NOT pass io)
startWorkers();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server + WebSockets started on port ${PORT}`);
  console.log(`🚀 Server + WebSockets started on port ${PORT}`);
});
