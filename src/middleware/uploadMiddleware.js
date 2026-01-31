// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

/**
 * Директорії з env або дефолтні
 */
const ROOT_UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PRODUCTS_DIR = process.env.UPLOAD_PRODUCTS_DIR || "uploads/products";
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE) || 5 * 1024 * 1024;

/**
 * Гарантуємо, що директорії існують
 */
[ROOT_UPLOAD_DIR, PRODUCTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * Дозволені MIME типи
 */
const ALLOWED_MIME_TYPES = (
  process.env.ALLOWED_FILE_TYPES ||
  "image/jpeg,image/png,image/webp,image/gif"
).split(",");

/**
 * Визначаємо папку призначення
 * - /api/upload/products → uploads/products
 * - все інше → uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isProductUpload =
      req.baseUrl.includes("/upload") &&
      req.originalUrl.includes("/products");

    const targetDir = isProductUpload ? PRODUCTS_DIR : ROOT_UPLOAD_DIR;
    cb(null, targetDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    const unique = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${safeName}_${unique}${ext}`);
  },
});

/**
 * Фільтр файлів (тільки зображення)
 */
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`
      )
    );
  }
  cb(null, true);
};

/**
 * Готовий middleware
 */
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

export default uploadMiddleware;
