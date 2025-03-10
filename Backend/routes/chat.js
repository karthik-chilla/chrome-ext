const express = require("express");
const chatWithPage = require("../controllers/Chat");
const passport = require("passport");

const router = express.Router();

// Middleware to check premium subscription
const checkPremiumSubscription = (req, res, next) => {
  if (req.user.subscription === "premium" || req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({
      error: "Premium subscription required",
      redirectTo: "payment",
    });
  }
};

// Protect chat route with JWT authentication and premium subscription check
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  checkPremiumSubscription,
  chatWithPage
);

module.exports = router;
