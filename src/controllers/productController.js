// src/controllers/productController.js
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import socket from "../socket/index.js";
import createDebug from "debug";

const debug = createDebug("app:productController");

/* =======================
   CACHE (redis / memory)
======================= */
let redisClient;
try {
  const IORedis = await import("ioredis").then(m => m.default);
  redisClient = new IORedis(process.env.REDIS_URL);
  debug("Redis enabled");
} catch {
  debug("Redis not available, using memory cache");
}

const memCache = {};
const setCache = async (key, value, ttl = 60) => {
  if (redisClient) {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } else {
    memCache[key] = { value, exp: Date.now() + ttl * 1000 };
  }
};

const getCache = async (key) => {
  if (redisClient) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const hit = memCache[key];
  if (hit && hit.exp > Date.now()) return hit.value;
  return null;
};

/* =======================
   HELPERS
======================= */
const escapeRegex = (str = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 🔥 КЛЮЧОВЕ
 * Приймає:
 *  - images: string[] (фронтенд, Cloudinary)
 *  - images: File[] (Swagger)
 */
const normalizeImages = (req) => {
  if (Array.isArray(req.body.images)) return req.body.images;
  if (typeof req.body.images === "string") return [req.body.images];

  if (req.files?.length) {
    return req.files.map(
      (f) => f.secure_url || f.path
    );
  }
  return [];
};

/* =======================
   GET /api/products
======================= */
export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      q,
      category,
      sort = "-createdAt",
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (q) {
      const safe = escapeRegex(q.trim());
      filter.$or = [
        { name: { $regex: safe, $options: "i" } },
        { description: { $regex: safe, $options: "i" } },
      ];
    }

    if (category) {
      if (validateObjectId(category)) {
        filter.category = category;
      } else {
        const cat = await Category.findOne({
          $or: [{ name: category }, { slug: category }],
        }).lean();
        if (!cat) return res.json({ total: 0, products: [] });
        filter.category = cat._id;
      }
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name")
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      products,
    });
  } catch (e) {
    next(e);
  }
};

/* =======================
   GET /api/products/:id
======================= */
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const cacheKey = `product:${id}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const product = await Product.findById(id)
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Not found" });
    }

    await setCache(cacheKey, product, 300);
    res.json(product);
  } catch (e) {
    next(e);
  }
};

/* =======================
   POST /api/products
======================= */
export const createProduct = async (req, res, next) => {
  try {
    const { name, price, description = "", category, stock = 0 } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: "Name and price required" });
    }

    const images = normalizeImages(req);

    const product = await Product.create({
      name,
      price,
      description,
      category,
      stock,
      images,
    });

    socket?.io?.emit("products:created", product);
    res.status(201).json(product);
  } catch (e) {
    next(e);
  }
};

/* =======================
   PUT /api/products/:id
======================= */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const updateData = { ...req.body };
    const images = normalizeImages(req);

    // 🔥 НЕ СТИРАЄМО фото, якщо не передали
    if (images.length) {
      updateData.images = images;
    } else {
      delete updateData.images;
    }

    const updated = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: "Not found" });
    }

    socket?.io?.emit("products:updated", updated);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

/* =======================
   DELETE /api/products/:id
======================= */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const removed = await Product.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: "Not found" });
    }

    socket?.io?.emit("products:deleted", { id });
    res.json({ message: "Deleted", id });
  } catch (e) {
    next(e);
  }
};
