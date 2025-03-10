const express = require("express");
const router = express.Router();
const User = require("../models/User");
const passport = require("passport");

// Middleware to check if user is super admin
const isSuperAdmin = async (req, res, next) => {
  if (req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ message: "Unauthorized access" });
  }
};

// Get all users (super_admin only)
router.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  isSuperAdmin,
  async (req, res) => {
    try {
      const users = await User.find(
        {},
        {
          password: 0,
          __v: 0,
        }
      ).sort({ createdAt: -1 });

      const stats = {
        total: users.length,
        free: users.filter((u) => u.subscription === "free").length,
        basic: users.filter((u) => u.subscription === "basic").length,
        premium: users.filter((u) => u.subscription === "premium").length,
      };

      res.json({ users, stats });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

// Delete user (super_admin only)
router.delete(
  "/users/:userId",
  passport.authenticate("jwt", { session: false }),
  isSuperAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting super_admin
      if (user.role === "super_admin") {
        return res.status(403).json({ message: "Cannot delete Super Admin" });
      }

      await User.findByIdAndDelete(req.params.userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  }
);

module.exports = router;
