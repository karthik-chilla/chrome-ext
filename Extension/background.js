// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkAuth") {
    fetch("http://localhost:3000/auth/status", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Auth status:", data);
        sendResponse(data);
      })
      .catch((error) => {
        console.error("Error checking auth status:", error);
        sendResponse({ isAuthenticated: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }

  if (message.action === "openPopup") {
    chrome.action.openPopup();
    return true;
  }
});

// Listen for Google Auth completion
chrome.webNavigation?.onCompleted.addListener(
  (details) => {
    if (details.url.includes("localhost:3000/auth/google/callback")) {
      // Refresh the auth status
      chrome.runtime.sendMessage({ action: "checkAuth" });
    }
  },
  { url: [{ urlContains: "localhost:3000/auth/google/callback" }] }
);
