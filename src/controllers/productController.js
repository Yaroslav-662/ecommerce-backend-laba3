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

// GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, q, category, sort = "-createdAt" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // caching only for list without filters (simple)
    const cacheKey = q || category ? null : `products:page:${page}:limit:${limit}:sort:${sort}`;

    if (cacheKey) {
      const cached = await getCache(cacheKey);
      if (cached) return res.json(cached);
    }

    const filter = {};
    if (q) {
      filter.$text = { $search: q };
    }
    if (category) {
  if (validateObjectId(category)) {
    filter.category = category;
  } else {
    // category як назва/slug (наприклад "Макіяж")
    const cat = await Category.findOne({
      $or: [{ name: category }, { slug: category }],
    }).select("_id");

    if (!cat) {
      // категорія не знайдена -> просто порожній результат
      const result = { total: 0, page: Number(page), totalPages: 0, products: [] };
      return res.json(result);
    }

    filter.category = cat._id;
  }
}


    // Use projection for performance and pagination
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select("name price category images stock createdAt")
        .populate("category", "name")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    const result = {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      products,
    };

    if (cacheKey) await setCache(cacheKey, result, 60); // cache 60s

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

