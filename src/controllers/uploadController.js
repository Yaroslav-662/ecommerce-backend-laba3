import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PRODUCTS_DIR = path.join(UPLOAD_DIR, "products");

const normalize = (p) => p.replace(/\\/g, "/");
const ensureDir = (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });

function getBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function toPublic(req, relPath) {
  const rel = normalize(relPath);
  return { path: `/${rel}`, url: `${getBaseUrl(req)}/${rel}` };
}

function listFiles(dir, req, relPrefix) {
  ensureDir(dir);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const full = path.join(dir, e.name);
      const st = fs.statSync(full);
      const rel = normalize(path.join(relPrefix, e.name));
      return {
        name: e.name,
        size: st.size,
        createdAt: st.birthtime,
        ...toPublic(req, rel),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * POST /api/upload/file (auth)
 * field: file
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл не завантажено" });

    const rel = normalize(path.join(UPLOAD_DIR, req.file.filename));
    const pub = toPublic(req, rel);

    return res.status(200).json({
      message: "✅ Файл успішно завантажено",
      ...pub,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (e) {
    console.error("uploadFile error:", e);
    return res.status(500).json({ message: "Помилка сервера при завантаженні файлу" });
  }
};

/**
 * POST /api/upload/products (admin)
 * field: images (array 1..10)
 */
export const uploadProductImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "Файли не завантажено (images)" });
    }

    const items = files.map((f) => {
      const rel = normalize(path.join(UPLOAD_DIR, "products", f.filename));
      return {
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
        ...toPublic(req, rel),
      };
    });

    return res.status(201).json({
      message: "✅ Images uploaded",
      items,
      urls: items.map((x) => x.url),
    });
  } catch (e) {
    console.error("uploadProductImages error:", e);
    return res.status(500).json({ message: "Не вдалося завантажити фото" });
  }
};

/**
 * GET /api/upload (admin)
 */
export const getAllFiles = async (req, res) => {
  try {
    const items = listFiles(UPLOAD_DIR, req, UPLOAD_DIR);
    return res.json({ items, names: items.map((x) => x.name) });
  } catch (e) {
    console.error("getAllFiles error:", e);
    return res.status(500).json({ message: "Не вдалося отримати список файлів" });
  }
};

/**
 * ✅ GET /api/upload/products (admin)
 */
export const getProductImages = async (req, res) => {
  try {
    const items = listFiles(PRODUCTS_DIR, req, path.join(UPLOAD_DIR, "products"));
    return res.json({
      items,
      urls: items.map((x) => x.url),
      names: items.map((x) => x.name),
    });
  } catch (e) {
    console.error("getProductImages error:", e);
    return res.status(500).json({ message: "Не вдалося отримати список фото" });
  }
};

/**
 * DELETE /api/upload/:name (admin) — видаляє з uploads/
 */
export const deleteFile = async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(UPLOAD_DIR, name);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Файл не знайдено" });

    fs.unlinkSync(filePath);
    return res.json({ message: "🗑️ Файл видалено", name });
  } catch (e) {
    console.error("deleteFile error:", e);
    return res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * DELETE /api/upload/by-url (admin) body: { url } — тільки uploads/products
 */
export const deleteByUrl = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") return res.status(400).json({ message: "Передай url" });

    const filename = url.split("/").pop();
    if (!filename) return res.status(400).json({ message: "Bad url" });

    const filePath = path.join(PRODUCTS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Файл не знайдено", filename });

    fs.unlinkSync(filePath);
    return res.json({ message: "🗑️ Deleted", filename });
  } catch (e) {
    console.error("deleteByUrl error:", e);
    return res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * PUT /api/upload/rename (admin) body: { oldName, newName } — в uploads/
 */
export const renameFile = async (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ message: "Вкажіть oldName і newName" });

    const oldPath = path.join(UPLOAD_DIR, oldName);
    const newPath = path.join(UPLOAD_DIR, newName);

    if (!fs.existsSync(oldPath)) return res.status(404).json({ message: "Файл не знайдено" });

    fs.renameSync(oldPath, newPath);
    return res.json({ message: "✅ Файл перейменовано", newName });
  } catch (e) {
    console.error("renameFile error:", e);
    return res.status(500).json({ message: "Не вдалося перейменувати файл" });
  }
};
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const PRODUCTS_DIR = path.join(UPLOAD_DIR, "products");

const normalize = (p) => p.replace(/\\/g, "/");
const ensureDir = (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });

function getBaseUrl(req) {
  // якщо є PUBLIC_URL — можна фіксувати (напр. https://your-backend.onrender.com)
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  // інакше — динамічно
  return `${req.protocol}://${req.get("host")}`;
}

