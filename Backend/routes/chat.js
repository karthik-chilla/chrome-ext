const express = require("express");
const chatWithPage = require("../controllers/Chat");
const passport = require("passport");

const router = express.Router();

// Protect chat route with JWT authentication
router.post("/", passport.authenticate('jwt', { session: false }), chatWithPage);

module.exports = router;