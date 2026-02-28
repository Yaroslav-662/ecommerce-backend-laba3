// src/routes/productRoutes.js
import express from "express";
import { uploadCloud } from "../middleware/upload.js";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Операції з товарами
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Отримати список товарів
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Список товарів
 *
 *   post:
 *     summary: Додати новий товар (адмін)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Матова помада Velvet Touch"
 *               price:
 *                 type: number
 *                 example: 349
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               stock:
 *                 type: number
 *
 *               # 🔥 ВАРІАНТ 1 — Swagger / файли
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *
 *               # 🔥 ВАРІАНТ 2 — Frontend / URL
 *               imagesUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "https://res.cloudinary.com/demo/image.jpg"
 *     responses:
 *       201:
 *         description: Товар додано
 */

router.get("/", getProducts);

router.post(
  "/",
  verifyToken,
  isAdmin,
  uploadCloud.array("images", 5),
  createProduct
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Отримати товар за ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Товар
 *
 *   put:
 *     summary: Оновити товар (адмін)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               stock:
 *                 type: number
 *
 *               # 🔥 ФАЙЛИ (Swagger)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *
 *               # 🔥 URL (Frontend)
 *               imagesUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Оновлено
 *
 *   delete:
 *     summary: Видалити товар (адмін)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Видалено
 */

router.get("/:id", getProductById);

router.put(
  "/:id",
  verifyToken,
  isAdmin,
  uploadCloud.array("images", 5),
  updateProduct
);

router.delete("/:id", verifyToken, isAdmin, deleteProduct);

export default router;
