const { Summary, Tag } = require("../models/Summary");
const User = require("../models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const GROQ_MODELS = {
  gemma: "gemma2-9b-it",
  llama: "llama-3.2-1b-preview",
  qwen32b: "qwen-2.5-coder-32b",
};

function truncateText(text, maxTokens = 30000) {
  return text.split(" ").slice(0, maxTokens).join(" ");
}

async function generateSummaryWithGemini(text, type) {
  const prompt = `Summarize the following content in ${
    type === "short" ? "1-2 sentences" : "2-3 paragraphs"
  }:\n\n${truncateText(text)}`;

  const result = await model.generateContent(prompt);
  return await result.response.text();
}

async function generateSummaryWithGroq(text, type, modelType) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: GROQ_MODELS[modelType],
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant that specializes in creating concise and accurate summaries.",
          },
          {
            role: "user",
            content: `Please provide a ${
              type === "short"
                ? "concise 1-2 sentence"
                : "detailed 2-3 paragraph"
            } summary of the following text:\n\n${truncateText(text)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: type === "short" ? 100 : 500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      `Groq API Error (${modelType}):`,
      error.response?.data || error.message
    );
    throw new Error(`Failed to generate summary with ${modelType}`);
  }
}

async function generateTags(text, userId) {
  try {
    const prompt = `Generate 3-5 relevant tags for the following text. Return only comma-separated tags:\n\n${text.substring(
      0,
      5000
    )}`;
    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    const tagNames = response
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const tagIds = [];
    for (const tagName of tagNames) {
      let tag = await Tag.findOne({ name: tagName, userId });
      if (!tag) {
        tag = await Tag.create({ name: tagName, userId });
      }
      tagIds.push(tag._id);
    }

    return tagIds;
  } catch (error) {
    console.error("Tag Generation Error:", error.message);
    return [];
  }
}

async function summarise(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const {
      text,
      type,
      url,
      domain,
      title,
      save,
      aiProvider = "gemini",
      response: existingSummary, // Add this to handle save requests
    } = req.body;

    // If this is a save request with existing summary, skip generation
    if (save && existingSummary) {
      try {
        let summary = await Summary.findOne({
          url,
          user: req.user._id,
        });

        let tagIds = [];
        try {
          tagIds = await generateTags(text, req.user._id);
        } catch (tagError) {
          console.error(
            "Tag generation error, proceeding without tags:",
            tagError
          );
          tagIds = []; // Ensure tagIds is an empty array if tag generation fails
        }

        if (summary) {
          // Update existing summary
          summary.text = text;
          summary.domain = domain;
          summary.title = title;
          summary.lastAccessed = new Date();
          summary.tags = tagIds;
          summary.isSaved = true;

          if (type === "short") {
            summary.shortSummary = existingSummary;
            summary.aiProvider_short = aiProvider;
          } else {
            summary.longSummary = existingSummary;
            summary.aiProvider_long = aiProvider;
          }
        } else {
          // Create new summary with existing generated content
          summary = new Summary({
            user: req.user._id,
            url,
            domain,
            title,
            text,
            lastAccessed: new Date(),
            tags: tagIds,
            isSaved: true,
            ...(type === "short"
              ? { shortSummary: existingSummary, aiProvider_short: aiProvider }
              : { longSummary: existingSummary, aiProvider_long: aiProvider }),
          });
        }

        await summary.save();

        // Update user's summary count and history
        await User.findByIdAndUpdate(req.user._id, {
          $inc: { summaryCount: 1 },
          $push: {
            summaryHistory: {
              timestamp: new Date(),
              type,
              url,
              domain,
            },
          },
        });

        const totalSummaries = await Summary.countDocuments({
          user: req.user._id,
        });

        if (totalSummaries > 100) {
          const leastUsedRecord = await Summary.findOne({
            user: req.user._id,
          })
            .sort({ lastAccessed: 1 })
            .exec(); // Ensure exec() is called to resolve the query
          if (leastUsedRecord) {
            await Summary.findByIdAndDelete(leastUsedRecord._id);
          }
        }
        return res.json({ response: existingSummary });
      } catch (error) {
        console.error("Error saving summary:", error);
        return res.status(500).json({ error: "Error saving summary" });
      }
    }

    // Continue with normal summary generation for non-save requests
    const isFileSummary = url.startsWith("file-summary-");
    if (isFileSummary) {
      // Check subscription for file summaries
      if (req.user.subscription === "free" && req.user.role !== "super_admin") {
        return res.status(403).json({
          error: "Upgrade to Premium for file summaries",
          redirectTo: "payment",
        });
      }
    } else {
      // Check URL restrictions for web summaries
      const restrictedDomains = [
        "youtube.com",
        "netflix.com",
        "hulu.com",
        "amazon.com/video",
      ];

      try {
        const urlObj = new URL(url); // Validate URL only if it's not a file summary
        const isDomainRestricted = restrictedDomains.some((domain) =>
          urlObj.hostname.includes(domain)
        );

        if (isDomainRestricted) {
          return res.status(403).json({
            error: "This extension doesn't work on streaming/video websites",
            isRestricted: true,
          });
        }
      } catch (error) {
        console.error("Invalid URL:", url);
        return res.status(400).json({ error: "Invalid URL" });
      }
    }

    let generatedSummary;
    try {
      // Always use Gemini for file summaries
      if (isFileSummary || aiProvider === "gemini") {
        if (!API_KEY) {
          throw new Error("Gemini API key not configured");
        }
        generatedSummary = await generateSummaryWithGemini(text, type);
      } else if (Object.keys(GROQ_MODELS).includes(aiProvider)) {
        if (!GROQ_API_KEY) {
          throw new Error("Groq API key not configured");
        }
        generatedSummary = await generateSummaryWithGroq(
          text,
          type,
          aiProvider
        );
      } else {
        throw new Error(`Invalid AI provider: ${aiProvider}`);
      }
    } catch (error) {
      console.error(`${aiProvider} API Error:`, error);
      return res.status(500).json({
        error: `Failed to generate summary with ${aiProvider}. Falling back to Gemini.`,
        fallback: true,
      });
    }

    res.json({ response: generatedSummary });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching summary" });
  }
}

module.exports = summarise;
