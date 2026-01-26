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
  // eslint-disable-next-line import/no-extraneous-dependencies
  const IORedis = await import("ioredis").then(m => m.default);
  redisClient = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
  debug("Redis client initialized for productController");
} catch (e) {
  debug("No redis available, using in-memory cache");
}

/** In-memory cache fallback */
const memCache = {
  productsList: null,
  ttl: 60 * 1000, // 1 minute
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
// helper: escape regex special chars
const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// GET /api/products
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
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12)); // захист
    const skip = (pageNum - 1) * limitNum;

    // Нормалізуємо q: якщо пусто -> undefined (поверне все)
    const queryText = typeof q === "string" ? q.trim() : "";
    const hasQ = queryText.length > 0;

    // allowlist для sort (щоб не передавали "що завгодно")
    const allowedSort = new Set([
      "-createdAt",
      "createdAt",
      "-price",
      "price",
      "name",
      "-name",
    ]);
    const safeSort = allowedSort.has(sort) ? sort : "-createdAt";

    // cache only when no filters
    const cacheKey = !hasQ && !category
      ? `products:page:${pageNum}:limit:${limitNum}:sort:${safeSort}`
      : null;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const filter = {};

    // ✅ Пошук "схоже": якщо q не задано -> НЕ фільтруємо => всі товари
    if (hasQ) {
      const safe = escapeRegex(queryText);
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    // ✅ category: або ObjectId, або назва (наприклад "Макіяж")
    if (typeof category === "string" && category.trim()) {
      const catValue = category.trim();

      if (validateObjectId(catValue)) {
        filter.category = catValue;
      } else {
        // шукаємо по назві; slug прибери/додай залежно від твоєї схеми
        const cat = await Category.findOne({
          $or: [{ name: catValue }, { slug: catValue }],
        })
          .select("_id")
          .lean();

        if (!cat) {
          // категорія не знайдена -> порожній список без помилки
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

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ message: "Invalid product ID" });

    const cacheKey = `product:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(id).populate("category", "name").lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    await setCache(cacheKey, product, 300); // cache 5min
    return res.json(product);
  } catch (error) {
    next(error);
  }
};

// POST /api/products  (admin)
export const createProduct = async (req, res, next) => {
  try {
    const { name, description = "", price, category, stock = 0, images = [] } = req.body;
    if (!name || typeof price === "undefined") {
      return res.status(400).json({ message: "Name and price required" });
    }

    const product = await Product.create({ name, description, price, category, stock, images });

    // Clear relevant caches
    if (redisClient) {
      await redisClient.delPattern?.("products*").catch(() => {});
    } else {
      memCache.productsList = null;
    }

    // Emit real-time event
    if (socket?.io) {
      socket.io.emit("products:created", product);          // broadcast to all
      socket.io.to("admins").emit("admin:product:created", product); // admins room
    }

    return res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

// PUT /api/products/:id  (admin)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ message: "Invalid product ID" });

    const updated = await Product.findByIdAndUpdate(id, req.body, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: "Product not found" });

    // invalidate caches
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

    return res.json(updated);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/products/:id  (admin)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ message: "Invalid product ID" });

    const removed = await Product.findByIdAndDelete(id).lean();
    if (!removed) return res.status(404).json({ message: "Product not found" });

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

    return res.json({ message: "Product deleted", id });
  } catch (error) {
    next(error);
  }
};


