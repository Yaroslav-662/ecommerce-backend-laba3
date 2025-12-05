// src/socket/events/orderEvents.js
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";

/**
 * Emits:
 * - order:created (to admin and user)
 * - order:updated (to user and admin)
 * - product:stockUpdated (when order paid/shipped)
 */

export default function initOrderEvents(io) {
  const nsp = io;

  // helper to broadcast order update
  async function broadcastOrderUpdate(orderId) {
    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) return;
    // user room
    const userRoom = `user:${order.user._id.toString()}`;
    nsp.to(userRoom).emit("order:updated", order);
    // admin channel
    nsp.to("admin").emit("order:updated", order);
    // broadcast a general event
    nsp.emit("order:updated:public", { id: order._id, status: order.status });
  }

  nsp.on("connection", (socket) => {
    socket.on("order:create", async (payload, ack) => {
      try {
        if (!socket.user) return ack?.({ error: "Unauthorized" });
        // payload: { items: [{product, quantity}], total }
        const order = await Order.create({
          user: socket.user.id,
          items: payload.items,
          total: payload.total,
        });

        // notify user and admins
        const userRoom = `user:${socket.user.id}`;
        nsp.to(userRoom).emit("order:created", order);
        nsp.to("admin").emit("order:created", order);

        // ack
        ack?.({ ok: true, order });
      } catch (err) {
        console.error("order:create error", err);
        ack?.({ error: err.message });
      }
    });

    socket.on("order:updateStatus", async (data, ack) => {
      try {
        const { orderId, status } = data;
        const order = await Order.findById(orderId);
        if (!order) return ack?.({ error: "Order not found" });

        // permission: only admin OR owner
        const isOwner = socket.user?.id === order.user.toString();
        const isAdmin = socket.user?.role === "admin";
        if (!isOwner && !isAdmin) return ack?.({ error: "Access denied" });

        order.status = status;
        await order.save();

        // optional: when marked 'paid' or 'shipped', update stock, notify product rooms
        if (status === "paid") {
          for (const it of order.items) {
            await Product.findByIdAndUpdate(it.product, { $inc: { stock: -Math.max(1, it.quantity) } });
            nsp.emit("product:stockUpdated", { productId: it.product, delta: -it.quantity });
          }
        }

        // broadcast
        await broadcastOrderUpdate(order._id);
        ack?.({ ok: true, order });
      } catch (err) {
        console.error("order:updateStatus", err);
        ack?.({ error: err.message });
      }
    });
  });
}
