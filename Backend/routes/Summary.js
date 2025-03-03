const express = require("express");
const summarise = require("../controllers/Summary");

const router = express.Router();

router.post("/", summarise);

module.exports = router;
