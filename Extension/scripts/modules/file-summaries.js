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
      showToast("Please select a file first", "error");
      return;
    }

    const file = fileUpload.files[0];

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size must be less than 10MB", "error");
      return;
    }

    const allowedExtensions = [".txt", ".doc", ".docx", ".pdf"];
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      showToast(
        "This file format is not supported. Please upload .txt, .doc, .docx, or .pdf files only.",
        "error"
      );
      fileUpload.value = "";
      return;
    }

    const type = summaryTypeToggle?.checked ? "long" : "short";

    if (fileSummaryLoader) fileSummaryLoader.style.display = "flex";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch(
        "http://localhost:3000/summarize/file-summary",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        currentSummary = data.response;
        if (fileSummaryContent) {
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
              <p>⭐ File summaries are available for Basic and Premium users only</p>
              <button onclick="window.location.hash='#payment';" class="upgrade-button">
                Upgrade Now
              </button>
            </div>
          `;
        }
      } else {
        throw new Error(data.error || "Failed to generate summary");
      }
    } catch (error) {
      console.error("File summary error:", error);
      showToast(error.message || "Error processing file", "error");
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
      const profileResponse = await fetch("http://localhost:3000/profile", {
        credentials: "include",
      });
      const profile = await profileResponse.json();

      if (profile.subscription === "free" && profile.role !== "super_admin") {
        showToast(
          "⭐ Upgrade to Basic or Premium to download summaries",
          "error"
        );
        return;
      }

      const blob = new Blob([currentSummary], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${summaryTypeToggle?.checked ? "long" : "short"}-summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      showToast(error.message || "Error downloading summary", "error");
    }
  });

  fileUpload?.addEventListener("click", () => {
    fileUpload.value = "";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");
    currentSummary = null;
  });
}

function showToast(message, type = "info") {
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icon = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";

  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
