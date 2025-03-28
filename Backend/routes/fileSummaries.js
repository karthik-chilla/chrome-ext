const express = require("express");
const router = express.Router();
const { processFileSummary } = require("../controllers/FileSummaryController");
const multer = require("multer");

// Configure multer for file uploads
const upload = multer();

// Route to process file summaries
router.post("/", upload.single("file"), processFileSummary);

router.use((req, res, next) => {
    res.status(404).json({ error: "Endpoint not found" });
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

module.exports = router;
