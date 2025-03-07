const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function chatWithPage(req, res) {
  try {
    const { message, pageContent, url } = req.body;

    // Create a universal prompt that handles both webpage-specific and general questions
    const prompt = `
      You are an advanced AI assistant capable of answering any question.
      
      The user is currently viewing this webpage: ${url}
      
      Here is the content from the webpage (use this as context when relevant):
      ${pageContent}
      
      User question: ${message}
      
      Important instructions:
      1. If the question is about the webpage content, use the provided content to answer accurately.
      2. If the question is general knowledge or unrelated to the webpage, answer it using your knowledge.
      3. You can answer ANY question, whether it's related to the webpage or not.
      4. Be helpful, informative, and conversational in your responses.
      5. If you're unsure if something is on the webpage, you can say "Based on my knowledge..." instead of "I don't see that on the webpage."
      6. Always prioritize being helpful over stating limitations.
    `;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    res.json({ response });
  } catch (error) {
    console.error("❌ Chat Error:", error);
    res.status(500).json({ error: "Error processing chat request" });
  }
}

module.exports = chatWithPage;
