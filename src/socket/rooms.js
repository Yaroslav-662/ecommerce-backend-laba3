/**
 * Rooms strategy:
 * - `user:<userId>` — personal room
 * - `order:<orderId>` — order updates
 * - `product:<productId>` — product stock updates
 * - `admin` — admin channel
 */

export default function initRooms(io) {
  io.on("connection", (socket) => {
    try {
      // auto-join personal room if authenticated
      if (socket.user?.id) {
        const personal = `user:${socket.user.id}`;
        socket.join(personal);
        // notify others that user is online
        io.emit("presence:update", { userId: socket.user.id, status: "online", at: new Date() });
        console.log(`Socket ${socket.id} joined personal room ${personal}`);
      }
    } catch (err) {
      console.error("initRooms: auto-join error", err);
    }

    // join room with optional ack
    socket.on("joinRoom", (room, ack) => {
      try {
        if (!room || typeof room !== "string") {
          ack?.({ error: "Invalid room" });
          return;
        }
        socket.join(room);
        socket.emit("joined", room);
        ack?.({ ok: true, room });
      } catch (err) {
        console.error("joinRoom error", err);
        ack?.({ error: err.message });
      }
    });

    // leave room with optional ack
    socket.on("leaveRoom", (room, ack) => {
      try {
        socket.leave(room);
        socket.emit("left", room);
        ack?.({ ok: true, room });
      } catch (err) {
        console.error("leaveRoom error", err);
        ack?.({ error: err.message });
      }
    });

    socket.on("disconnect", () => {
      try {
        if (socket.user?.id) {
          io.emit("presence:update", { userId: socket.user.id, status: "offline", at: new Date() });
        }
      } catch (err) {
        console.error("rooms disconnect error", err);
      }
    });
  });
}
