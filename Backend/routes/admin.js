const express = require("express");
const router = express.Router();
const passport = require("passport");
const { getAnalytics, getUsers, deleteUser } = require("../controllers/Admin");

// Middleware to check if user is super admin
const isSuperAdmin = async (req, res, next) => {
  if (req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ message: "Unauthorized access" });
  }
};

router.get(
  "/analytics",
  passport.authenticate("jwt", { session: false }),
  isSuperAdmin,
  getAnalytics
);

router.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  isSuperAdmin,
  getUsers
);

router.delete(
  "/users/:userId",
  passport.authenticate("jwt", { session: false }),
  isSuperAdmin,
  deleteUser
);

module.exports = router;
