// src/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import socket from "../socket/index.js"; // <-- SOCKET.IO SINGLETON

/**
 * =============================
 * CREATE ORDER
 * =============================
 */
export const createOrder = async (req, res, next) => {
  try {
    const { items, totalPrice } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    // Validate products exist
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }
    }

    const order = await Order.create({
      user: req.user.id,
      items,
      total: totalPrice,
      status: "pending",
    });

    // === SOCKET.IO: real-time event ===
    socket.io.to(`user_${req.user.id}`).emit("order:new", order);
    socket.io.to("admins").emit("order:new", order);

    return res.status(201).json(order);
  } catch (error) {
    console.error("Create order error:", error);
    next(error);
  }
};

/**
 * =============================
 * GET USER ORDERS
 * =============================
 */
export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product");

    return res.json(orders);
  } catch (error) {
    next(error);
  }
};

/**
 * =============================
 * GET ALL ORDERS (admin only)
 * =============================
 */
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price");

    return res.json(orders);
  } catch (error) {
    next(error);
  }
};

/**
 * =============================
 * UPDATE ORDER STATUS
 * =============================
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const order = await Order.findById(id).populate("user", "id");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Owner OR admin can update
    if (order.user._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    order.status = status || order.status;
    await order.save();

    // SOCKET: notify user + admins
    socket.io.to(`user_${order.user._id}`).emit("order:update", order);
    socket.io.to("admins").emit("order:update", order);

    return res.json({
      message: "Order status updated",
      order,
    });
  } catch (error) {
    next(error);
  }
};
