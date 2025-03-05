const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
   
    res.send(`
      <html>
        <body>
          <script>
            // This will be received by the extension
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
    user = new User({ name, email, password: hashedPassword });
    await user.save();

    
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging in after signup" });
      }
      return res.status(201).json({ 
        message: "Signup successful", 
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      });
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }
    if (!user) {
      return res.status(401).json({ message: info.message || "Authentication failed" });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging in" });
      }
      return res.status(200).json({ 
        message: "Login successful", 
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          picture: user.picture
        }
      });
    });
  })(req, res, next);
});


router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});


router.get("/status", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ 
      isAuthenticated: true, 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      }
    });
  }
  return res.json({ isAuthenticated: false });
});

module.exports = router;