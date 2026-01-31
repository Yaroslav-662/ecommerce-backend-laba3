// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PRODUCTS_DIR = process.env.UPLOAD_PRODUCTS_DIR || "uploads/products";
const MAX_FILE_SIZE = Number(process.env.UPLOAD_MAX_FILE_SIZE) || 5 * 1024 * 1024;

[UPLOAD_DIR, PRODUCTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED = (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/webp,image/gif").split(",");

function safeBaseName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // тільки продукти в /uploads/products
    const isProducts = req.originalUrl.includes("/upload/products");
    cb(null, isProducts ? PRODUCTS_DIR : UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = safeBaseName(file.originalname);
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${base}_${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED.join(", ")}`));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default upload;
