import User from "../../models/User.js";

export default function initUserEvents(io) {
  io.on("connection", (socket) => {
    if (socket.user?.id) {
      User.findByIdAndUpdate(socket.user.id, { $set: { online: true } });
    }

    // ====== УНІВЕРСАЛЬНА ПОДІЯ MESSAGE ======
    socket.on("message", (data) => {
      console.log("MESSAGE EVENT:", data);

      try {
        if (data?.room) {
          // якщо є room → шлемо в кімнату
          io.to(data.room).emit("message", data);
        } else {
          // якщо room немає → шлемо всім
          io.emit("message", data);
        }
      } catch (err) {
        console.error("Message handler error:", err);
      }
    });

    // typing подія
    socket.on("typing", (payload) => {
      if (payload?.toUserId) {
        socket.to(`user:${payload.toUserId}`).emit("typing", payload);
      }
    });

    socket.on("disconnect", () => {
      if (socket.user?.id) {
        User.findByIdAndUpdate(socket.user.id, { $set: { online: false } });
      }
    });
  });
}
