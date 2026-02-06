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

// ✅ щоб req.protocol був правильний за проксі (Render)
app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";

// ✅ Helmet: ДУЖЕ ВАЖЛИВО для картинок з бекенду на Vercel
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ інакше браузер може блокувати /uploads
  })
);

// ✅ CORS allowlist
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL, // https://....vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server, curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept",],

  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// preflight
app.options("*", cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("dev"));
app.use(rateLimiter);
app.use(cookieParser());

// sessions
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

// passport
app.use(passport.initialize());
app.use(passport.session());
import "./config/passport.js";

// ✅ Static uploads — ВІДКРИТО ДЛЯ ГОСТЕЙ
const uploadDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(
  "/uploads",
  express.static(path.resolve(uploadDir), {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=86400"); // 1 день
    },
  })
);

// API routes
app.use("/api", routes);

// Swagger
app.use("/api/docs", swaggerRouter);

// health
app.get("/", (req, res) =>
  res.json({ message: "🛍️ E-commerce API running", uptime: process.uptime(), timestamp: new Date() })
);

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// error handler
app.use(errorMiddleware);

export default app;


