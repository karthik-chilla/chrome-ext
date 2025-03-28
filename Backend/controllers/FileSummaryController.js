const { Summary } = require("../models/Summary");
const summarise = require("./Summary");

async function processFileSummary(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
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
        save: true,
        url: `file-summary-${Date.now()}`,
        domain: "File Summary",
        title: req.file.originalname,
        aiProvider: "gemini", // Always use Gemini for file summaries
      },
    };

    // Create mock response
    const mockRes = {
      json: (data) => {
        res.json(data);
      },
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        },
      }),
    };

    await summarise(mockReq, mockRes);
  } catch (error) {
    console.error("File summary error:", error);
    res.status(500).json({ error: "Failed to process file summary" });
  }
}

module.exports = {
  processFileSummary,
};
