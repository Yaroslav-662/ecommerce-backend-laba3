import User from "../../models/User.js";

export default function initUserEvents(io) {
  io.on("connection", (socket) => {

    // ====== ONLINE STATUS ======
    if (socket.user?.id) {
      User.findByIdAndUpdate(
        socket.user.id,
        { $set: { online: true, lastOnlineAt: new Date() } }
      ).catch(() => {});
    }

    // ====== MESSAGE EVENT (UNIVERSAL) with ACK ======
    // signature: (data, ack)
    socket.on("message", (data, ack) => {
      try {
        console.log("MESSAGE EVENT:", data);

        // validate
        if (!data || typeof data !== "object") {
          ack?.({ error: "Invalid payload" });
          return;
        }

        // attach metadata
        const payload = {
          ...data,
          from: socket.user?.id || null,
          ts: new Date(),
        };

        if (payload.room) {
          io.to(payload.room).emit("message", payload);
        } else {
          io.emit("message", payload);
        }

        // send ack
        ack?.({ ok: true, sentTo: payload.room ? `room:${payload.room}` : "broadcast" });
      } catch (err) {
        console.error("message error:", err);
        ack?.({ error: err.message });
      }
    });

    // ====== TYPING ======
    // Support two modes:
    // - If payload.room present -> emit to room
    // - Else if payload.toUserId present -> emit to personal user room
    socket.on("typing", (payload, ack) => {
      try {
        if (!payload || typeof payload !== "object") {
          ack?.({ error: "Invalid payload" });
          return;
        }

        // room-based typing (helps testing without JWT)
        if (payload.room) {
          io.to(payload.room).emit("typing", { from: socket.user?.id || null, room: payload.room });
          ack?.({ ok: true, mode: "room" });
          return;
        }

        // personal typing (requires socket.user and that target user's room exists)
        if (payload.toUserId) {
          io.to(`user:${payload.toUserId}`).emit("typing", { from: socket.user?.id || null });
          ack?.({ ok: true, mode: "personal" });
          return;
        }

        ack?.({ error: "No target specified (room or toUserId)" });
      } catch (err) {
        console.error("typing error:", err);
        ack?.({ error: err.message });
      }
    });

    // ====== whoami helper (ack) ======
    socket.on("whoami", (ack) => {
      try {
        const info = socket.user ? { id: socket.user.id, email: socket.user.email, role: socket.user.role } : null;
        ack?.(null, info);
      } catch (err) {
        console.error("whoami error", err);
        ack?.(err);
      }
    });

    // ====== DISCONNECT ======
    socket.on("disconnect", () => {
      if (socket.user?.id) {
        User.findByIdAndUpdate(
          socket.user.id,
          { $set: { online: false, lastOnlineAt: new Date() } }
        ).catch(() => {});
      }
    });
  });
}
