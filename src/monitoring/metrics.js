// src/monitoring/metrics.js
import client from "prom-client";

const collectDefault = client.collectDefaultMetrics;

// initialize default metrics
collectDefault({ timeout: 5000 });

const ioConnections = new client.Gauge({
  name: "socket_io_connections",
  help: "Number of active Socket.IO connections",
});

export function initMetrics(io) {
  setInterval(() => {
    try {
      const s = io.sockets?.sockets?.size || (io.of ? Object.keys(io.of("/").sockets || {}).length : 0);
      ioConnections.set(s || 0);
    } catch (e) {
      // ignore
    }
  }, 5000);
}

// Export an express handler to expose metrics
export function metricsHandler(req, res) {
  res.set("Content-Type", client.register.contentType);
  client.register.metrics().then((m) => res.send(m)).catch((err) => res.status(500).send(err.message));
}
