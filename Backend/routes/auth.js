const express = require("express");
const passport = require("passport");
const {
  handleGoogleCallback,
  signup,
  login,
  logout,
  getStatus,
  verifyEmail,
  sendVerificationEmail,
} = require("../controllers/Auth");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }), // if auth is successful the user is passed to next middleware
  handleGoogleCallback
);

router.post("/signup", signup);
router.post("/sendVerificationEmail", sendVerificationEmail);
router.post("/verifyEmail", verifyEmail);

router.post("/login", login);

router.get("/logout", logout);

router.get(
  "/status",

  passport.authenticate("jwt", { session: false }),
  getStatus
);

module.exports = router;
