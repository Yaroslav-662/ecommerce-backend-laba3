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

    // ====== MESSAGE EVENT (UNIVERSAL) ======
    socket.on("message", (data) => {
      try {
        console.log("MESSAGE EVENT:", data);

        // Якщо дані не є об’єктом
        if (!data || typeof data !== "object") return;

        // Якщо є кімната → відправити у кімнату
        if (data.room) {
          io.to(data.room).emit("message", data);
        } else {
          // Якщо немає room → broadcast всім
          io.emit("message", data);
        }
      } catch (err) {
        console.error("message error:", err);
      }
    });

    // ====== TYPING ======
    socket.on("typing", (payload) => {
      try {
        if (payload?.toUserId) {
          socket.to(`user:${payload.toUserId}`).emit("typing", {
            from: socket.user?.id || null,
          });
        }
      } catch (err) {
        console.error("typing error:", err);
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
