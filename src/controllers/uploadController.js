// src/controllers/uploadController.js
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.resolve(__dirname, "../../uploads");
const productsRoot = path.resolve(uploadRoot, "products");

const baseUrl = () => process.env.PUBLIC_URL || process.env.BASE_URL || "http://localhost:5000";
const normalize = (p) => p.replace(/\\/g, "/");

/**
 * ✅ 1) Upload one generic file (existing)
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл не завантажено" });

    const relative = normalize(req.file.path); // "uploads/xxx"
    const url = `${baseUrl()}/${relative}`;

    res.status(200).json({
      message: "✅ Файл успішно завантажено",
      url,
      path: `/${relative}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ message: "Помилка сервера при завантаженні файлу" });
  }
};

/**
 * ✅ 2) Upload multiple product images (1..10)
 * POST /api/upload/products
 * field: images (array)
 */
export const uploadProductImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "Файли не завантажено (images)" });
    }

    const urls = files.map((f) => {
      const relative = normalize(f.path); // "uploads/products/xxx.jpg"
      return `${baseUrl()}/${relative}`;
    });

    return res.status(201).json({
      message: "✅ Images uploaded",
      urls,
      files: files.map((f) => ({
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimetype: f.mimetype,
        path: `/${normalize(f.path)}`,
        url: `${baseUrl()}/${normalize(f.path)}`,
      })),
    });
  } catch (error) {
    console.error("❌ uploadProductImages error:", error);
    res.status(500).json({ message: "Не вдалося завантажити фото" });
  }
};

/**
 * 📜 3) List all files (admin)
 */
export const getAllFiles = async (req, res) => {
  try {
    if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

    const files = fs.readdirSync(uploadRoot).map((name) => {
      const full = path.join(uploadRoot, name);
      const stats = fs.statSync(full);
      return {
        name,
        size: stats.size,
        createdAt: stats.birthtime,
        url: `${baseUrl()}/uploads/${name}`,
      };
    });

    res.status(200).json({ files });
  } catch (error) {
    console.error("❌ list files error:", error);
    res.status(500).json({ message: "Не вдалося отримати список файлів" });
  }
};

/**
 * 🗑️ 4) Delete file by filename (admin)
 */
export const deleteFile = async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(uploadRoot, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не знайдено" });
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: "🗑️ Файл видалено", name });
  } catch (error) {
    console.error("❌ delete error:", error);
    res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * 🗑️ 5) Delete product image by URL (admin)
 * DELETE /api/upload/by-url  body: { url }
 */
export const deleteByUrl = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ message: "Передай url" });
    }

    const filename = url.split("/").pop();
    if (!filename) return res.status(400).json({ message: "Bad url" });

    // шукаємо саме в uploads/products
    const filePath = path.join(productsRoot, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не знайдено", filename });
    }

    fs.unlinkSync(filePath);
    return res.json({ message: "🗑️ Deleted", filename });
  } catch (error) {
    console.error("❌ deleteByUrl error:", error);
    res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * 🔁 6) Rename (admin)
 */
export const renameFile = async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName)
      return res.status(400).json({ message: "Вкажіть oldName і newName" });

    const oldPath = path.join(uploadRoot, oldName);
    const newPath = path.join(uploadRoot, newName);

    if (!fs.existsSync(oldPath))
      return res.status(404).json({ message: "Файл не знайдено" });

    fs.renameSync(oldPath, newPath);
    res.status(200).json({ message: "✅ Файл перейменовано", newName });
  } catch (error) {
    console.error("❌ rename error:", error);
    res.status(500).json({ message: "Не вдалося перейменувати файл" });
  }
};
