const express = require("express");
const passport = require("passport");
const {
  handleGoogleCallback,
  signup,
  login,
  logout,
  getStatus,
} = require("../controllers/Auth");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  handleGoogleCallback
);

router.post("/signup", signup);

router.post("/login", login);

router.get("/logout", logout);

router.get(
  "/status",
  passport.authenticate("jwt", { session: false }),
  getStatus
);

module.exports = router;
