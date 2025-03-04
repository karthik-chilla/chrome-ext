const express = require("express");
const summarise = require("../controllers/Summary");
const Summary = require("../models/Summary");

const router = express.Router();

router.post("/", summarise);

// Get all summaries
router.get("/summaries", async (req, res) => {
  try {
    const summaries = await Summary.find().sort({ lastAccessed: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summaries." });
  }
});

// Search summaries by text or tags
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    const summaries = await Summary.find({
      $or: [
        { text: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
        { title: { $regex: query, $options: "i" } },
        { domain: { $regex: query, $options: "i" } },
      ],
    }).sort({ lastAccessed: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to search summaries." });
  }
});

// Get all unique tags
router.get("/tags", async (req, res) => {
  try {
    const summaries = await Summary.find({}, { tags: 1 });
    const allTags = summaries.flatMap(summary => summary.tags);
    
    // Count occurrences of each tag
    const tagCounts = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
    
    // Convert to array of objects with name and count
    const uniqueTags = Object.entries(tagCounts).map(([name, count]) => ({
      name,
      count
    }));
    
    // Sort by count (most frequent first)
    uniqueTags.sort((a, b) => b.count - a.count);
    
    res.json(uniqueTags);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tags." });
  }
});

// Get summaries by tag
router.get("/by-tag/:tag", async (req, res) => {
  try {
    const { tag } = req.params;
    const summaries = await Summary.find({ tags: tag }).sort({ lastAccessed: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch summaries by tag." });
  }
});

// Download summary
router.get("/download", async (req, res) => {
  try {
    const { url, type } = req.query;
    const summary = await Summary.findOne({ url });
    if (!summary) {
      return res.status(404).json({ error: "Summary not found." });
    }
    const content = type === "short" ? summary.shortSummary : summary.longSummary;
    res.setHeader("Content-Disposition", `attachment; filename=${type}-summary.txt`);
    res.setHeader("Content-Type", "text/plain");
    res.send(content);
  } catch (error) {
    res.status(500).json({ error: "Failed to download summary." });
  }
});

// Get user profile summaries
router.get("/user-summaries", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const userId = req.user._id;
    const summaries = await Summary.find({ userId }).sort({ lastAccessed: -1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user summaries." });
  }
});

module.exports = router;