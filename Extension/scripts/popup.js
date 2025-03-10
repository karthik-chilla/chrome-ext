document.addEventListener("DOMContentLoaded", function () {
  const generateSummaryBtn = document.getElementById("generate-summary");
  const moreButton = document.getElementById("more-button");
  const summaryLoader = document.getElementById("summary-loader");
  const summary = document.getElementById("summary");
  const summaryTypeCheckbox = document.getElementById("summaryType");

  // Mode switching
  const summaryModeBtn = document.getElementById("summary-mode-btn");
  const chatbotModeBtn = document.getElementById("chatbot-mode-btn");
  const summaryMode = document.getElementById("summary-mode");
  const chatbotMode = document.getElementById("chatbot-mode");

  // Profile dropdown
  const userAvatar = document.getElementById("user-avatar");
  const dropdownContent = document.querySelector(".dropdown-content");
  let isDropdownOpen = false;

  // Toggle dropdown on click
  userAvatar.addEventListener("click", function (e) {
    e.stopPropagation();
    isDropdownOpen = !isDropdownOpen;
    dropdownContent.style.display = isDropdownOpen ? "block" : "none";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", function () {
    isDropdownOpen = false;
    dropdownContent.style.display = "none";
  });

  // Check user subscription before enabling chatbot
  chatbotModeBtn.addEventListener("click", async function () {
    try {
      const response = await fetch("http://localhost:3000/profile", {
        credentials: "include",
      });
      const profile = await response.json();

      if (
        profile.subscription === "premium" ||
        profile.role === "super_admin"
      ) {
        chatbotModeBtn.classList.add("active");
        summaryModeBtn.classList.remove("active");
        chatbotMode.classList.remove("hidden");
        summaryMode.classList.add("hidden");
      } else {
        // Show premium required message
        const premiumMessage = document.createElement("div");
        premiumMessage.className = "premium-message";
        premiumMessage.textContent =
          "⭐ Premium subscription required to use the chatbot feature";

        // Create upgrade button
        const upgradeButton = document.createElement("button");
        upgradeButton.textContent = "Upgrade to Premium";
        upgradeButton.className = "upgrade-button";
        premiumMessage.appendChild(upgradeButton);

        // Replace summary content with premium message
        summary.innerHTML = "";
        summary.appendChild(premiumMessage);

        // Handle upgrade button click - Updated to go directly to payment section
        upgradeButton.addEventListener("click", function () {
          chrome.tabs.create({
            url: chrome.runtime.getURL("options.html#payment"),
            active: true,
          });
        });

        // Keep summary mode active
        summaryModeBtn.classList.add("active");
        chatbotModeBtn.classList.remove("active");
        summaryMode.classList.remove("hidden");
        chatbotMode.classList.add("hidden");
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      summary.textContent =
        "Error checking subscription status. Please try again.";
    }
  });

  summaryModeBtn.addEventListener("click", function () {
    summaryModeBtn.classList.add("active");
    chatbotModeBtn.classList.remove("active");
    summaryMode.classList.remove("hidden");
    chatbotMode.classList.add("hidden");
    // Clear any premium messages
    summary.textContent = "Summary will be generated here.";
  });

  // Check if user is authenticated before allowing summary generation
  generateSummaryBtn.addEventListener("click", function () {
    chrome.runtime.sendMessage({ action: "checkAuth" }, function (response) {
      if (response && response.isAuthenticated) {
        generateSummary();
      } else {
        summary.innerText = "Please log in to generate summaries.";
      }
    });
  });

  // More button functionality
  moreButton.addEventListener("click", function () {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  });

  function generateSummary() {
    const type = summaryTypeCheckbox.checked ? "long" : "short";

    summaryLoader.style.display = "block";
    summary.innerText = "";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        { target: { tabId: tabs[0].id }, function: getSelectedOrFullText },
        (results) => {
          if (results && results[0]) {
            const { text, isSelected } = results[0].result;
            fetchSummary(
              text,
              type,
              tabs[0].url,
              new URL(tabs[0].url).hostname,
              !isSelected
            );
          } else {
            summaryLoader.style.display = "none";
            summary.innerText =
              "⚠️ Could not access page content. Make sure you're on a compatible webpage.";
          }
        }
      );
    });
  }

  function getSelectedOrFullText() {
    const selectedText = window.getSelection().toString();

    if (selectedText) {
      return { text: selectedText, isSelected: true };
    }

    // Get the main content of the page (first 5000 chars)
    return { text: document.body.innerText.slice(0, 5000), isSelected: false };
  }

  function fetchSummary(text, type, url, domain, save) {
    fetch("http://localhost:3000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        url,
        domain,
        title: document.title,
        type,
        save,
      }),
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        summaryLoader.style.display = "none";
        summary.innerText = data.response;
      })
      .catch((error) => {
        console.error("Error:", error);
        summaryLoader.style.display = "none";
        summary.innerText = "⚠️ Error generating summary. Please try again.";
      });
  }
});
