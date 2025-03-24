document.addEventListener("DOMContentLoaded", function () {
  const chatInput = document.getElementById("chat-input");
  const sendButton = document.getElementById("send-message");
  const chatMessages = document.getElementById("chat-messages");
  const chatbotLoader = document.getElementById("chatbot-loader");
  const IP_ADD = process.env.IP_ADD;


  // Check if user is authenticated and has premium subscription before allowing chat
  async function checkAuthAndSubscription(callback) {
    try {
      const profileResponse = await fetch(`http://${IP_ADD}:3000/profile`, {
        credentials: "include",
      });
      const profile = await profileResponse.json();

      if (
        profile.subscription === "premium" ||
        profile.role === "super_admin"
      ) {
        callback(true);
      } else {
        addBotMessage(
          "This feature is only available to Premium users. Please upgrade your subscription to use the chatbot."
        );
        callback(false);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      addBotMessage("Please log in to use the chatbot.");
      callback(false);
    }
  }

  // Send message when button is clicked
  sendButton.addEventListener("click", function () {
    sendMessage();
  });

  // Send message when Enter key is pressed
  chatInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    checkAuthAndSubscription(function (isAuthorized) {
      if (!isAuthorized) return;

      // Add user message to chat
      addUserMessage(message);
      chatInput.value = "";

      // Show loader
      chatbotLoader.style.display = "block";

      // Get page content and send to backend
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
          { target: { tabId: tabs[0].id }, function: getPageContent },
          (results) => {
            if (results && results[0]) {
              const pageContent = results[0].result;
              processChat(message, pageContent, tabs[0].url);
            } else {
              chatbotLoader.style.display = "none";
              processChat(
                message,
                "Unable to access page content",
                tabs[0].url
              );
            }
          }
        );
      });
    });
  }

  function getPageContent() {
    return document.body.innerText.slice(0, 10000);
  }

  function processChat(userMessage, pageContent, url) {
    fetch(`http://${IP_ADD}:3000/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        pageContent: pageContent,
        url: url,
      }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        chatbotLoader.style.display = "none";
        addBotMessage(data.response);
      })
      .catch((error) => {
        console.error("Error:", error);
        chatbotLoader.style.display = "none";
        addBotMessage(
          "⚠️ Sorry, I couldn't process your request. Please try again."
        );
      });
  }

  function addUserMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "user-message";
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addBotMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "bot-message";
    messageElement.innerHTML = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
