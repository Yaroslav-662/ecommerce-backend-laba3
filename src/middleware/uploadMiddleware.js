// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

const rootDir = process.env.UPLOAD_DIR || "uploads";
const productsDir = process.env.UPLOAD_PRODUCTS_DIR || path.join(rootDir, "products");
const usersDir = process.env.UPLOAD_USERS_DIR || path.join(rootDir, "users");

// ensure dirs
for (const dir of [rootDir, productsDir, usersDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeName(originalName = "") {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext).replace(/[^a-z0-9_-]/gi, "_");
  return { base, ext };
}

function isAllowedMimetype(mimetype) {
  const allowed = (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/webp,image/gif")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.includes(mimetype);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // /api/upload/products -> uploads/products
    if (req.baseUrl?.includes("/upload") && req.path?.includes("/products")) {
      return cb(null, productsDir);
    }
    // можна додати /users якщо треба
    return cb(null, rootDir);
  },
  filename: (req, file, cb) => {
    const { base, ext } = safeName(file.originalname);
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${base}_${unique}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024) },
  fileFilter: (req, file, cb) => {
    if (!isAllowedMimetype(file.mimetype)) {
      return cb(new Error("File type not allowed: " + file.mimetype));
    }
    cb(null, true);
  },
});

export default uploadMiddleware;
