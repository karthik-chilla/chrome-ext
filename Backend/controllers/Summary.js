const Summary = require("../models/Summary");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function truncateText(text, maxTokens = 30000) {
  return text.split(" ").slice(0, maxTokens).join(" ");
}

async function summarise(req, res) {
  try {
    const { text, type, url, domain, title, save } = req.body;
    const length = type === "short" ? "1-2 sentences" : "2-3 paragraphs";
    const truncatedText = truncateText(text);

    let existingSummary = await Summary.findOne({ url });
    if (save) {
      if (existingSummary) {
        if (type === "short" && existingSummary.shortSummary) {
          existingSummary.lastAccessed = new Date();
          await existingSummary.save();
          return res.json({ response: existingSummary.shortSummary });
        }

        if (type === "long" && existingSummary.longSummary) {
          existingSummary.lastAccessed = new Date();
          await existingSummary.save();
          return res.json({ response: existingSummary.longSummary });
        }
      }

      const prompt = `Summarize the following content in ${length}:\n\n${truncatedText}`;
      const result = await model.generateContent(prompt);
      const generatedSummary = await result.response.text();

      let tags = [];
      try {
        tags = await generateTags(text);
      } catch (error) {
        console.error("Error generating tags:", error);
      }

      if (!existingSummary) {
        existingSummary = new Summary({
          url,
          domain,
          title,
          text,
          shortSummary: type === "short" ? generatedSummary : "",
          longSummary: type === "long" ? generatedSummary : "",
          lastAccessed: new Date(),
          tags: tags,
        });
      } else {
        if (type === "short") {
          existingSummary.shortSummary = generatedSummary;
        } else {
          existingSummary.longSummary = generatedSummary;
        }
        existingSummary.lastAccessed = new Date();
        if (tags.length > 0) {
          existingSummary.tags = tags;
        }
      }

      await existingSummary.save();

      const totalSummaries = await Summary.countDocuments();
      if (totalSummaries > 100) {
        const leastUsedRecord = await Summary.findOne().sort({
          lastAccessed: 1,
        });
        if (leastUsedRecord) {
          await Summary.findByIdAndDelete(leastUsedRecord._id);
        }
      }

      res.json({ response: generatedSummary });
    } else {
      console.log("🔍 Fetching summary without saving");

      const prompt = `Summarize the following content in ${length}:\n\n${text}`;
      const result = await model.generateContent(prompt);
      const generatedSummary = await result.response.text();
      res.json({ response: generatedSummary });
    }
  } catch (error) {
    console.error(" Error:", error);
    res.status(500).json({ error: "Error fetching summary" });
  }
}

async function generateTags(text) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing.");
    }

    const prompt = `Generate 3-5 relevant tags for the following text. Return only comma-separated tags:\n\n${text.substring(
      0,
      5000
    )}`;
    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    const tags = response
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    console.log("Generated tags:", tags);
    return tags;
  } catch (error) {
    console.error("Gemini API Error (Tags):", error.message);
    throw new Error("Failed to generate tags.");
  }
}

// async function generateSummary(text, type) {
//   try {
//     const length = type === "short" ? "1-2 sentences" : "2-3 paragraphs";
//     const prompt = `Summarize the following content in ${length}:\n\n${text}`;
//     const result = await model.generateContent(prompt);
//     return await result.response.text();
//   } catch (error) {
//     console.error("Gemini API Error (Summary):", error.message);
//     throw new Error("Failed to generate summary.");
//   }
// }

// async function fallbackSummary(text, type) {

//   if (type === "short") {
//     return text.split(". ").slice(0, 2).join(". ") + ".";
//   } else {
//     return text.split(". ").slice(0, 6).join(". ") + ".";
//   }
// }

// async function fallbackTags(text) {

//   const words = text.toLowerCase().split(/\W+/);
//   const wordCount = {};

//   words.forEach(word => {
//     if (word.length > 4 && !["about", "there", "their", "would", "should", "could"].includes(word)) {
//       wordCount[word] = (wordCount[word] || 0) + 1;
//     }
//   });

//   return Object.entries(wordCount)
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 5)
//     .map(entry => entry[0]);
// }

// async function summarizeAndSave(url) {
//   try {
//     const extractedText = await extractTextFromURL(url);

//     if (!extractedText || extractedText.trim() === "") {
//       throw new Error("Extracted text is empty. Cannot summarize.");
//     }

//     let shortSummary, longSummary, tags;
//     try {
//       shortSummary = await generateSummary(extractedText, "short");
//       longSummary = await generateSummary(extractedText, "long");
//       tags = await generateTags(extractedText);
//     } catch (error) {
//       console.error("Gemini API failed, using fallback summarization:", error.message);
//       shortSummary = fallbackSummary(extractedText, "short");
//       longSummary = fallbackSummary(extractedText, "long");
//       tags = fallbackTags(extractedText);
//     }

//     const summary = new Summary({
//       url,
//       text: extractedText,
//       shortSummary,
//       longSummary,
//       tags,
//       lastAccessed: new Date(),
//     });

//     await summary.save();
//     return { shortSummary, longSummary };
//   } catch (error) {
//     console.error("summarizeAndSave Error:", error);
//     throw new Error("Failed to summarize content.");
//   }
// }

module.exports = summarise;
