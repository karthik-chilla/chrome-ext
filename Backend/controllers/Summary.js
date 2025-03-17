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
  mixtral: "mixtral-8x7b-32768",
};

const { pipeline } = require("@xenova/transformers");

let t5Summarizer;

async function loadModel() {
  try {
    console.log("Loading T5 model...");
    t5Summarizer = await pipeline("summarization", "Xenova/t5-small");
    console.log("T5 model loaded successfully!");
  } catch (error) {
    console.error("Failed to load T5 model:", error);
    process.exit(1);
  }
}

loadModel();

function truncateText(text, maxTokens = 30000) {
  return text.split(" ").slice(0, maxTokens).join(" ");
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
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


async function generateSummaryWithT5(text, type) {
  try {
    console.log("Generating summary using T5...");

    // Improved text preprocessing
    const cleanText = text
      .replace(/\s+/g, ' ')
      .trim();

    // Calculate appropriate length based on type
    const maxLength = type === "short" ? 50 : 150;
    const minLength = type === "short" ? 30 : 100;

    // Split text into chunks if it's too long
    const maxInputLength = 512; // T5's max input length
    const chunks = [];
    const words = cleanText.split(' ');
    
    for (let i = 0; i < words.length; i += maxInputLength) {
      chunks.push(words.slice(i, i + maxInputLength).join(' '));
    }

    // Generate summary for each chunk
    const summaries = await Promise.all(
      chunks.map(async (chunk) => {
        const result = await t5Summarizer(chunk, {
          max_length: maxLength,
          min_length: minLength,
          length_penalty: 2.0,
          num_beams: 6, // Increased for better quality
          early_stopping: true,
          no_repeat_ngram_size: 3,
          do_sample: false // Deterministic generation
        });

        return result[0].summary_text;
      })
    );

    // Combine summaries if there were multiple chunks
    let finalSummary = summaries.join(' ');

    // Post-process the summary
    finalSummary = finalSummary
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^"|"$/g, '') // Remove quotes if present
      .replace(/\.$/, '') + '.'; // Ensure it ends with a period

    if (!finalSummary) {
      throw new Error("T5 model failed to generate a summary");
    }

    return finalSummary;
  } catch (error) {
    console.error("T5 Error:", error.message);
    throw new Error("Failed to generate summary with T5");
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
    } = req.body;

    // Handle file summaries
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
      } else if (aiProvider === "t5") {
        generatedSummary = await generateSummaryWithT5(text, type);
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
    // Log the generated summary

    if (save && !isFileSummary) {
      try {
        // Find existing summary
        let existingSummary = await Summary.findOne({
          url,
          user: req.user._id,
        });

        const tagIds = await generateTags(text, req.user._id);

        if (existingSummary) {
          // Update existing summary
          existingSummary.text = text;
          existingSummary.domain = domain;
          existingSummary.title = title;
          existingSummary.lastAccessed = new Date();
          existingSummary.tags = tagIds;
          existingSummary.isSaved = true;

          // Update the appropriate summary field and AI provider based on type
          if (type === "short") {
            existingSummary.shortSummary = generatedSummary;
            existingSummary.aiProvider_short = aiProvider;
          } else {
            existingSummary.longSummary = generatedSummary;
            existingSummary.aiProvider_long = aiProvider;
          }

          await existingSummary.save();
        } else {
          // Create new summary
          const summaryData = {
            user: req.user._id,
            url,
            domain,
            title,
            text,
            lastAccessed: new Date(),
            tags: tagIds,
            isSaved: true,
          };

          // Set the appropriate summary field and AI provider based on type
          if (type === "short") {
            summaryData.shortSummary = generatedSummary;
            summaryData.aiProvider_short = aiProvider;
          } else {
            summaryData.longSummary = generatedSummary;
            summaryData.aiProvider_long = aiProvider;
          }

          existingSummary = new Summary(summaryData);
          await existingSummary.save();
        }

        // Update user's summary count and history
        const summaryHistoryEntry = {
          timestamp: new Date(),
          type,
          url,
          domain,
        };

        await User.findByIdAndUpdate(req.user._id, {
          $inc: { summaryCount: 1 },
          $push: { summaryHistory: summaryHistoryEntry },
        });

        // Clean up old summaries if limit reached
        const totalSummaries = await Summary.countDocuments({
          user: req.user._id,
        });

        if (totalSummaries > 100) {
          const leastUsedRecord = await Summary.findOne({
            user: req.user._id,
          }).sort({
            lastAccessed: 1,
          });
          if (leastUsedRecord) {
            await Summary.findByIdAndDelete(leastUsedRecord._id);
          }
        }
      } catch (error) {
        console.error("Error saving summary:", error);
        return res.status(500).json({ error: "Error saving summary" });
      }
    }

    res.json({ response: generatedSummary });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching summary" });
  }
}


module.exports = summarise;
