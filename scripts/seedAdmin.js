import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User from "../src/models/User.js";
import Token from "../src/models/Token.js";
import {
  generateAccessToken,
  generateRefreshToken
} from "../src/utils/generateToken.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected!");

    const email = "admin@beautystore.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      console.log("-------------------------------------");
      console.log(`👤 Name: ${existingAdmin.name}`);
      console.log(`📧 Email: ${existingAdmin.email}`);
      
      const token = generateAccessToken(existingAdmin);
      const refresh = generateRefreshToken(existingAdmin);

      await Token.create({
        token: refresh,
        user: existingAdmin._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      console.log("🔑 Access Token:", token);
      console.log("🔄 Refresh Token:", refresh);
      console.log("-------------------------------------");

      console.log("📱 Admin already exists — new tokens generated.");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin123!", 10);

    const secret = speakeasy.generateSecret({
      name: "BeautyStore (Admin)",
      length: 20,
    });

    const admin = new User({
      name: "Admin",
      email,
      password: hashedPassword,
      role: "admin",
      isEmailVerified: true,
      twoFactor: {
        secret: secret.base32,
        enabled: true,
      },
    });

    await admin.save();

    const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

    const token = generateAccessToken(admin);
    const refresh = generateRefreshToken(admin);

    await Token.create({
      token: refresh,
      user: admin._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    console.log("🎉 Admin created successfully!");
    console.log("-------------------------------------");
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔑 Password: Admin123!`);
    console.log(`🧩 2FA Secret: ${secret.base32}`);
    console.log("\n📸 QR Code for Google Authenticator:\n");
    console.log(qrCodeDataURL);
    console.log("\n-------------------------------------");
    console.log("🔑 ACCESS TOKEN:\n", token);
    console.log("-------------------------------------");
    console.log("🔄 REFRESH TOKEN:\n", refresh);
    console.log("-------------------------------------");

    process.exit(0);
  } catch (error) {
    console.error("❌ Admin seeding error:", error);
    process.exit(1);
  }
};

seedAdmin();
