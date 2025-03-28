const express = require("express");
const passport = require("passport");
const multer = require("multer");
const {
  deleteSummary,
  generateSummary,
  getSummaries,
  searchSummaries,
  getTags,
  getSummariesByTag,
} = require("../controllers/SummaryController");
const { getUserAnalytics } = require("../controllers/UserAnalyticsController");
const { downloadSummary } = require("../controllers/DownloadController");
const { processFileSummary } = require("../controllers/FileSummaryController");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Protect all routes with JWT authentication
router.use(passport.authenticate("jwt", { session: false }));

// Check subscription for file summaries
const checkSubscription = async (req, res, next) => {
  if (req.user.subscription === "free" && req.user.role !== "super_admin") {
    return res.status(403).json({
      error: "Upgrade to Basic or Premium for file summaries",
      redirectTo: "payment",
    });
  }
  next();
};

router.post("/", generateSummary);
router.delete("/summaries/:id", deleteSummary);
router.get("/summaries", getSummaries);
router.get("/search", searchSummaries);
router.get("/tags", getTags);
router.get("/by-tag/:tag", getSummariesByTag);
router.get("/user-analytics", getUserAnalytics);
router.get("/download", downloadSummary);

// Add subscription check middleware for file summary route
router.post(
  "/file-summary",
  checkSubscription,
  upload.single("file"),
  processFileSummary
);

module.exports = router;
