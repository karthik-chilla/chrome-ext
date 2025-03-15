const express = require("express");
const session = require("express-session");
const summarise = require("../controllers/Summary");
const { Summary, Tag } = require("../models/Summary");
const passport = require("passport");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Protect all routes with JWT authentication
router.use(passport.authenticate("jwt", { session: false }));

router.post("/", summarise);

// Add delete route
router.delete("/summaries/:id", async (req, res) => {
  try {
    const summary = await Summary.findById(req.params.id);

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    // Check if the summary belongs to the user
    if (summary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Summary.findByIdAndDelete(req.params.id);
    res.json({ message: "Summary deleted successfully" });
  } catch (error) {
    console.error("Error deleting summary:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

router.post("/summaries/generate", async (req, res) => {
  try {
    const { url, type, aiProvider, save } = req.body;

    // Call the summarise function with the selected AI provider
    const summary = await summarise({
      body: { url, type, save },
      user: req.user,
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

    const existingSummary = await Summary.findOne({
      url,
      user: req.user._id,
    });

    if (!existingSummary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    const text = existingSummary.text;
    if (!text) {
      return res.status(404).json({ error: "Original text not found" });
    }

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

    const mockRes = {
      json: (data) => res.json(data),
      status: (code) => ({
        json: (data) => res.status(code).json(data),
      }),
    };

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

    const summaries = await Summary.find({
      user: userId,
      lastAccessed: { $gte: thirtyDaysAgo },
      isSaved: true,
    });

    let totalSummaries = 0;
    let shortCount = 0;
    let longCount = 0;

    summaries.forEach((summary) => {
      if (summary.shortSummary) {
        totalSummaries++;
        shortCount++;
      }
      if (summary.longSummary) {
        totalSummaries++;
        longCount++;
      }
    });

    const dailySummaries = {};
    const domains = {};
    const summaryTypes = { short: 0, long: 0 };
    const aiProviders = {};

    summaries.forEach((summary) => {
      const date = summary.lastAccessed.toISOString().split("T")[0];
      dailySummaries[date] =
        (dailySummaries[date] || 0) +
        (summary.shortSummary ? 1 : 0) +
        (summary.longSummary ? 1 : 0);

      if (summary.domain) {
        domains[summary.domain] =
          (domains[summary.domain] || 0) +
          (summary.shortSummary ? 1 : 0) +
          (summary.longSummary ? 1 : 0);
      }

      if (summary.shortSummary && summary.aiProvider_short) {
        aiProviders[summary.aiProvider_short] =
          (aiProviders[summary.aiProvider_short] || 0) + 1;
      }
      if (summary.longSummary && summary.aiProvider_long) {
        aiProviders[summary.aiProvider_long] =
          (aiProviders[summary.aiProvider_long] || 0) + 1;
      }
    });

    const today = new Date().toISOString().split("T")[0];
    const todaySummaries = dailySummaries[today] || 0;

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
        long: longCount,
      },
      aiProviders,
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.post(
  "/summarize/file-summary",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (req.user.subscription === "free" && req.user.role !== "super_admin") {
        return res.status(403).json({
          error: "Upgrade to Premium for file summaries",
          redirectTo: "payment",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert buffer to text
      const text = req.file.buffer.toString("utf-8");
      const type = req.body.type || "short";

      // Create mock request for summarise controller
      const mockReq = {
        user: req.user,
        body: {
          text,
          type,
          save: false,
          url: `file-summary-${Date.now()}`,
          domain: "File Summary",
          title: req.file.originalname,
          aiProvider: "gemini", // Always use Gemini for file summaries
        },
      };

      // Create mock response
      const mockRes = {
        json: (data) => res.json(data),
        status: (code) => ({
          json: (data) => res.status(code).json(data),
        }),
      };

      await summarise(mockReq, mockRes);
    } catch (error) {
      console.error("File summary error:", error);
      res.status(500).json({ error: "Failed to process file summary" });
    }
  }
);

router.post("/download-file-summary", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (
      req.user.subscription !== "premium" &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({
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
