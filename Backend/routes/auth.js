const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Helper function to set JWT cookie
const setJWTCookie = (res, token) => {
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: false, // Set to true in production
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: "/",
    domain: "localhost",
  });
};

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const token = generateToken(req.user);
    setJWTCookie(res, token);

    res.send(`
      <html>
        <body>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  }
);

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this is the first user
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "super_admin" : "user";

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      loginHistory: [
        {
          action: "signup",
          ipAddress: req.ip,
        },
      ],
    });

    await user.save();

    const token = generateToken(user);
    setJWTCookie(res, token);

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res, next) => {
  try {
    passport.authenticate("local", async (err, user, info) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }
      if (!user) {
        return res
          .status(401)
          .json({ message: info.message || "Authentication failed" });
      }

      // Update last login and add to login history
      user.lastLogin = new Date();
      user.loginHistory.push({
        action: "login",
        ipAddress: req.ip,
      });
      await user.save();

      const token = generateToken(user);
      setJWTCookie(res, token);

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          picture: user.picture,
          role: user.role,
        },
      });
    })(req, res, next);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/logout", async (req, res) => {
  if (req.user) {
    try {
      // Add logout to login history
      await User.findByIdAndUpdate(req.user._id, {
        $push: {
          loginHistory: {
            action: "logout",
            ipAddress: req.ip,
          },
        },
      });
    } catch (error) {
      console.error("Error updating login history:", error);
    }
  }

  res.clearCookie("jwt", {
    path: "/",
    domain: "localhost",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

router.get(
  "/status",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        role: req.user.role,
      },
    });
  }
);

module.exports = router;
