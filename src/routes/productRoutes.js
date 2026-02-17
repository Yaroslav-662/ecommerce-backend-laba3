// src/routes/productRoutes.js
import express from "express";
import { uploadCloud } from "../middlewares/upload.js";
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
 *         description: Номер сторінки (пагінація)
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Пошуковий запит (назва/опис)
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category id або name/slug
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Скільки елементів на сторінку
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         description: "-createdAt | createdAt | -price | price | name | -name"
 *     responses:
 *       200:
 *         description: Список товарів (paged)
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
 *                 example: "category_id"
 *               description:
 *                 type: string
 *               stock:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
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
 *               name: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               description: { type: string }
 *               stock: { type: number }
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
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
