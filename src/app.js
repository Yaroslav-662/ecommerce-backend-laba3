// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";

import rateLimiter from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";

import swaggerRouter from "./config/swagger.js";
import path from "path";
import fs from "fs";

dotenv.config();
const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(rateLimiter);

// Sessions (before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());
import "./config/passport.js"; // load strategies

// Static uploads
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(path.resolve(uploadDir)));

// API routes
app.use("/api", routes);

// Swagger
app.use("/api/docs", swaggerRouter);

// Health check
app.get("/", (req, res) =>
  res.json({
    message: "🛍️ E-commerce API running",
    uptime: process.uptime(),
    timestamp: new Date(),
  })
);

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Error handler
app.use(errorMiddleware);

export default app;