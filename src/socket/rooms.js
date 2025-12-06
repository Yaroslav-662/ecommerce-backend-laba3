// src/socket/rooms.js
/**
 * Rooms strategy:
 * - `user:<userId>` — personal room
 * - `order:<orderId>` — order updates
 * - `product:<productId>` — product stock updates
 * - `admin` — admin channel
 */

export default function initRooms(io) {
  io.on("connection", (socket) => {
    // auto-join personal room if authenticated
    if (socket.user?.id) {
      const personal = `user:${socket.user.id}`;
      socket.join(personal);
      // notify others that user is online
      io.emit("presence:update", { userId: socket.user.id, status: "online" });
    }

    socket.on("joinRoom", (room) => {
      // validations optional
      socket.join(room);
      socket.emit("joined", room);
    });

    socket.on("leaveRoom", (room) => {
      socket.leave(room);
      socket.emit("left", room);
    });

    socket.on("disconnect", () => {
      if (socket.user?.id) {
        io.emit("presence:update", { userId: socket.user.id, status: "offline" });
      }
    });
  });
}
