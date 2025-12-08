import User from "../../models/User.js";

export default function initUserEvents(io) {
  io.on("connection", (socket) => {
    if (socket.user?.id) {
      User.findByIdAndUpdate(socket.user.id, { $set: { online: true } });
    }

    // ====== ТЕСТОВА ПОДІЯ MESSAGE ======
    socket.on("message", (data) => {
      console.log("MESSAGE EVENT:", data);

      if (data.room) {
        io.to(data.room).emit("message", data);
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
