const express = require("express");
const chatWithPage = require("../controllers/Chat");
const passport = require("passport");

const router = express.Router();

// Middleware to check premium subscription

// Protect chat route with JWT authentication and premium subscription check
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  chatWithPage
);

module.exports = router;
