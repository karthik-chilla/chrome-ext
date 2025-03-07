console.log("✅ Content script loaded!");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizePage") {
    const selectedText = window.getSelection().toString();
    const pageUrl = window.location.href;

    if (selectedText) {
      // Send selected text to the backend
      fetch("http://localhost:3000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedText,
          url: pageUrl,
          type: request.type,
          save: true,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          sendResponse({ summary: data.response });
        })
        .catch((error) => {
          console.error("Error:", error);
          sendResponse({ summary: "Error fetching summary." });
        });
    } else {
      // If no text is selected, summarize the entire page
      const fullText = document.body.innerText;
      const maxTokens = 30000; // Adjust based on API limits
      const truncatedText = fullText.split(" ").slice(0, maxTokens).join(" ");

      fetch("http://localhost:3000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: truncatedText,
          url: pageUrl,
          type: request.type,
          save: true,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          sendResponse({ summary: data.response });
        })
        .catch((error) => {
          console.error("Error:", error);
          sendResponse({ summary: "Error fetching summary." });
        });
    }

    return true; // Required for async sendResponse
  }
});