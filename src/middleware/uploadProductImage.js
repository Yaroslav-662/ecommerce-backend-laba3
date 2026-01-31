import multer from "multer";
import path from "path";
import fs from "fs";

const productsDir = process.env.UPLOAD_PRODUCTS_DIR || "uploads/products";
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `product_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image files allowed"));
  cb(null, true);
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024) }, // 5MB
});
