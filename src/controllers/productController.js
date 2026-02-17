// src/controllers/productController.js
import Product from "../models/Product.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import socket from "../socket/index.js"; // singleton: export default { io }
import createDebug from "debug";
import Category from "../models/Category.js";

const debug = createDebug("app:productController");

// optional Redis cache (if you have it configured)
let redisClient;
try {
  const IORedis = await import("ioredis").then(m => m.default);
  redisClient = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
  debug("Redis client initialized for productController");
} catch (e) {
  debug("No redis available, using in-memory cache");
}

/** In-memory cache fallback */
const memCache = {
  productsList: null,
  ttl: 60 * 1000,
  ts: 0,
};

const setCache = async (key, value, ttl = 60) => {
  if (redisClient) {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } else {
    memCache[key] = value;
    memCache.ts = Date.now() + ttl * 1000;
  }
};

const getCache = async (key) => {
  if (redisClient) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } else {
    if (memCache.ts > Date.now()) return memCache[key];
    return null;
  }
};

// helper
const escapeRegex = (str = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/products
 */
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      q,
      category,
      sort = "-createdAt",
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const queryText = typeof q === "string" ? q.trim() : "";
    const hasQ = queryText.length > 0;

    const allowedSort = new Set([
      "-createdAt",
      "createdAt",
      "-price",
      "price",
      "name",
      "-name",
    ]);
    const safeSort = allowedSort.has(sort) ? sort : "-createdAt";

    const cacheKey =
      !hasQ && !category
        ? `products:page:${pageNum}:limit:${limitNum}:sort:${safeSort}`
        : null;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const filter = {};

    if (hasQ) {
      const safe = escapeRegex(queryText);
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    if (typeof category === "string" && category.trim()) {
      const catValue = category.trim();

      if (validateObjectId(catValue)) {
        filter.category = catValue;
      } else {
        const cat = await Category.findOne({
          $or: [{ name: catValue }, { slug: catValue }],
        })
          .select("_id")
          .lean();

        if (!cat) {
          return res.json({
            total: 0,
            page: pageNum,
            totalPages: 0,
            products: [],
          });
        }

        filter.category = cat._id;
      }
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("name price category images stock createdAt description")
        .populate("category", "name")
        .sort(safeSort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const result = {
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      products,
    };

    if (cacheKey) await setCache(cacheKey, result, 60);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const cacheKey = `product:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(id)
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await setCache(cacheKey, product, 300);
    res.json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/products (admin)
 * ✔ підтримує Cloudinary (req.files)
 */
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description = "",
      price,
      category,
      stock = 0,
    } = req.body;

    if (!name || typeof price === "undefined") {
      return res.status(400).json({ message: "Name and price required" });
    }

    // 🔥 НОВЕ: фото з Cloudinary
    const images = req.files
      ? req.files.map(file => file.path)
      : [];

    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock,
      images,
    });

    if (redisClient) {
      await redisClient.delPattern?.("products*").catch(() => {});
    } else {
      memCache.productsList = null;
    }

    if (socket?.io) {
      socket.io.emit("products:created", product);
      socket.io.to("admins").emit("admin:product:created", product);
    }

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/products/:id (admin)
 * ✔ підтримує оновлення фото
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const updateData = { ...req.body };

    // 🔥 НОВЕ: якщо прийшли нові фото
    if (req.files?.length) {
      updateData.images = req.files.map(file => file.path);
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (redisClient) {
      await Promise.all([
        redisClient.del(`product:${id}`),
        redisClient.delPattern?.("products*").catch(() => {}),
      ]).catch(() => {});
    } else {
      memCache.productsList = null;
      memCache[`product:${id}`] = null;
    }

    if (socket?.io) {
      socket.io.emit("products:updated", updated);
      socket.io.to("admins").emit("admin:product:updated", updated);
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/products/:id (admin)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const removed = await Product.findByIdAndDelete(id).lean();
    if (!removed) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (redisClient) {
      await Promise.all([
        redisClient.del(`product:${id}`),
        redisClient.delPattern?.("products*").catch(() => {}),
      ]).catch(() => {});
    } else {
      memCache.productsList = null;
      memCache[`product:${id}`] = null;
    }

    if (socket?.io) {
      socket.io.emit("products:deleted", { id });
      socket.io.to("admins").emit("admin:product:deleted", { id });
    }

    res.json({ message: "Product deleted", id });
  } catch (error) {
    next(error);
  }
};
