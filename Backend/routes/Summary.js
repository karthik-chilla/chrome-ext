const express = require("express");
const session = require("express-session");
const summarise = require("../controllers/Summary");
const { Summary, Tag } = require("../models/Summary");
const passport = require("passport");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer(storage);

const router = express.Router();

// Protect all routes with JWT authentication
router.use(passport.authenticate("jwt", { session: false }));

router.post("/", summarise);

router.post("/summaries/generate", async (req, res) => {
  try {
    const { url, type, aiProvider, save } = req.body;

    // Call the summarise function with the selected AI provider
    const summary = await summarise({
      body: { url, type, save },
      user: req.user, // Ensure authentication is handled
      aiProvider,
    });

    res.json({ response: summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.get("/generate", async (req, res) => {
  try {
    const { url, type } = req.query;

    if (!url || !type) {
      return res.status(400).json({ error: "Missing url or type parameter" });
    }

    // Get the existing summary
    const existingSummary = await Summary.findOne({
      url,
      user: req.user._id,
    });

    if (!existingSummary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    // Get the page content from the existing summary
    const text = existingSummary.text;
    if (!text) {
      return res.status(404).json({ error: "Original text not found" });
    }

    // Create request object for summarise controller
    const mockReq = {
      body: {
        text,
        url,
        type,
        domain: existingSummary.domain,
        title: existingSummary.title,
        save: true,
      },
      user: req.user,
    };

    // Create response object
    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({
        json: (data) => res.status(code).json(data),
      }),
    };

    // Generate the summary
    await summarise(mockReq, mockRes);
  } catch (error) {
    console.error("Generate summary error:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

router.get("/user-analytics", async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all summaries for the user
    const summaries = await Summary.find({
      user: userId,
      lastAccessed: { $gte: thirtyDaysAgo },
      isSaved: true
    });

    let totalSummaries = 0;
    let shortCount = 0;
    let longCount = 0;

    summaries.forEach(summary => {
      if (summary.shortSummary) {
        totalSummaries++;
        shortCount++;
      }
      if (summary.longSummary) {
        totalSummaries++;
        longCount++;
      }
    });


    // Calculate daily summaries
    const dailySummaries = {};
    const domains = {};
    const summaryTypes = { short: 0, long: 0 };
    const aiProviders = {};

    summaries.forEach((summary) => {
      // Daily summaries
      const date = summary.lastAccessed.toISOString().split("T")[0];
      dailySummaries[date] = (dailySummaries[date] || 0) + 
        (summary.shortSummary ? 1 : 0) + (summary.longSummary ? 1 : 0);


      // Domain stats
      if (summary.domain) {
        domains[summary.domain] = (domains[summary.domain] || 0) + 
          (summary.shortSummary ? 1 : 0) + (summary.longSummary ? 1 : 0);
      }
      

      if (summary.shortSummary && summary.aiProvider_short) {
        aiProviders[summary.aiProvider_short] = (aiProviders[summary.aiProvider_short] || 0) + 1;
      }
      if (summary.longSummary && summary.aiProvider_long) {
        aiProviders[summary.aiProvider_long] = (aiProviders[summary.aiProvider_long] || 0) + 1;
      }
    });

    // Get today's summaries
    const today = new Date().toISOString().split("T")[0];
    const todaySummaries = dailySummaries[today] || 0;

    // Get most used AI provider
    const favoriteAi =
      Object.entries(aiProviders).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "None";

    res.json({
      totalSummaries,
      todaySummaries,
      favoriteAi,
      dailySummaries,
      domains,
      summaryTypes: {
        short: shortCount,
        long: longCount
      },
      aiProviders,
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});


router.post("/summarize/file-summary", upload.single("file"), async (req, res) => {
  try {
    // Check user authentication
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check user subscription
    if (req.user.subscription === "free") {
      return res
        .status(403)
        .json({
          error: "Upgrade to Premium for file summaries",
          redirectTo: "payment",
        });
    }

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Convert buffer to text
    const text = req.file.buffer.toString("utf-8");
    const type = req.body.type || "short";

    // Use the same summarise function but with save=false
    const mockReq = {
      user: req.user,
      body: {
        text,
        type,
        save: false,
        url: `file-summary-${Date.now()}`,
        domain: "File Summary",
        title: req.file.originalname,
      },
    };

    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (statusCode) => ({
        json: (data) => {
          res.status(statusCode).json(data);
        },
      }),
    };

    // Call the summarise function
    await summarise(mockReq, mockRes);
  } catch (error) {
    console.error("File summary error:", error);
    res.status(500).json({ error: "Failed to process file summary" });
  }
});


router.post("/download-file-summary", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.subscription !== "premium") {
      return res
        .status(403)
        .json({
          error: "Upgrade to Premium to download summaries",
          redirectTo: "payment",
        });
    }

    const { content, type } = req.body;
    if (!content) {
      return res.status(400).json({ error: "No content provided" });
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${type}-file-summary.txt`
    );
    res.send(content);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to download summary" });
  }
});

router.get("/summaries", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { aiProvider } = req.query;
    const filter = { user: req.user._id };

    // Add AI provider filter if specified
    if (aiProvider && aiProvider !== "all") {
      filter.aiProvider = aiProvider;
    }

    const summaries = await Summary.find(filter)
      .populate("tags")
      .sort({ lastAccessed: -1 });

    res.json(summaries);
  } catch (error) {
    console.error("Error fetching summaries:", error);
    res.status(500).json({ error: "Failed to fetch summaries." });
  }
});

// Search summaries by text or tags
router.get("/search", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { query, aiProvider } = req.query;
    const filter = {
      user: req.user._id,
      $or: [
        { text: { $regex: query, $options: "i" } },
        { title: { $regex: query, $options: "i" } },
        { domain: { $regex: query, $options: "i" } },
      ],
    };

    // Add AI provider filter if specified
    if (aiProvider && aiProvider !== "all") {
      filter.aiProvider = aiProvider;
    }

    const summaries = await Summary.find(filter)
      .populate({
        path: "tags",
        match: { name: { $regex: query, $options: "i" } },
      })
      .sort({ lastAccessed: -1 });

    res.json(summaries);
  } catch (error) {
    console.error("Error searching summaries:", error);
    res.status(500).json({ error: "Failed to search summaries." });
  }
});

// Get all unique tags
router.get("/tags", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const tags = await Tag.aggregate([
      { $match: { userId: req.user._id } },
      {
        $lookup: {
          from: "summaries",
          localField: "_id",
          foreignField: "tags",
          as: "summaries",
        },
      },
      {
        $project: {
          name: 1,
          count: { $size: "$summaries" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags." });
  }
});

// Get summaries by tag
router.get("/by-tag/:tag", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { tag } = req.params;
    const tagDoc = await Tag.findOne({
      name: tag,
      userId: req.user._id,
    });

    if (!tagDoc) {
      return res.json([]);
    }

    const summaries = await Summary.find({
      user: req.user._id,
      tags: tagDoc._id,
    })
      .populate("tags")
      .sort({ lastAccessed: -1 });

    res.json(summaries);
  } catch (error) {
    console.error("Error fetching summaries by tag:", error);
    res.status(500).json({ error: "Failed to fetch summaries by tag." });
  }
});

// Download summary
router.get("/download", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { url, type } = req.query;
    const summary = await Summary.findOne({
      url,
      user: req.user._id,
    }).populate("tags");

    if (!summary) {
      return res.status(404).json({ error: "Summary not found." });
    }

    const content =
      type === "short" ? summary.shortSummary : summary.longSummary;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${type}-summary.txt`
    );
    res.setHeader("Content-Type", "text/plain");
    res.send(content);
  } catch (error) {
    console.error("Error downloading summary:", error);
    res.status(500).json({ error: "Failed to download summary." });
  }
});

module.exports = router;
