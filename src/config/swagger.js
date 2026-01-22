// src/config/swagger.js
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import express from "express";

const router = express.Router();

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API електронної комерції 💄",
      version: "1.0.0",
      description:
        "Документація REST API для онлайн-магазину косметики. Використовує JWT авторизацію.",
    },
    // ⛔ НЕ фіксуємо localhost тут — задамо сервер динамічно нижче
    servers: [{ url: "http://localhost:5000", description: "Default (fallback)" }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

// ✅ Динамічно підміняємо servers під поточний домен (Render/локально)
router.use("/", swaggerUi.serve, (req, res, next) => {
  const publicUrl =
    process.env.PUBLIC_URL ||
    `${req.protocol}://${req.get("host")}`;

  const patchedSpec = {
    ...swaggerSpec,
    servers: [
      { url: publicUrl, description: "Current server" },
    ],
  };

  return swaggerUi.setup(patchedSpec, { explorer: true })(req, res, next);
});

console.log("📘 Swagger Docs available at /api/docs");

export default router;
