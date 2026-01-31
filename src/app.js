// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import passport from "passport";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";

import rateLimiter from "./middleware/rateLimiter.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import swaggerRouter from "./config/swagger.js";

dotenv.config();
const app = express();
app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";

// ✅ allowlist (додаси vercel домен потім)
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL, // https://cosmetics-frontend-wqiy.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Swagger/curl/server-to-server без Origin
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      // ❗️НЕ кидати Error (інакше заголовки можуть не додатись)
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// ✅ preflight
app.options(
  "*",
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(rateLimiter);

// ✅ cookies (потрібно для refreshToken/accessToken cookies)
app.use(cookieParser());

// Sessions (before passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret123",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());
import "./config/passport.js";

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



