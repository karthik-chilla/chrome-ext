const passport = require("passport");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Helper function to set JWT cookie
const setJWTCookie = (res, token) => {
  res.cookie("jwt", token, {
    // httpOnly: true,
    //secure: false, // Set to true in production
    //sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    // path: "/",
    // domain: "localhost",
  });
};

async function handleGoogleCallback(req, res) {
  try {
    if (!req.query.code) {
      return res.status(400).json({ message: "Authorization code missing" });
    }

    if (!req.user) {
      return res.status(500).json({ message: "Authentication failed" });
    }

    const token = generateToken(req.user);
    setJWTCookie(res, token);

    return res.status(200).send(`
      <html>
        <body>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Google callback error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
}

async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(500).json({ message: "Server error" });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters" 
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
      subscription: "free",
      lastLogin: now,
      verified: false,
      loginHistory: [
        {
          timestamp: now,
          action: "signup",
          ipAddress: req.ip,
        },
      ],
    });

    await user.save();

    // Send verification email
    try {
      await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/send-verification-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error("Error sending verification email:", error);
    }

    return res.status(201).json({
      message:
        "Signup successful. Please check your email to verify your account.",
      redirectToLogin: true,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function login(req, res, next) {
  if (!req.body.email || !req.body.password) {
    return res.status(401).json({ message: "Email and password are required" });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || "Invalid credentials" });
    }

    try {
      const token = generateToken(user);
      setJWTCookie(res, token);
      
      // Update login history
      user.lastLogin = new Date();
      if (!user.loginHistory) user.loginHistory = [];
      user.loginHistory.push({
        timestamp: user.lastLogin,
        action: "login",
        ipAddress: req.ip
      });
      await user.save();

      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscription: user.subscription
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  })(req, res, next);
}

async function logout(req, res) {
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
    // domain: "localhost",
  });
  res.status(200).json({ message: "Logged out successfully" });
}

async function getStatus(req, res) {
  if (!req.user) {
    return res.json({
      isAuthenticated: false,
      user: null,
    });
  }

  return res.json({
    isAuthenticated: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      role: req.user.role,
      subscription: req.user.subscription,
    },
  });
}

async function sendVerificationEmail(req, res) {
  try {
    const { email } = req.body;
    const response = await fetch(
      "http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/send-verification-mail",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      }
    );
    if (response.ok) {
      return res.status(200).json({ message: "Verification email sent" });
    }
    return res
      .status(400)
      .json({ message: "Failed to send verification email" });
  } catch (error) {
    console.error("Send verification email error:", error);
    res.status(500).json({ message: error.message });
  }
}

async function verifyEmail(req, res) {
  try {
    console.log("Verify email request:", req.body);

    const { email, verified } = req.body;
    console.log("Email:", email);
    console.log("Verified:", verified);
    console.log("Email:", email);
    console.log("Verified:", verified);
    const user = await User.findOneAndUpdate(
      { email },
      { verified },
      { new: true }
    );
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "Email verified", success: true });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: error.message });
  }
}

module.exports = {
  handleGoogleCallback,
  signup,
  login,
  logout,
  getStatus,
  sendVerificationEmail,
  verifyEmail,
};
