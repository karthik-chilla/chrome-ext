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
    const type = summaryTypeToggle?.checked ? "long" : "short";

    // Show loader
    if (fileSummaryLoader) fileSummaryLoader.style.display = "block";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("http://localhost:3000/summarize/file-summary", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        currentSummary = data.response;
        if (fileSummaryContent) {
          fileSummaryContent.innerHTML = `<div class="summary-text">${data.response}</div>`;
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
      if (fileSummaryContent) {
        fileSummaryContent.innerHTML = `
          <div class="error-message">
            <p>Error processing file: ${error.message}</p>
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
      const response = await fetch("http://localhost:3000/summarize/download-file-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          content: currentSummary,
          type: summaryTypeToggle?.checked ? "long" : "short",
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${summaryTypeToggle?.checked ? "long" : "short"}-file-summary.txt`;
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
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}