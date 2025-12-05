// src/socket/events/notificationEvents.js
import { addNotificationJob } from "../../queue/notificationQueue.js";

/**
 * Realtime notifications module.
 * Emits:
 * - notification:received to user room on creation
 */
export default function initNotificationEvents(io) {
  io.on("connection", (socket) => {
    socket.on("notification:send", async (payload, ack) => {
      // payload: { toUserId, type, title, body, meta }
      if (!socket.user) return ack?.({ error: "Unauthorized" });

      // enqueue notification so worker will persist + send (email/push) and real-time emit
      try {
        await addNotificationJob(payload);
        ack?.({ ok: true });
      } catch (err) {
        console.error("notification:send err", err);
        ack?.({ error: err.message });
      }
    });
  });
}
