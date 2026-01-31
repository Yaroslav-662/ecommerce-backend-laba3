// src/routes/uploadRoutes.js
import express from "express";
import uploadMiddleware from "../middleware/uploadMiddleware.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  uploadFile,
  uploadProductImages,
  deleteProductImage,
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "✅ Фото товару завантажено" }
 *                 urls:
 *                   type: array
 *                   items: { type: string }
 *                   example:
 *                    - "https://ecommerce-backend-mgfu.onrender.com/uploads/products/p_1.jpg"
 *                    - "https://ecommerce-backend-mgfu.onrender.com/uploads/products/p_2.jpg"
 *                 count: { type: number, example: 2 }
 */
router.post(
  "/products",
  verifyToken,
  isAdmin,
  uploadMiddleware.array("images", 10),
  uploadProductImages
);

/**
 * @swagger
 * /api/upload/products/{filename}:
 *   delete:
 *     summary: Видалити фото товару (адмін)
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Фото видалено
 */
router.delete("/products/:filename", verifyToken, isAdmin, deleteProductImage);

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
 *         description: Список файлів (масив)
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
