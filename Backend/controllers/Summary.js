const { Summary, Tag } = require("../models/Summary");
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

    const isFileSummary = url.startsWith("file-");
    if (!isFileSummary && !isValidUrl(url)) {
      console.error("Invalid URL:", url);
      return res.status(400).json({ error: "Invalid URL" });
    }

    // Check if summary exists with the requested provider
    let existingSummary = await Summary.findOne({
      url,
      user: req.user._id,
    }).populate("tags");

    if (existingSummary) {
      const summaryField = `${type}Summary_${aiProvider}`;
      if (existingSummary[summaryField]) {
        return res.json({ response: existingSummary[summaryField] });
      }
    }

    let generatedSummary;
    try {
      if (aiProvider === "gemini") {
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

    if (save) {
      if (!existingSummary) {
        const tagIds = await generateTags(text, req.user._id);

        // Create new summary document with provider-specific fields
        const summaryData = {
          user: req.user._id,
          url,
          domain: typeof domain === "string" ? domain : String(domain),
          title: typeof title === "string" ? title : String(title),
          text,
          lastAccessed: new Date(),
          tags: tagIds,
        };

        // Add the summary to the correct provider field
        summaryData[`${type}Summary_${aiProvider}`] = generatedSummary;

        existingSummary = new Summary(summaryData);
      } else {
        // Update the correct provider field
        const summaryField = `${type}Summary_${aiProvider}`;
        existingSummary[summaryField] = generatedSummary;
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
