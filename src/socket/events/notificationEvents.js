import Notification from "../../models/Notification.js";

export default function initNotificationEvents(io) {
  io.on("connection", (socket) => {  
    console.log("🔌 User connected for notifications:", socket.id);

    // ---- JOIN USER ROOM ----
    socket.on("user:join", (userId) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`User ${socket.id} joined room user:${userId}`);
    });

    // ---- SEND NOTIFICATION ----
    socket.on("notification:send", async (payload, ack) => {
      try {
        if (!socket.user) {
          ack?.({ error: "Unauthorized" });
          return;
        }

        if (!payload || !payload.toUserId) {
          ack?.({ error: "Invalid payload" });
          return;
        }

        const fullPayload = {
          ...payload,
          from: socket.user.id,
          ts: new Date(),
        };

        // ---- SAVE TO DATABASE ----
        let saved = null;
        try {
          saved = await Notification.create({
            user: payload.toUserId,
            type: payload.type || "info",
            title: payload.title || "",
            body: payload.body || "",
            meta: payload.meta || {},
            priority: payload.priority || "normal",
            from: socket.user.id,
          });
        } catch (err) {
          console.warn("❗Failed to save notification:", err?.message);
        }

        // ---- REALTIME EMIT ----
        const room = `user:${payload.toUserId}`;
        io.to(room).emit("notification:received", {
          ...fullPayload,
          saved,
        });

        ack?.({ ok: true, saved: !!saved });

      } catch (err) {
        console.error("notification:send error:", err);
        ack?.({ error: err.message });
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });
}
