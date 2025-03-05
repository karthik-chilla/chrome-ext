document.addEventListener('DOMContentLoaded', function() {
  const generateSummaryBtn = document.getElementById('generate-summary');
  const moreButton = document.getElementById('more-button');
  const loader = document.getElementById('loader');
  const summary = document.getElementById('summary');
  const summaryTypeCheckbox = document.getElementById('summaryType');
  const summaryContainer = document.getElementById("summary-container");


  function displaySummary(summary) {
    summaryContainer.innerHTML = `
      <div class="card">
        <div class="card-body">
          <p class="card-text">${summary}</p>
        </div>
      </div>
    `;
  }

  function fetchAndDisplaySummary(type, text, isWholePage = false) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      const url = tab.url;
      const domain = new URL(url).hostname;


      console.log("Payload size:", new Blob([text]).size, "bytes");

      // Show loader
      loader.style.display = "block";
      summaryContainer.innerText = "";

      fetch("http://localhost:3000/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          url,
          domain,
          title: tab.title,
          type,
          save: true,
        }),
        credentials: "include",
      })
        .then((response) => response.json())
        .then((data) => {
          // Hide loader and display summary
          loader.style.display = "none";
          displaySummary(data.response);
        })
        .catch((error) => {
          // Hide loader and display error
          loader.style.display = "none";
          console.error("Error:", error);
          summaryContainer.innerText = "⚠️ Error generating summary. Please try again.";
        });
    });
  }

  function getSelectedOrFullText() {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      return { text: selectedText, isSelected: true };
    }

    // Get the whole page content (truncated to avoid exceeding token limits)
    const fullText = document.body.innerText;
    const maxTokens = 10000; // Adjust based on API limits
    const truncatedText = fullText.split(" ").slice(0, maxTokens).join(" ");
    return { text: truncatedText, isSelected: false };
  }

  // Check if user is authenticated before allowing summary generation
  generateSummaryBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id },
          func: getSelectedOrFullText,
        },
        (results) => {
          if (results && results[0]) {
            const { text, isSelected } = results[0].result;
            const type = summaryTypeCheckbox.checked ? "long" : "short";
            fetchAndDisplaySummary(type, text, !isSelected);
          } else {
            // Hide loader and display error
            loader.style.display = "none";
            summaryContainer.innerText = "⚠️ Could not access page content. Make sure you're on a compatible webpage.";
          }
        }
      );
    });
  });


  // More button functionality (placeholder for future features)
  moreButton.addEventListener('click', function() {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  });


  
  
});