const { Summary, Tag } = require("../models/Summary");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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

/*const isFileSummary = url.startsWith("file-");
    if (!isFileSummary && !isValidUrl(url)) {
      console.error("Invalid URL:", url);
      return res.status(400).json({ error: "Invalid URL" });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

*/

async function generateSummaryWithGemini(text, type) {
  const prompt = `Summarize the following content in ${
    type === "short" ? "1-2 sentences" : "2-3 paragraphs"
  }:\n\n${truncateText(text)}`;

  const result = await model.generateContent(prompt);
  return await result.response.text();
}

async function generateSummaryWithDeepSeek(text, type) {
  try {
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "user",
            content: `Summarize the following content in ${
              type === "short" ? "1-2 sentences" : "2-3 paragraphs"
            }:\n\n${truncateText(text)}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek API Error:", error.message);
    throw new Error("Failed to generate summary with DeepSeek");
  }
}

async function generateSummaryWithHuggingFace(text, type) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        inputs: truncateText(text),
        parameters: {
          max_length: type === "short" ? 64 : 256,
          min_length: type === "short" ? 32 : 128,
          do_sample: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data[0].summary_text;
  } catch (error) {
    console.error("Hugging Face API Error:", error.message);
    throw new Error("Failed to generate summary with Hugging Face");
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
      // Find existing tag or create new one
      let tag = await Tag.findOne({ name: tagName, userId });
      if (!tag) {
        tag = await Tag.create({ name: tagName, userId });
      }
      tagIds.push(tag._id);
    }

    return tagIds;
  } catch (error) {
    console.error("Tag Generation Error:", error.message);
    return []; // Return empty array if tag generation fails
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

    const isFileSummary = url.startsWith("file-");
    if (!isFileSummary && !isValidUrl(url)) {
      console.error("Invalid URL:", url);
      return res.status(400).json({ error: "Invalid URL" });
    }

    let existingSummary = await Summary.findOne({
      url,
      user: req.user._id,
    }).populate("tags");

    if (existingSummary) {
      // Return the existing summary if it matches the requested type
      if (type === "short" && existingSummary.shortSummary) {
        return res.json({ response: existingSummary.shortSummary });
      }
      if (type === "long" && existingSummary.longSummary) {
        return res.json({ response: existingSummary.longSummary });
      }
    }

    let generatedSummary;
    try {
      switch (aiProvider.toLowerCase()) {
        case "deepseek":
          if (!DEEPSEEK_API_KEY) {
            throw new Error("DeepSeek API key not configured");
          }
          generatedSummary = await generateSummaryWithDeepSeek(text, type);
          break;
        case "huggingface":
          if (!HUGGING_FACE_API_KEY) {
            throw new Error("Hugging Face API key not configured");
          }
          generatedSummary = await generateSummaryWithHuggingFace(text, type);
          break;
        case "gemini":
        default:
          if (!API_KEY) {
            throw new Error("Gemini API key not configured");
          }
          generatedSummary = await generateSummaryWithGemini(text, type);
          break;
      }
    } catch (error) {
      console.error(`${aiProvider} API Error:`, error);
      return res.status(500).json({
        error: `Failed to generate summary with ${aiProvider}. Falling back to Gemini.`,
        fallback: true,
      });
    }

    if (save) {
      if (!existingSummary) {
        // Generate tags and get their IDs
        const tagIds = await generateTags(text, req.user._id);

        existingSummary = new Summary({
          user: req.user._id,
          url,
          domain: typeof domain === "string" ? domain : String(domain),
          title: typeof title === "string" ? title : String(title),
          text,
          shortSummary: type === "short" ? generatedSummary : "",
          longSummary: type === "long" ? generatedSummary : "",
          lastAccessed: new Date(),
          tags: tagIds,
        });
      } else {
        if (type === "short") {
          existingSummary.shortSummary = generatedSummary;
        } else {
          existingSummary.longSummary = generatedSummary;
        }
        existingSummary.lastAccessed = new Date();
      }
      await existingSummary.save();

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
    }

    res.json({ response: generatedSummary });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error fetching summary" });
  }
}

module.exports = summarise;