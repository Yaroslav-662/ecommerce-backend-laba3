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
  // дозволяємо зображення + кілька базових типів
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

const makeStorage = (destinationDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDir(destinationDir);
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const name = path
        .basename(file.originalname || "file", ext)
        .replace(/[^\p{L}\p{N}\-_\.]/gu, "_")
        .slice(0, 60);

      cb(null, `${name}-${Date.now()}${ext || ""}`);
    },
  });

export const uploadAny = multer({
  storage: makeStorage(UPLOAD_DIR),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

export const uploadProducts = multer({
  storage: makeStorage(PRODUCTS_DIR),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

