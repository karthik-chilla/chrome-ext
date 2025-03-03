// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkAuth") {
    fetch("http://localhost:3000/auth/status", {
      method: "GET",
      credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
      sendResponse(data);
    })
    .catch(error => {
      console.error("Error checking auth status:", error);
      sendResponse({ isAuthenticated: false, error: error.message });
    });
    return true; // Required for async sendResponse
  }
});