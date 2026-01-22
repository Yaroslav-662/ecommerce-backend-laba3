// src/routes/index.js
import express from "express";

import authRoutes from "./authRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import userRoutes from "./userRoutes.js";
import uploadRoutes from "./uploadRoutes.js";

import healthRoutes from "./healthRoutes.js"; // якщо ти його додавав

const router = express.Router();

// ✅ контрольний пінг
router.get("/_routes-ok", (req, res) => {
  res.json({ ok: true, where: "routes/index.js" });
});

// ✅ health
router.use(healthRoutes);

// ✅ ОЦЕ КРИТИЧНО: categories саме тут
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/reviews", reviewRoutes);

router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);
router.use("/upload", uploadRoutes);

export default router;
