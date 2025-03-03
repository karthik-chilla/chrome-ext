document.addEventListener('DOMContentLoaded', function() {
  const generateSummaryBtn = document.getElementById('generate-summary');
  const moreButton = document.getElementById('more-button');
  const loader = document.getElementById('loader');
  const summary = document.getElementById('summary');
  const summaryTypeCheckbox = document.getElementById('summaryType');

  // Check if user is authenticated before allowing summary generation
  generateSummaryBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "checkAuth"}, function(response) {
      if (response && response.isAuthenticated) {
        generateSummary();
      } else {
        summary.innerText = "Please log in to generate summaries.";
      }
    });
  });

  // More button functionality (placeholder for future features)
  moreButton.addEventListener('click', function() {
    alert('More features coming soon!');
  });

  function generateSummary() {
    const isLong = summaryTypeCheckbox.checked ? "long" : "short";
    
    loader.style.display = "block";
    summary.innerText = "";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript(
        { target: { tabId: tabs[0].id }, function: getSelectedOrFullText },
        (results) => {
          if (results && results[0]) {
            const { text, isSelected } = results[0].result;
            fetchSummary(text, isLong, tabs[0].url, new URL(tabs[0].url).hostname, !isSelected);
          } else {
            loader.style.display = "none";
            summary.innerText = "⚠️ Could not access page content. Make sure you're on a compatible webpage.";
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
        save
      }),
      credentials: 'include'
    })
    .then((response) => response.json())
    .then((data) => {
      loader.style.display = "none";
      summary.innerText = data.response;
    })
    .catch((error) => {
      console.error("Error:", error);
      loader.style.display = "none";
      summary.innerText = "⚠️ Error generating summary. Please try again.";
    });
  }
});