function toPublicFile(req, absolutePath) {
  // absolutePath: uploads/xxx або uploads/products/xxx
  const rel = normalize(absolutePath);
  return {
    path: `/${rel}`,
    url: `${getBaseUrl(req)}/${rel}`,
  };
}

function listFilesFlat(dir, req, urlPrefixRel) {
  ensureDir(dir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries
    .filter((e) => e.isFile())
    .map((e) => {
      const full = path.join(dir, e.name);
      const stats = fs.statSync(full);
      const rel = normalize(path.join(urlPrefixRel, e.name)); // uploads/xxx
      return {
        name: e.name,
        size: stats.size,
        createdAt: stats.birthtime,
        ...toPublicFile(req, rel),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * POST /api/upload/file (auth)
 * field: file
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Файл не завантажено" });

    // multer destination => uploads/
    const rel = normalize(path.join(UPLOAD_DIR, req.file.filename));
    const pub = toPublicFile(req, rel);

    return res.status(200).json({
      message: "✅ Файл успішно завантажено",
      ...pub,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (e) {
    console.error("uploadFile error:", e);
    return res.status(500).json({ message: "Помилка сервера при завантаженні файлу" });
  }
};

/**
 * POST /api/upload/products (admin)
 * field: images (array 1..10)
 */
export const uploadProductImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ message: "Файли не завантажено (images)" });
    }

    const items = files.map((f) => {
      const rel = normalize(path.join(UPLOAD_DIR, "products", f.filename));
      return {
        filename: f.filename,
        originalName: f.originalname,
        size: f.size,
        mimeType: f.mimetype,
        ...toPublicFile(req, rel),
      };
    });

    return res.status(201).json({
      message: "✅ Images uploaded",
      items,
      urls: items.map((x) => x.url),
    });
  } catch (e) {
    console.error("uploadProductImages error:", e);
    return res.status(500).json({ message: "Не вдалося завантажити фото" });
  }
};

/**
 * GET /api/upload (admin) — список всіх файлів з uploads/ (тільки корінь)
 */
export const getAllFiles = async (req, res) => {
  try {
    const items = listFilesFlat(UPLOAD_DIR, req, UPLOAD_DIR);
    // items тут включатиме і products/ як папку НЕ буде (бо фільтр isFile)
    return res.json({
      items,
      names: items.map((x) => x.name), // зручно для старого фронту
    });
  } catch (e) {
    console.error("getAllFiles error:", e);
    return res.status(500).json({ message: "Не вдалося отримати список файлів" });
  }
};

/**
 * ✅ GET /api/upload/products (admin) — список фото товарів
 */
export const getProductImages = async (req, res) => {
  try {
    const items = listFilesFlat(PRODUCTS_DIR, req, path.join(UPLOAD_DIR, "products"));
    return res.json({
      items,
      urls: items.map((x) => x.url),
      names: items.map((x) => x.name),
    });
  } catch (e) {
    console.error("getProductImages error:", e);
    return res.status(500).json({ message: "Не вдалося отримати список фото" });
  }
};

/**
 * DELETE /api/upload/:name (admin) — видаляє файл з uploads/
 */
export const deleteFile = async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(UPLOAD_DIR, name);

    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Файл не знайдено" });

    fs.unlinkSync(filePath);
    return res.json({ message: "🗑️ Файл видалено", name });
  } catch (e) {
    console.error("deleteFile error:", e);
    return res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * DELETE /api/upload/by-url (admin) body: { url }
 * видаляє ТІЛЬКИ з uploads/products
 */
export const deleteByUrl = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") return res.status(400).json({ message: "Передай url" });

    const filename = url.split("/").pop();
    if (!filename) return res.status(400).json({ message: "Bad url" });

    const filePath = path.join(PRODUCTS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Файл не знайдено", filename });

    fs.unlinkSync(filePath);
    return res.json({ message: "🗑️ Deleted", filename });
  } catch (e) {
    console.error("deleteByUrl error:", e);
    return res.status(500).json({ message: "Не вдалося видалити файл" });
  }
};

/**
 * PUT /api/upload/rename (admin) body: { oldName, newName } (в uploads/)
 */
export const renameFile = async (req, res) => {
  try {
    const { oldName, newName } = req.body || {};
    if (!oldName || !newName) return res.status(400).json({ message: "Вкажіть oldName і newName" });

    const oldPath = path.join(UPLOAD_DIR, oldName);
    const newPath = path.join(UPLOAD_DIR, newName);

    if (!fs.existsSync(oldPath)) return res.status(404).json({ message: "Файл не знайдено" });

    fs.renameSync(oldPath, newPath);
    return res.json({ message: "✅ Файл перейменовано", newName });
  } catch (e) {
    console.error("renameFile error:", e);
    return res.status(500).json({ message: "Не вдалося перейменувати файл" });
  }
};
