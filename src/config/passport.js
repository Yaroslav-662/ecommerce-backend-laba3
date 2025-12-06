// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

/* ================================
   GOOGLE STRATEGY
================================ */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, 
      // ВАЖЛИВО: callbackURL має бути окремою змінною, а не BACKEND_URL + шлях
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        /** Перевірка — у Google завжди є email */
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("Google не повернув email"), null);
        }

        const email = profile.emails[0].value;

        /** Шукаємо користувача */
        let user = await User.findOne({ email });

        /** Якщо користувача немає — створюємо */
        if (!user) {
          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            password: null, // Не потрібно, бо логін через Google
            role: "user",
            isVerified: true, // Google гарантує реальний email
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || null,
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error, null);
      }
    }
  )
);

/* ================================
   SESSIONS (не потрібні якщо JWT)
================================ */

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
