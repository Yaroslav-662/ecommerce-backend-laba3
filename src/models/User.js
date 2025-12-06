import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: "Invalid email",
      },
    },

    password: { type: String, default: null },

    role: { type: String, enum: ["user", "admin"], default: "user" },

    avatar: { type: String, default: null },

    isActive: { type: Boolean, default: true },

    isVerified: { type: Boolean, default: false },

    googleId: { type: String, default: null },

    verifyToken: { type: String },
    verifyExpires: { type: Date },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    twoFactor: {
      secret: { type: String, default: "" },
      enabled: { type: Boolean, default: false },
    },

    loginHistory: [
      {
        ip: String,
        userAgent: String,
        date: Date,
      }
    ],

    lastOnlineAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
