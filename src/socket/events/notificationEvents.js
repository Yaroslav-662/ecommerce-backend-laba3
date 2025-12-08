import { addNotificationJob } from "../../queue/notificationQueue.js";
import Notification from "../../models/Notification.js"; // optional, may be undefined
import { io as ioWrapper } from "../singleton.js"; // if you use singleton wrapper; fallback to io param

export default function initNotificationEvents(io) {
  io.on("connection", (socket) => {
    socket.on("notification:send", async (payload, ack) => {
      // payload: { toUserId, type, title, body, meta, priority }
      try {
        if (!socket.user) {
          ack?.({ error: "Unauthorized" });
          return;
        }
        if (!payload || !payload.toUserId) {
          ack?.({ error: "Invalid payload" });
          return;
        }

        // Ensure payload has sender and timestamp
        const fullPayload = {
          ...payload,
          from: socket.user.id,
          ts: new Date(),
        };

        // Try queue if available
        if (typeof addNotificationJob === "function") {
          try {
            await addNotificationJob(fullPayload);
            ack?.({ ok: true, queued: true });
            return;
          } catch (qerr) {
            console.warn("notification:send queue failed, falling back:", qerr?.message || qerr);
            // continue to direct delivery
          }
        }

        // Fallback: persist (if model available) and emit realtime
        let saved = null;
        try {
          if (Notification && typeof Notification.create === "function") {
            saved = await Notification.create({
              user: payload.toUserId,
              type: payload.type || "info",
              title: payload.title || "",
              body: payload.body || "",
              meta: payload.meta || {},
              priority: payload.priority || "normal",
              from: socket.user.id,
            });
          }
        } catch (perr) {
          console.warn("notification persist failed:", perr?.message || perr);
        }

        // Use provided io instance or singleton wrapper if you use that
        const ioInstance = ioWrapper && ioWrapper.raw ? ioWrapper.raw : io;
        const userRoom = `user:${payload.toUserId}`;
        ioInstance.to(userRoom).emit("notification:received", { ...fullPayload, saved });

        ack?.({ ok: true, queued: false, saved: !!saved });
      } catch (err) {
        console.error("notification:send err", err);
        ack?.({ error: err.message });
      }
    });
  });
}
