const express = require("express");
const chatWithPage = require("../controllers/Chat");

const router = express.Router();

router.post("/", chatWithPage);

module.exports = router;