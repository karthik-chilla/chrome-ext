const express = require("express");
const passport = require("passport");
const {
  deleteSummary,
  generateSummary,
  getSummaries,
  searchSummaries,
  getTags,
  getSummariesByTag,
} = require("../controllers/SummaryController");
const { getUserAnalytics } = require("../controllers/UserAnalyticsController"); // Import the new controller

const router = express.Router();

// Protect all routes with JWT authentication
router.use(passport.authenticate("jwt", { session: false }));

router.post("/", generateSummary);
router.delete("/summaries/:id", deleteSummary);
router.get("/summaries", getSummaries);
router.get("/search", searchSummaries);
router.get("/tags", getTags);
router.get("/by-tag/:tag", getSummariesByTag);
router.get("/user-analytics", getUserAnalytics); // Use the new controller

module.exports = router;
