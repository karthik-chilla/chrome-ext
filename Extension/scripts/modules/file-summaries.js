// File summaries related functions
export async function initializeFileSummaries() {
  const fileUpload = document.getElementById("file-upload");
  const uploadButton = document.getElementById("upload-button");
  const summaryTypeToggle = document.getElementById("fileSummaryType");
  const fileSummaryLoader = document.getElementById("file-summary-loader");
  const fileSummaryContent = document.getElementById("file-summary-content");
  const downloadContainer = document.querySelector(".download-container");
  const downloadButton = document.getElementById("download-file-summary");

  let currentSummary = null;

  uploadButton?.addEventListener("click", async () => {
    if (!fileUpload?.files?.length) {
      showError("Please select a file first");
      return;
    }

    const file = fileUpload.files[0];
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      showError("File size must be less than 10MB");
      return;
    }

    const type = summaryTypeToggle?.checked ? "long" : "short";

    // Show loader
    if (fileSummaryLoader) fileSummaryLoader.style.display = "block";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");

    try {
      // Read file content
      const text = await readFileContent(file);

      const response = await fetch("http://localhost:3000/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          text,
          type,
          url: `file-summary-${Date.now()}`,
          domain: "File Summary",
          title: file.name,
          aiProvider: "gemini", // Always use Gemini for file summaries
          save: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        currentSummary = data.response;
        if (fileSummaryContent) {
          // Create a summary container with file info and content
          fileSummaryContent.innerHTML = `
            <div class="summary-container">
              <div class="file-info">
                <div class="file-name">
                  <strong>File:</strong> ${file.name}
                </div>
                <div class="summary-type">
                  <strong>Summary Type:</strong> ${
                    type === "short" ? "Short" : "Long"
                  }
                </div>
              </div>
              <div class="summary-text">
                <strong>Summary:</strong>
                <p>${data.response}</p>
              </div>
            </div>
          `;
          downloadContainer?.classList.remove("hidden");
        }
      } else if (data.redirectTo === "payment") {
        if (fileSummaryContent) {
          fileSummaryContent.innerHTML = `
            <div class="premium-message">
              <p>⭐ File summaries are available for premium users only</p>
              <button onclick="window.location.hash='#payment'" class="upgrade-button">
                Upgrade to Premium
              </button>
            </div>
          `;
        }
      } else {
        throw new Error(data.error || "Failed to generate summary");
      }
    } catch (error) {
      console.error("File summary error:", error);
      showError(error.message || "Error processing file");
      if (fileSummaryContent) {
        fileSummaryContent.innerHTML = `
          <div class="error-message">
            <p>Failed to generate summary. Please try again.</p>
          </div>
        `;
      }
    } finally {
      if (fileSummaryLoader) fileSummaryLoader.style.display = "none";
    }
  });

  downloadButton?.addEventListener("click", async () => {
    if (!currentSummary) return;

    try {
      const response = await fetch(
        "http://localhost:3000/summarize/download-file-summary",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            content: currentSummary,
            type: summaryTypeToggle?.checked ? "long" : "short",
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${
          summaryTypeToggle?.checked ? "long" : "short"
        }-file-summary.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        if (data.redirectTo === "payment") {
          window.location.hash = "#payment";
        } else {
          throw new Error(data.error || "Failed to download summary");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      showError(error.message || "Error downloading summary");
    }
  });

  // Clear file input and summary when changing files
  fileUpload?.addEventListener("click", () => {
    fileUpload.value = "";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");
    currentSummary = null;
  });
}

async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}
