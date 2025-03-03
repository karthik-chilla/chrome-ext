const Summary = require("../models/Summary");
const { GoogleGenerativeAI } = require("@google/generative-ai"); //imports class which helps to interact with Gemini models

const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY); //creates an instance using the API key  //esures that u are authorised to use Gemini
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function summarise(req, res) {
  try {
    const { text, type, url, domain, title, save } = req.body;
    const length = type === "short" ? "1-2 sentences" : "2-3 paragraphs";

    let existingSummary = await Summary.findOne({ url });
    console.log(save);

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

      const prompt = `Summarize the following content in ${length}:\n\n${text}`;
      const result = await model.generateContent(prompt);
      const generatedSummary = await result.response.text();

      if (!existingSummary) {
        existingSummary = new Summary({
          url,
          domain,
          title,
          shortSummary: type === "short" ? generatedSummary : "",
          longSummary: type === "long" ? generatedSummary : "",
          lastAccessed: new Date(),
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

      const totalSummaries = await Summary.countDocuments();
      if (totalSummaries > 100) {
        const leastUsedRecord = await Summary.findOne().sort({
          lastAccessed: 1,
        });
        if (leastUsedRecord)
          await Summary.findByIdAndDelete(leastUsedRecord._id);
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
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error fetching summary" });
  }
}

module.exports = summarise;
