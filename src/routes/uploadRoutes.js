// src/routes/uploadRoutes.js
import express from "express";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  uploadFile,
  getAllFiles,
  deleteFile,
  renameFile,
} from "../controllers/uploadController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: Завантаження файлів (зображення товарів, аватари)
 */

/**
 * @swagger
 * /api/upload/file:
 *   post:
 *     summary: Завантажити файл (авторизований користувач)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Файл завантажено
 */
router.post("/file", verifyToken, uploadMiddleware.single("file"), uploadFile);

/**
 * ✅ NEW: Upload product image (admin)
 *
 * Frontend should send:
 *  - multipart/form-data
 *  - field name: "image"
 *
 * Response should contain:
 *  - url: absolute url to open in browser
 */

/**
 * @swagger
 * /api/upload/products:
 *   post:
 *     summary: Завантажити фото товару (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Фото завантажено
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Uploaded" }
 *                 url: { type: string, example: "https://your-backend.onrender.com/uploads/products/product_123.jpg" }
 *                 path: { type: string, example: "/uploads/products/product_123.jpg" }
 *                 filename: { type: string, example: "product_123.jpg" }
 *                 mimetype: { type: string, example: "image/jpeg" }
 *                 size: { type: number, example: 123456 }
 */
router.post(
  "/products",
  verifyToken,
  isAdmin,
  uploadMiddleware.single("image"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // uploadMiddleware має класти файли у uploads/... (переконайся в middleware)
    const base = process.env.PUBLIC_URL || "http://localhost:5000";

    // multer дає path типу "uploads/products/xxx.jpg"
    const normalized = req.file.path.replace(/\\/g, "/");
    const url = `${base}/${normalized}`;

    return res.status(201).json({
      message: "Uploaded",
      url,
      path: `/${normalized}`,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }
);

/**
 * @swagger
 * /api/upload:
 *   get:
 *     summary: Отримати список усіх завантажених файлів (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Список файлів
 */
router.get("/", verifyToken, isAdmin, getAllFiles);

/**
 * @swagger
 * /api/upload/{name}:
 *   delete:
 *     summary: Видалити файл (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Файл видалено
 */
router.delete("/:name", verifyToken, isAdmin, deleteFile);

/**
 * @swagger
 * /api/upload/rename:
 *   put:
 *     summary: Перейменувати файл (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldName, newName]
 *             properties:
 *               oldName: { type: string }
 *               newName: { type: string }
 *     responses:
 *       200:
 *         description: Файл перейменовано
 */
router.put("/rename", verifyToken, isAdmin, renameFile);

export default router;
