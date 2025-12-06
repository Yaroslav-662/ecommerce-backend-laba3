// src/socket/events/userEvents.js
import User from "../../models/User.js";

export default function initUserEvents(io) {
  io.on("connection", (socket) => {
    // update presence when connected (auth middleware sets socket.user)
    if (socket.user?.id) {
      // mark user online in DB (lightweight)
      User.findByIdAndUpdate(socket.user.id, { $set: { lastOnlineAt: new Date(), isActive: true } }).catch(() => {});
    }

    socket.on("typing", (payload) => {
      // payload: { toUserId } -> forward typing event to personal room
      if (payload?.toUserId) {
        socket.to(`user:${payload.toUserId}`).emit("typing", { from: socket.user?.id });
      }
    });

    socket.on("disconnect", () => {
      if (socket.user?.id) {
        User.findByIdAndUpdate(socket.user.id, { $set: { lastOnlineAt: new Date(), isActive: false } }).catch(() => {});
      }
    });
  });
}
