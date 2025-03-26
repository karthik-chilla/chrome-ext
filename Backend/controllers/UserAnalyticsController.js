const { Summary } = require("../models/Summary");

async function getUserAnalytics(req, res) {
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
}

module.exports = {
  getUserAnalytics,
};
