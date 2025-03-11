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

const { pipeline } = require('@xenova/transformers');

let t5Summarizer;

async function loadModel() {
    try {
        console.log("Loading T5 model...");
        t5Summarizer = await pipeline("summarization", "t5-small");
        console.log("T5 model loaded successfully!");
    } catch (error) {
        console.error("Failed to load T5 model:", error);
        // Exit the process if the model fails to load
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
  console.log("Generating summary using Google T5...");

  const prompt = `Summarize the following content in ${
    type === "short" ? "1-2 sentences" : "2-3 paragraphs"
  }:\n\n${truncateText(text)}`;

  try {
    const result = await model.generateContent(prompt);

    // Log entire response object
    console.log("Google T5 API Response:", result);

    if (!result || !result.response) {
      throw new Error("T5 API returned an invalid response");
    }

    const summary = await result.response.text();
    
    if (!summary) {
      throw new Error("T5 API returned an empty summary");
    }

    return summary;
  } catch (error) {
    console.error("Google T5 Error:", error.message);
    throw new Error("Failed to generate summary with Google T5");
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
    console.log("Selected AI Provider:", aiProvider);

    const restrictedDomains = ['youtube.com', 'netflix.com', 'hulu.com', 'amazon.com/video'];
    const urlObj = new URL(url);
    const isDomainRestricted = restrictedDomains.some(domain => urlObj.hostname.includes(domain));
    
    if (isDomainRestricted) {
        return res.status(403).json({ 
            error: "This extension doesn't work on streaming/video websites",
            isRestricted: true
        });
    }

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
      } 
      else if(aiProvider === "t5") {
        generatedSummary = await generateSummaryWithT5(text, type);
      }
      else {
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
          shortSummary: type === "short" ? generatedSummary : "",
          longSummary: type === "long" ? generatedSummary : "",
          aiProvider,
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

/*
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
          case "gemini":
              if (!API_KEY) {
                  throw new Error("Gemini API key not configured");
              }
              generatedSummary = await generateSummaryWithGemini(text, type);
              break;
          case "t5":
              generatedSummary = await generateSummaryWithT5(text, type);
              break;
          default:
              throw new Error("Invalid AI provider selected");
      }


      const summaryHistoryEntry = {
        timestamp: new Date(),
        type,
        url,
        domain: domain || urlObj.hostname
    };
    
    await User.findByIdAndUpdate(req.user._id, {
        $inc: { summaryCount: 1 },
        $push: { summaryHistory: summaryHistoryEntry }
    });

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
}*/

module.exports = summarise;