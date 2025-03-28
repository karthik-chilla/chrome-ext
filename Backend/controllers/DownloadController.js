const { Summary } = require("../models/Summary");

async function downloadSummary(req, res) {
  try {
    const { url, type } = req.query;

    if (!url || !type) {
      return res.status(400).json({ error: "Missing required parameters: url or type" });
    }

    const summary = await Summary.findOne({ url, user: req.user._id });

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    const content =
      type === "short" ? summary.shortSummary : summary.longSummary;

    if (!content) {
      return res.status(404).json({ error: "Requested summary type not found" });
    }

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${type}-summary.txt`
    );
    res.setHeader("Content-Type", "text/plain");
    res.send(content);
  } catch (error) {
    console.error("Error downloading summary:", error);
    res.status(500).json({ error: "Failed to download summary" });
  }
}

module.exports = {
  downloadSummary,
};
