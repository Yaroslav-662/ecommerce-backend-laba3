import User from "../models/User.js";
import Token from "../models/Token.js";
import { hashPassword, comparePasswords } from "../utils/passwordUtils.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import dotenv from "dotenv";
dotenv.config();
const isProd = process.env.NODE_ENV === "production";

function setAuthCookies(res, access, refresh) {
  res.cookie("accessToken", access, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie("refreshToken", refresh, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearAuthCookies(res) {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
}



/**
 * Auth controller — full-featured
 *
 * Exports:
 * - register
 * - verifyEmail
 * - login
 * - refresh
 * - logout
 * - logoutAll
 * - getSessions
 * - revokeSession
 * - setup2FA
 * - verify2FA
 * - forgotPassword
 * - resetPassword
 * - getProfile
 * - getLoginHistory
 * - googleCallback
 */

/* =========================================================
   REGISTER (with email verification)
========================================================= */
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Усі поля обов'язкові" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email вже існує" });

    const hashed = await hashPassword(password);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = Date.now() + 1000 * 60 * 60; // 1 hour

    const user = await User.create({
      name,
      email,
      password: hashed,
      isVerified: false,
      verifyToken,
      verifyExpires,
    });

    const verifyLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email/${verifyToken}`;

    // send verification email (sendEmail returns link for ethereal)
    await sendEmail({
      to: email,
      subject: "Підтвердження електронної пошти",
      html: `<p>Привіт ${name},</p>
             <p>Щоб підтвердити пошту, перейдіть за посиланням:</p>
             <p><a href="${verifyLink}">${verifyLink}</a></p>
             <p>Посилання дійсне 1 годину.</p>`,
    });

    return res.status(201).json({ message: "Реєстрація успішна. Перевірте пошту." });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Помилка сервера при реєстрації" });
  }
};

/* =========================================================
   VERIFY EMAIL
========================================================= */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ message: "Токен відсутній" });

    const user = await User.findOne({
      verifyToken: token,
      verifyExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Недійсний або прострочений токен" });

    user.verifyToken = undefined;
    user.verifyExpires = undefined;
    user.isVerified = true;
    await user.save();

    return res.json({ message: "Email успішно підтверджено" });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   LOGIN (with optional 2FA)
========================================================= */
export const login = async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email та пароль потрібні" });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(401).json({ message: "Невірний email або пароль" });

    if (!user.isVerified) return res.status(403).json({ message: "Підтвердіть email перед входом" });

    const valid = await comparePasswords(password, user.password);
    if (!valid) return res.status(401).json({ message: "Невірний email або пароль" });

    // If 2FA enabled — require and verify
    if (user.twoFactor?.enabled) {
      if (!twoFactorCode) return res.status(401).json({ message: "Потрібен код 2FA" });

      const ok = speakeasy.totp.verify({
        secret: user.twoFactor.secret,
        encoding: "base32",
        token: twoFactorCode,
        window: 1,
      });

      if (!ok) return res.status(401).json({ message: "Невірний 2FA код" });
    }

    // Generate tokens
    const access = generateAccessToken(user);
    const refresh = generateRefreshToken(user);
    setAuthCookies(res, access, refresh);

    // Save refresh token as session
    await Token.create({
      token: refresh,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    // Append login history (keep last 50)
    user.loginHistory = user.loginHistory || [];
    user.loginHistory.push({
      ip: req.ip,
      userAgent: req.headers["user-agent"] || "unknown",
      date: new Date(),
    });
    if (user.loginHistory.length > 50) user.loginHistory.shift();
    await user.save();

    return res.json({
      message: "Вхід успішний",
      access,
      refresh,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Server error on login" });
  }
};

/* =========================================================
   REFRESH TOKEN
========================================================= */
export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
if (!refreshToken) return res.status(400).json({ message: "Refresh токен відсутній" });

    const stored = await Token.findOne({ token: refreshToken });
    if (!stored) return res.status(401).json({ message: "Недійсний refresh токен" });

    // Verify refresh token signature
    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return res.status(401).json({ message: "Користувача не знайдено" });

      // issue new tokens
      const newAccess = generateAccessToken(user);
      const newRefresh = generateRefreshToken(user);

      stored.token = newRefresh;
      stored.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
      await stored.save();
      setAuthCookies(res, newAccess, newRefresh);

      return res.json({ access: newAccess, refresh: newRefresh });
    } catch (e) {
      // invalid refresh token
      await Token.deleteOne({ token: refreshToken });
      return res.status(401).json({ message: "Недійсний або прострочений refresh токен" });
    }
  } catch (err) {
    console.error("refresh error:", err);
    return res.status(500).json({ message: "Server error on refresh" });
  }
};

/* =========================================================
   LOGOUT (single session)
========================================================= */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (refreshToken) {
      await Token.deleteOne({ token: refreshToken });
    }

    clearAuthCookies(res);
    return res.json({ message: "Вихід успішний" });
  } catch (err) {
    console.error("logout error:", err);
    return res.status(500).json({ message: "Server error on logout" });
  }
};


/* =========================================================
   LOGOUT ALL (revoke all refresh tokens for user)
   Requires req.user (use verifyToken middleware)
========================================================= */
export const logoutAll = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    await Token.deleteMany({ user: req.user.id });

    clearAuthCookies(res);
    return res.json({ message: "Усі сесії завершено" });
  } catch (err) {
    console.error("logoutAll error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


/* =========================================================
   SESSIONS: list + revoke
========================================================= */
export const getSessions = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    const sessions = await Token.find({ user: req.user.id }).sort({ createdAt: -1 });
    return res.json({ sessions });
  } catch (err) {
    console.error("getSessions error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });
    await Token.deleteOne({ token, user: req.user.id });
    return res.json({ message: "Сесію видалено" });
  } catch (err) {
    console.error("revokeSession error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   2FA: setup (generate secret + QR)
   Requires authenticated user (req.user.id)
========================================================= */
export const setup2FA = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `Ecommerce (${user.email})`,
      length: 20,
    });

    // ensure twoFactor object exists
    user.twoFactor = user.twoFactor || { enabled: false, secret: "" };
    user.twoFactor.secret = secret.base32;
    user.twoFactor.enabled = false; // enable only after verify
    await user.save();

    const qr = await qrcode.toDataURL(secret.otpauth_url);

    return res.json({ message: "2FA створено", qr, secret: secret.base32 });
  } catch (err) {
    console.error("setup2FA error:", err);
    return res.status(500).json({ message: "Server error during 2FA setup" });
  }
};

/* =========================================================
   2FA: verify & enable
========================================================= */
export const verify2FA = async (req, res) => {
  try {
    const { token } = req.body;
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.twoFactor?.secret) return res.status(400).json({ message: "2FA ще не налаштовано" });

    const ok = speakeasy.totp.verify({
      secret: user.twoFactor.secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!ok) return res.status(400).json({ message: "Невірний код" });

    user.twoFactor.enabled = true;
    await user.save();

    return res.json({ message: "2FA активовано" });
  } catch (err) {
    console.error("verify2FA error:", err);
    return res.status(500).json({ message: "Server error during 2FA verification" });
  }
};

/* =========================================================
   FORGOT / RESET PASSWORD
========================================================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "Якщо користувач існує — лист надіслано" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const url = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset/${token}`;

    await sendEmail({
      to: email,
      subject: "Скидання паролю",
      html: `<p>Щоб скинути пароль, перейдіть за посиланням:</p><p><a href="${url}">${url}</a></p>`,
    });

    return res.json({ message: "Якщо користувач існує — лист надіслано" });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Invalid request" });

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Недійсний або прострочений токен" });

    user.password = await hashPassword(password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Пароль успішно змінено" });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   PROFILE & LOGIN HISTORY
========================================================= */
export const getProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    const user = await User.findById(req.user.id).select("-password -twoFactor.secret");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ message: "Unauthorized" });
    const user = await User.findById(req.user.id).select("loginHistory");
    return res.json({ loginHistory: user?.loginHistory || [] });
  } catch (err) {
    console.error("getLoginHistory error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   GOOGLE OAUTH CALLBACK (used by passport)
   passport should set req.user to a user document (or minimal object)
   We generate tokens and create a refresh Token document
========================================================= */
export const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(400).json({ message: "No user from Google" });

    const access = generateAccessToken(user);
    const refresh = generateRefreshToken(user);

    await Token.create({
      token: refresh,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    // If your route expects a redirect to frontend after OAuth, you can append tokens to URL
    // Example: res.redirect(`${process.env.FRONTEND_URL}/oauth-success?access=${access}&refresh=${refresh}`)
    return res.json({
      message: "Google авторизація успішна",
      access,
      refresh,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("googleCallback error:", err);
    return res.status(500).json({ message: "Server error in google callback" });
  }
};


