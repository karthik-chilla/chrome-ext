// Summaries related functions
export async function fetchPastSummaries(query = "") {
  const pastSummariesList = document.getElementById("past-summaries-list");

  try {
    const endpoint = query
      ? `http://localhost:3000/summaries/search?query=${encodeURIComponent(
          query
        )}`
      : `http://localhost:3000/summaries/summaries`;

    const response = await fetch(endpoint, {
      credentials: "include",
    });
    const summaries = await response.json();

    if (summaries.length === 0) {
      pastSummariesList.innerHTML = `
          <div class="empty-state">
            <p>No summaries found.</p>
            <button id="generate-new">Generate a new summary</button>
          </div>
        `;

      document.getElementById("generate-new")?.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openPopup" });
      });
      return;
    }

    renderSummaries(summaries);
  } catch (error) {
    console.error("Failed to fetch summaries:", error);
    pastSummariesList.innerHTML = `
        <div class="empty-state">
          <p>Error loading summaries. Please try again.</p>
        </div>
      `;
  }
}

function renderSummaries(summaries) {
  const pastSummariesList = document.getElementById("past-summaries-list");

  pastSummariesList.innerHTML = summaries
    .map((summary) => {
      let domain = "Unknown Domain";
      try {
        if (summary.url && isValidUrl(summary.url)) {
          domain = new URL(summary.url).hostname;
        }
      } catch (error) {
        console.error("Invalid URL:", summary.url, error);
      }

      return `
          <div class="summary-card" data-url="${summary.url}">
            <div class="summary-header">
              <div class="summary-title">${summary.title || "Untitled"}</div>
              <div class="summary-domain">${summary.domain || domain}</div>
            </div>
            
            <div class="ai-provider-info">
              ${
                summary.aiProvider_short
                  ? `Short summary by ${summary.aiProvider_short}`
                  : ""
              }
              ${
                summary.aiProvider_long
                  ? `${summary.aiProvider_short ? "<br>" : ""}Long summary by ${
                      summary.aiProvider_long
                    }`
                  : ""
              }
            </div>
  
            <div class="summary-actions">
              ${
                summary.shortSummary
                  ? `<button class="action-button view-button" data-type="short" data-summary="${encodeURIComponent(
                      summary.shortSummary
                    )}">
                        <i class="bi bi-eye"></i> View Short
                       </button>`
                  : ""
              }
              ${
                summary.longSummary
                  ? `<button class="action-button view-button" data-type="long" data-summary="${encodeURIComponent(
                      summary.longSummary
                    )}">
                        <i class="bi bi-eye"></i> View Long
                       </button>`
                  : ""
              }
            </div>
  
            <div class="summary-content" id="summary-content-${
              summary._id
            }"></div>
  
            <div class="summary-actions" id="download-actions-${
              summary._id
            }" style="display: none;">
              ${
                summary.shortSummary
                  ? `<button class="action-button download-button" data-type="short" data-url="${encodeURIComponent(
                      summary.url
                    )}">
                        <i class="bi bi-download"></i> Download Short
                       </button>`
                  : ""
              }
              ${
                summary.longSummary
                  ? `<button class="action-button download-button" data-type="long" data-url="${encodeURIComponent(
                      summary.url
                    )}">
                        <i class="bi bi-download"></i> Download Long
                       </button>`
                  : ""
              }
            </div>
  
            <div class="summary-tags">
              ${summary.tags
                .map(
                  (tag) =>
                    `<span class="tag" data-tag="${tag.name}">${tag.name}</span>`
                )
                .join("")}
            </div>
          </div>
        `;
    })
    .join("");

  addSummaryEventListeners();
}

function addSummaryEventListeners() {
  // View button listeners
  document.querySelectorAll(".view-button").forEach((button) => {
    button.addEventListener("click", handleViewClick);
  });

  // Download button listeners
  document.querySelectorAll(".download-button").forEach((button) => {
    button.addEventListener("click", handleDownloadClick);
  });

  // Tag listeners
  document.querySelectorAll(".tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      const searchBar = document.getElementById("search-bar");
      searchBar.value = tag.dataset.tag;
      fetchPastSummaries(tag.dataset.tag);
    });
  });
}

function handleViewClick(e) {
  const card = e.target.closest(".summary-card");
  const summaryContent = card.querySelector(".summary-content");
  const downloadActions = card.querySelector(`[id^="download-actions-"]`);
  const type = e.target.dataset.type;
  const summary = decodeURIComponent(e.target.dataset.summary);

  // Close any other open summaries
  document.querySelectorAll(".summary-content").forEach((content) => {
    if (content !== summaryContent) {
      content.style.display = "none";
      content.textContent = "";
    }
  });
  document.querySelectorAll(`[id^="download-actions-"]`).forEach((actions) => {
    if (actions !== downloadActions) {
      actions.style.display = "none";
    }
  });

  // Toggle current summary
  if (summaryContent.style.display === "block") {
    summaryContent.style.display = "none";
    summaryContent.textContent = "";
    downloadActions.style.display = "none";
    e.target.innerHTML = `<i class="bi bi-eye"></i> View ${
      type.charAt(0).toUpperCase() + type.slice(1)
    }`;
  } else {
    summaryContent.style.display = "block";
    summaryContent.textContent = summary;
    downloadActions.style.display = "flex";
    e.target.innerHTML = `<i class="bi bi-eye-slash"></i> Hide ${
      type.charAt(0).toUpperCase() + type.slice(1)
    }`;
  }
}

async function handleDownloadClick(e) {
  const type = e.target.dataset.type;
  const url = decodeURIComponent(e.target.dataset.url);

  try {
    const response = await fetch(
      `http://localhost:3000/summaries/download?url=${encodeURIComponent(
        url
      )}&type=${type}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download summary");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${type}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Download error:", error);
    alert("Failed to download summary. Please try again.");
  }
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}
