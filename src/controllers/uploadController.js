// src/controllers/uploadController.js
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.resolve(__dirname, "../../uploads");
const productsDir = path.resolve(uploadRoot, "products");

function ensureDirs() {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
  if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
}

function getPublicBase(req) {
  // На Render краще використовувати PUBLIC_URL з env
  // але fallback зробимо на протокол+хост
  const envBase = process.env.PUBLIC_URL;
  if (envBase) return envBase.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host");
  return `${proto}://${host}`;
}

function normalizeSlashes(p) {
  return p.replace(/\\/g, "/");
}

ensureDirs();

/**
 * ✅ Завантаження 1 файлу (загальний) -> /uploads/<filename>
 * field: file
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл не завантажено" });

    const base = getPublicBase(req);
    const relPath = `/uploads/${req.file.filename}`;
    const url = `${base}${relPath}`;

    res.status(200).json({
      message: "✅ Файл успішно завантажено",
      filePath: relPath,
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error("❌ Помилка при завантаженні файлу:", error);
    res.status(500).json({ message: "Помилка сервера при завантаженні файлу" });
  }
};

/**
 * ✅ NEW: Завантаження 1..10 фото товару (admin) -> /uploads/products/<filename>
 * field: images (array)
 */
export const uploadProductImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: "Файли не завантажено" });

    const base = getPublicBase(req);

    // multer дає path типу "uploads/products/xxx.jpg"
    const urls = files.map((f) => {
      const rel = "/" + normalizeSlashes(f.path); // "/uploads/products/xxx.jpg"
      return `${base}${rel}`;
    });

    return res.status(201).json({
      message: "✅ Фото товару завантажено",
      urls,
      count: urls.length,
    });
  } catch (error) {
    console.error("❌ Помилка uploadProductImages:", error);
    return res.status(500).json({ message: "Помилка сервера при завантаженні фото" });
  }
};

/**
 * ✅ NEW: Видалити фото товару по filename (admin)
 * DELETE /api/upload/products/:filename
 */
export const deleteProductImage = async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ message: "filename required" });

    const filePath = path.join(productsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не знайдено" });
    }

    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "🗑️ Фото видалено", filename });
  } catch (error) {
    console.error("❌ Помилка deleteProductImage:", error);
    return res.status(500).json({ message: "Не вдалося видалити фото" });
  }
};

/**
 * 📜 Отримати список усіх файлів (admin)
 */
export const getAllFiles = async (req, res) => {
  try {
    ensureDirs();
    const base = getPublicBase(req);

    const files = fs.readdirSync(uploadRoot).map((name) => {
      const full = path.join(uploadRoot, name);
      const stats = fs.statSync(full);

      // якщо це папка (products) — пропускаємо тут, щоб не ламати клієнт
      if (stats.isDirectory()) return null;

      const relPath = `/uploads/${name}`;
      return {
        name,
        size: stats.size,
        createdAt: stats.birthtime,
        path: relPath,
        url: `${base}${relPath}`,
      };
    }).filter(Boolean);

    // ✅ ПОВЕРТАЄМО МАСИВ (а не {files:[]}) щоб не було плутанини
    return res.status(200).json(files);
  } catch (error) {
    console.error("❌ Помилка при читанні файлів:", error);
    res.status(500).json({ message: "Не вдалося отримати список файлів" });
  }
};

/**
 * 🗑️ Видалити файл за назвою (admin)
 * DELETE /api/upload/:name
 */
export const deleteFile = async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(uploadRoot, name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не знайдено" });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return res.status(400).json({ message: "Не можна видаляти директорію через цей endpoint" });
    }

    fs.unlinkSync(filePath);
    res.status(200).json({ message: "🗑️ Файл видалено", name });
  } catch (error) {
    console.error("❌ Помилка при видаленні файлу:", error);
    res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * 🔁 Перейменування файлу (admin)
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

    const stat = fs.statSync(oldPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ message: "Не можна перейменовувати директорію через цей endpoint" });
    }

    fs.renameSync(oldPath, newPath);
    res.status(200).json({ message: "✅ Файл перейменовано", newName });
  } catch (error) {
    console.error("❌ Помилка при перейменуванні файлу:", error);
    res.status(500).json({ message: "Не вдалося перейменувати файл" });
  }
};

