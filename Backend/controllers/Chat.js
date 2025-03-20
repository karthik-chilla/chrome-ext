const { GoogleGenerativeAI } = require("@google/generative-ai");
const marked = require("marked"); // Import marked for Markdown parsing

const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Store chat history in memory (consider using a database for persistence)
const chatHistory = new Map();

// Helper function to get recent chat history
function getRecentHistory(userId, limit = 4) {
  if (!chatHistory.has(userId)) {
    return [];
  }
  return chatHistory.get(userId).slice(-limit);
}

// Helper function to add message to history
function addToHistory(userId, role, message) {
  if (!chatHistory.has(userId)) {
    chatHistory.set(userId, []);
  }
  chatHistory.get(userId).push({ role, message });
}

async function chatWithPage(req, res) {
  try {
    const { message, pageContent, url } = req.body;
    const userId = req.user._id.toString();

    // Get recent chat history
    const recentHistory = getRecentHistory(userId);
    const historyContext = recentHistory
      .map((h) => `${h.role}: ${h.message}`)
      .join("\n");

    // Create a universal prompt that includes chat history
    const prompt = `
      You are an advanced AI assistant capable of answering any question.
      
      The user is currently viewing this webpage: ${url}
      
      Here is the content from the webpage (use this as context when relevant):
      ${pageContent}

      Recent conversation history:
      ${historyContext}
      
      Current user question: ${message}
    `;

    // Generate response
    const result = await model.generateContent(prompt);
    const rawResponse = await result.response.text();

    // Add the interaction to history
    addToHistory(userId, "user", message);
    addToHistory(userId, "assistant", rawResponse);

    // Convert Markdown to HTML using marked.js
    const htmlResponse = marked.parse(rawResponse);

    res.json({ response: htmlResponse });
  } catch (error) {
    console.error("❌ Chat Error:", error.message || error);
    res.status(500).json({ error: "Error processing chat request" });
  }
}

module.exports = chatWithPage;
