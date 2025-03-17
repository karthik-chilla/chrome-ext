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
      showToast("Please select a file first", "error");
      return;
    }

    const file = fileUpload.files[0];
    
    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      showToast("File size must be less than 10MB", "error");
      return;
    }

    // Check file extension
    const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      showToast("This file format is not supported. Please upload .txt, .doc, .docx, or .pdf files only.", "error");
      fileUpload.value = ''; // Clear the file input
      return;
    }

    const type = summaryTypeToggle?.checked ? "long" : "short";

    // Show loader
    if (fileSummaryLoader) fileSummaryLoader.style.display = "flex";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch(
        "http://localhost:3000/summarize/summarize/file-summary",
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
              <p>⭐ File summaries are available for premium users only</p>
              <button onclick="window.location.hash='#payment'; handlePaymentRedirect();" class="upgrade-button">
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
      // First check user's subscription
      const profileResponse = await fetch("http://localhost:3000/profile", {
        credentials: "include",
      });
      const profile = await profileResponse.json();

      if (profile.subscription !== "premium" && profile.role !== "super_admin") {
        // Show premium required message and redirect to payment
        showToast("⭐ Upgrade to Premium to download summaries");
        return;
      }

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
          redirectToPayment();
        } else {
          throw new Error(data.error || "Failed to download summary");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      showToast(error.message || "Error downloading summary", "error");
    }
  });

  // Clear file input and summary when changing files
  fileUpload?.addEventListener("click", () => {
    fileUpload.value = "";
    if (fileSummaryContent) fileSummaryContent.textContent = "";
    if (downloadContainer) downloadContainer.classList.add("hidden");
    currentSummary = null;
  });

  // Handle hash change for payment redirect
  window.addEventListener('hashchange', handlePaymentRedirect);
  
  // Check if we're redirected to payment on load
  if (window.location.hash === '#payment') {
    handlePaymentRedirect();
  }
}

function handlePaymentRedirect() {
  if (window.location.hash === '#payment') {
    const paymentSection = document.getElementById('payment-content');
    const paymentLink = document.getElementById('payment');
    const sections = document.querySelectorAll('.content-section');
    const links = document.querySelectorAll('.sidebar a');
    
    // Hide all sections and remove active class from links
    sections.forEach(section => section.classList.add('hidden'));
    links.forEach(link => link.classList.remove('active'));
    
    // Show payment section and activate payment link
    if (paymentSection) {
      paymentSection.classList.remove('hidden');
      paymentLink?.classList.add('active');
      
      // Import and call fetchPlans
      import('./payment.js').then(module => {
        module.fetchPlans();
        module.fetchPaymentHistory();
      });
      
      // Scroll to top of payment section
      paymentSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Add icon based on type
  const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  toastContainer.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Remove toast after delay
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function redirectToPayment() {
  window.location.hash = '#payment';
  handlePaymentRedirect();
}