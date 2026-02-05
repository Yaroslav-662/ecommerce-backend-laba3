// src/middleware/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PRODUCTS_DIR = path.join(UPLOAD_DIR, "products");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
ensureDir(UPLOAD_DIR);
ensureDir(PRODUCTS_DIR);

const fileFilter = (req, file, cb) => {
  const ok = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
  ].includes(file.mimetype);

  if (!ok) return cb(new Error("Unsupported file type: " + file.mimetype), false);
  cb(null, true);
};

const safeName = (originalname = "file") => {
  const ext = path.extname(originalname).toLowerCase();
  const base = path
    .basename(originalname, ext)
    .replace(/[^\p{L}\p{N}\-_\.]/gu, "_")
    .slice(0, 60);

  return { base, ext };
};

const makeStorage = (dest) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const { base, ext } = safeName(file.originalname);
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  });

const uploadAny = multer({
  storage: makeStorage(UPLOAD_DIR),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

const uploadProducts = multer({
  storage: makeStorage(PRODUCTS_DIR),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

// ✅ щоб не ламати існуючі імпорти: import uploadMiddleware from ...
export default {
  single: (...args) => uploadAny.single(...args),
  array: (...args) => uploadAny.array(...args),
  fields: (...args) => uploadAny.fields(...args),

  // ✅ нове: окремий uploader для products
  products: {
    single: (...args) => uploadProducts.single(...args),
    array: (...args) => uploadProducts.array(...args),
    fields: (...args) => uploadProducts.fields(...args),
  },
};



