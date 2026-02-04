// src/routes/uploadRoutes.js
import express from "express";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  uploadFile,
  uploadProductImages,
  getProductImages,   // ✅ NEW
  getAllFiles,
  deleteFile,
  deleteByUrl,
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
 * ✅ IMPORTANT: upload product images (admin, multiple)
 * POST /api/upload/products
 *
 * @swagger
 * /api/upload/products:
 *   post:
 *     summary: Завантажити 1..10 фото товару (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Фото завантажено
 */
router.post(
  "/products",
  verifyToken,
  isAdmin,
  uploadMiddleware.array("images", 10),
  uploadProductImages
);

/**
 * ✅ NEW: list product images (admin)
 * GET /api/upload/products
 *
 * @swagger
 * /api/upload/products:
 *   get:
 *     summary: Отримати список фото товарів (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Список фото
 */
router.get("/products", verifyToken, isAdmin, getProductImages);

/**
 * @swagger
 * /api/upload/by-url:
 *   delete:
 *     summary: Видалити фото товару по URL (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url: { type: string }
 *     responses:
 *       200:
 *         description: Видалено
 */
router.delete("/by-url", verifyToken, isAdmin, deleteByUrl);

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

export default router;
