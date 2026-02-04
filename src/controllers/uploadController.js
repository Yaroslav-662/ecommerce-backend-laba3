// src/controllers/uploadController.js
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Абсолютні шляхи
const uploadRoot = path.resolve(__dirname, "../../uploads");
const productsRoot = path.resolve(uploadRoot, "products");

// PUBLIC URL (Render / custom domain)
const baseUrl = () =>
  (process.env.PUBLIC_URL || process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const normalize = (p) => p.replace(/\\/g, "/");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function listFiles(absDir, publicPrefix) {
  ensureDir(absDir);

  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  const files = entries
    .filter((e) => e.isFile())
    .filter((e) => !e.name.startsWith(".")) // прибрати .DS_Store і т.п.
    .map((e) => {
      const full = path.join(absDir, e.name);
      const stats = fs.statSync(full);
      return {
        name: e.name,
        size: stats.size,
        createdAt: (stats.birthtime || stats.ctime || new Date()).toISOString?.() || String(stats.birthtime),
        url: `${publicPrefix}/${encodeURIComponent(e.name)}`,
      };
    });

  // нові зверху
  files.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return files;
}

/**
 * ✅ 1) Upload one generic file (existing)
 * POST /api/upload/file
 * field: file
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
 * ✅ NEW: List ONLY product images (admin)
 * GET /api/upload/products
 */
export const getProductImages = async (req, res) => {
  try {
    const files = listFiles(productsRoot, `${baseUrl()}/uploads/products`);
    return res.status(200).json({ files });
  } catch (error) {
    console.error("❌ getProductImages error:", error);
    res.status(500).json({ message: "Не вдалося отримати список фото товарів" });
  }
};

/**
 * 📜 3) List all files/folders in /uploads (admin)
 * GET /api/upload
 * (показує і папки, і файли, як у тебе зараз в swagger)
 */
export const getAllFiles = async (req, res) => {
  try {
    ensureDir(uploadRoot);

    const entries = fs.readdirSync(uploadRoot, { withFileTypes: true });

    const files = entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => {
        const full = path.join(uploadRoot, e.name);
        const stats = fs.statSync(full);
        return {
          name: e.name,
          isDir: e.isDirectory(),
          size: stats.size,
          createdAt: (stats.birthtime || stats.ctime || new Date()).toISOString?.() || String(stats.birthtime),
          url: `${baseUrl()}/uploads/${encodeURIComponent(e.name)}`,
        };
      });

    return res.status(200).json({ files });
  } catch (error) {
    console.error("❌ list files error:", error);
    res.status(500).json({ message: "Не вдалося отримати список файлів" });
  }
};

/**
 * 🗑️ 4) Delete file by filename from /uploads root (admin)
 * DELETE /api/upload/:name
 * ⚠️ ВИДАЛЯЄ ТІЛЬКИ З /uploads/<name> (НЕ з products)
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
      return res.status(400).json({ message: "Це папка. Видалення папок цим маршрутом заборонене." });
    }

    fs.unlinkSync(filePath);
    return res.status(200).json({ message: "🗑️ Файл видалено", name });
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

    const filePath = path.join(productsRoot, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Файл не знайдено", filename });
    }

    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      return res.status(400).json({ message: "Це папка, не файл", filename });
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
 * PUT /api/upload/rename
 */
export const renameFile = async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ message: "Вкажіть oldName і newName" });
    }

    const oldPath = path.join(uploadRoot, oldName);
    const newPath = path.join(uploadRoot, newName);

    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ message: "Файл не знайдено" });
    }

    const stat = fs.statSync(oldPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ message: "Це папка. Rename папок заборонений цим маршрутом." });
    }

    fs.renameSync(oldPath, newPath);
    return res.status(200).json({ message: "✅ Файл перейменовано", newName });
  } catch (error) {
    console.error("❌ rename error:", error);
    res.status(500).json({ message: "Не вдалося перейменувати файл" });
  }
};
