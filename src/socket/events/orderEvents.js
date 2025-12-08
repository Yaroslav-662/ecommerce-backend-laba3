// src/socket/events/orderEvents.js
import Order from "../../models/Order.js";
import Product from "../../models/Product.js";

export default function initOrderEvents(io) {
  io.on("connection", (socket) => {

    /**
     * CREATE ORDER — SOCKET
     */
    socket.on("order:create", async (payload, ack) => {
      try {
        if (!socket.user) return ack?.({ error: "Unauthorized" });

        const { items, shippingAddress, paymentMethod, total } = payload;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return ack?.({ error: "Order must contain items" });
        }

        for (const item of items) {
          if (!item.price) return ack?.({ error: "Item must contain price" });
          const product = await Product.findById(item.product);
          if (!product) return ack?.({ error: `Product not found: ${item.product}` });
        }

        const order = await Order.create({
          user: socket.user.id,
          items,
          total,
          shippingAddress,
          paymentMethod,
          status: "pending",
        });

        const userRoom = `user:${socket.user.id}`;
        io.to(userRoom).emit("order:created", order);
        io.to("admin").emit("order:created", order);

        ack?.({ ok: true, order });
      } catch (err) {
        console.error("order:create error", err);
        ack?.({ error: err.message });
      }
    });

    /**
     * UPDATE ORDER STATUS
     */
    socket.on("order:updateStatus", async ({ orderId, status }, ack) => {
      try {
        const order = await Order.findById(orderId);
        if (!order) return ack?.({ error: "Order not found" });

        const isOwner = socket.user?.id === order.user.toString();
        const isAdmin = socket.user?.role === "admin";

        if (!isOwner && !isAdmin) {
          return ack?.({ error: "Access denied" });
        }

        order.status = status;
        await order.save();

        io.to(`user:${order.user}`).emit("order:updated", order);
        io.to("admin").emit("order:updated", order);

        ack?.({ ok: true, order });
      } catch (err) {
        ack?.({ error: err.message });
      }
    });
  });
}
