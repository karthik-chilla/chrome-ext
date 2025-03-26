const { Summary, Tag } = require("../models/Summary");
const User = require("../models/User");
const summarise = require("./Summary");

async function deleteSummary(req, res) {
  try {
    const summary = await Summary.findById(req.params.id);

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    if (summary.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Summary.findByIdAndDelete(req.params.id);
    res.json({ message: "Summary deleted successfully" });
  } catch (error) {
    console.error("Error deleting summary:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
}

async function generateSummary(req, res) {
  try {
    const { url, type, aiProvider, save } = req.body;

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
}

async function getSummaries(req, res) {
  try {
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
}

async function searchSummaries(req, res) {
  try {
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
}

async function getTags(req, res) {
  try {
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
}

async function getSummariesByTag(req, res) {
  try {
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
}

module.exports = {
  deleteSummary,
  generateSummary,
  getSummaries,
  searchSummaries,
  getTags,
  getSummariesByTag,
};
