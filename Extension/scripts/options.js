document.addEventListener("DOMContentLoaded", () => {
  // Check if URL has #payment hash and switch to payment section
  if (window.location.hash === "#payment") {
    const paymentLink = document.getElementById("payment");
    const paymentContent = document.getElementById("payment-content");
    setActiveSection(paymentLink, paymentContent);
    fetchPlans();
    fetchPaymentHistory();
  }

  const pastSummariesLink = document.getElementById("past-summaries");
  const fileSummariesLink = document.getElementById("file-summaries");
  const tagsLink = document.getElementById("tags");
  const profileLink = document.getElementById("profile");
  const paymentLink = document.getElementById("payment");
  const adminPanelLink = document.getElementById("admin-panel");

  const pastSummariesContent = document.getElementById(
    "past-summaries-content"
  );
  const fileSummariesContent = document.getElementById(
    "file-summaries-content"
  );
  const tagsContent = document.getElementById("tags-content");
  const profileContent = document.getElementById("profile-content");
  const paymentContent = document.getElementById("payment-content");
  const adminContent = document.getElementById("admin-content");

  const searchBar = document.getElementById("search-bar");
  const userSearch = document.getElementById("user-search");
  const subscriptionFilter = document.getElementById("subscription-filter");
  const roleFilter = document.getElementById("role-filter");

  const pastSummariesList = document.getElementById("past-summaries-list");
  const tagsList = document.getElementById("tags-list");
  const userInfo = document.getElementById("user-info");
  const plansContainer = document.getElementById("plans-container");
  const paymentHistory = document.getElementById("payment-history");

  const fileUpload = document.getElementById("file-upload");
  const uploadButton = document.getElementById("upload-button");
  const fileSummaryLoader = document.getElementById("file-summary-loader");
  const fileSummaryContent = document.getElementById("file-summary-content");
  const downloadContainer = document.querySelector(".download-container");
  const downloadButton = document.getElementById("download-file-summary");
  const fileSummaryType = document.getElementById("fileSummaryType");

  setActiveSection(profileLink, profileContent);
  fetchProfile();

  let currentSummaryContent = null;
  let currentSummaryType = "short";

  let currentUserRole = null;

  checkAuth();

  function checkAuth() {
    fetch("http://localhost:3000/auth/status", {
      method: "GET",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.isAuthenticated) {
          window.close();
          chrome.runtime.sendMessage({ action: "openPopup" });
        } else {
          currentUserRole = data.user.role;
          if (currentUserRole === "super_admin") {
            adminPanelLink.classList.remove("hidden");
            adminPanelLink.classList.add("visible");
            fetchUsers();
          }
          fetchPastSummaries();
        }
      })
      .catch((error) => {
        console.error("Auth check error:", error);
        showError("Could not connect to server. Please try again later.");
      });
  }

  // Add modal HTML to the document
  const modalHTML = `
    <div id="userModal" class="modal hidden">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <div id="userModalContent"></div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const userModal = document.getElementById("userModal");
  const closeModal = document.querySelector(".close-modal");

  closeModal.addEventListener("click", () => {
    userModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === userModal) {
      userModal.classList.add("hidden");
    }
  });

  fileSummariesLink.addEventListener("click", () => {
    checkSubscriptionForFileSummaries();
  });

  fileSummaryType.addEventListener("change", () => {
    currentSummaryType = fileSummaryType.checked ? "long" : "short";
  });

  uploadButton.addEventListener("click", handleFileUpload);
  downloadButton.addEventListener("click", handleDownload);

  pastSummariesLink.addEventListener("click", () => {
    setActiveSection(pastSummariesLink, pastSummariesContent);
    fetchPastSummaries();
  });

  tagsLink.addEventListener("click", () => {
    setActiveSection(tagsLink, tagsContent);
    fetchTags();
  });

  profileLink.addEventListener("click", () => {
    setActiveSection(profileLink, profileContent);
    fetchProfile();
  });

  paymentLink.addEventListener("click", () => {
    setActiveSection(paymentLink, paymentContent);
    fetchPlans();
    fetchPaymentHistory();
  });

  adminPanelLink?.addEventListener("click", () => {
    setActiveSection(adminPanelLink, adminContent);
    fetchUsers();
  });

  userSearch?.addEventListener(
    "input",
    debounce(() => {
      fetchUsers();
    }, 300)
  );

  subscriptionFilter?.addEventListener("change", () => {
    fetchUsers();
  });

  roleFilter?.addEventListener("change", () => {
    fetchUsers();
  });

  searchBar.addEventListener("input", (e) => {
    fetchPastSummaries(e.target.value);
  });

  function setActiveSection(link, content) {
    // Remove active class from all links
    document.querySelectorAll(".sidebar a").forEach((el) => {
      el.classList.remove("active");
    });

    // Add active class to clicked link
    link.classList.add("active");

    // Hide all content sections
    document.querySelectorAll(".content-section").forEach((el) => {
      el.classList.remove("active");
      el.classList.add("hidden");
    });

    // Show selected content section
    content.classList.remove("hidden");
    content.classList.add("active");
  }

  async function checkSubscriptionForFileSummaries() {
    try {
      const response = await fetch("http://localhost:3000/profile", {
        credentials: "include",
      });
      const profile = await response.json();

      // Allow super_admin to access file summaries regardless of subscription
      if (profile.subscription === "free" && profile.role !== "super_admin") {
        setActiveSection(paymentLink, paymentContent);
        fetchPlans();
        fetchPaymentHistory();
        alert("Please upgrade to Basic or Premium plan to use file summaries.");
      } else {
        setActiveSection(fileSummariesLink, fileSummariesContent);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      showError("Failed to check subscription status");
    }
  }

  async function handleFileUpload() {
    const file = fileUpload.files[0];
    if (!file) {
      alert("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", currentSummaryType);

    fileSummaryLoader.style.display = "block";
    fileSummaryContent.textContent = "";
    downloadContainer.classList.add("hidden");

    try {
      const response = await fetch(
        "http://localhost:3000/summaries/file-summary",
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        currentSummaryContent = data.response;
        fileSummaryContent.textContent = data.response;
        downloadContainer.classList.remove("hidden");
      } else if (data.redirectTo === "payment") {
        setActiveSection(paymentLink, paymentContent);
        fetchPlans();
        alert("Please upgrade to Premium plan to use this feature.");
      } else {
        throw new Error(data.error || "Failed to generate summary");
      }
    } catch (error) {
      console.error("File upload error:", error);
      fileSummaryContent.textContent =
        "Error generating summary. Please try again.";
    } finally {
      fileSummaryLoader.style.display = "none";
    }
  }

  async function handleDownload() {
    if (!currentSummaryContent) {
      alert("No summary to download");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3000/summaries/download-file-summary",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: currentSummaryContent,
            type: currentSummaryType,
          }),
          credentials: "include",
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentSummaryType}-file-summary.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        if (data.redirectTo === "payment") {
          setActiveSection(paymentLink, paymentContent);
          fetchPlans();
          alert("Please upgrade to Premium plan to download summaries.");
        } else {
          throw new Error(data.error || "Failed to download summary");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download summary. Please try again.");
    }
  }

  async function fetchPaymentHistory() {
    try {
      const response = await fetch("http://localhost:3000/payment/history", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payment history");
      }

      const data = await response.json();
      console.log("Fetched payment history:", data);

      if (!data.paymentHistory || data.paymentHistory.length === 0) {
        paymentHistory.innerHTML = `
          <div class="empty-state">
            <p>No payment history found.</p>
          </div>
        `;
        return;
      }

      paymentHistory.innerHTML = data.paymentHistory
        .map((payment) => {
          const date = new Date(payment.date);
          const formattedDate = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          return `
          <div class="payment-item">
            <div class="payment-date">${formattedDate}</div>
            <div class="payment-amount">$${payment.amount.toFixed(2)}</div>
            <div class="payment-description">${payment.description}</div>
            <div class="payment-status">Status: ${payment.status}</div>
          </div>
        `;
        })
        .join("");
    } catch (error) {
      console.error("Failed to fetch payment history:", error);
      paymentHistory.innerHTML = `
        <div class="empty-state">
          <p>Error loading payment history. Please try again.</p>
        </div>
      `;
    }
  }

  async function showUserDetails(user) {
    const modalContent = document.getElementById("userModalContent");

    const loginHistory =
      user.loginHistory
        ?.map(
          (log) => `
      <div class="history-item">
        <span>${new Date(log.timestamp).toLocaleString()}</span>
        <span>${log.action}</span>
        <span>${log.ipAddress}</span>
      </div>
    `
        )
        .join("") || "No login history";

    const paymentHistory =
      user.paymentHistory
        ?.map(
          (payment) => `
      <div class="history-item">
        <span>${new Date(payment.date).toLocaleString()}</span>
        <span>$${payment.amount}</span>
        <span>${payment.description}</span>
        <span class="payment-status status-${payment.status}">${
            payment.status
          }</span>
      </div>
    `
        )
        .join("") || "No payment history";

    modalContent.innerHTML = `
      <div class="user-detail-section">
        <h5>User Information</h5>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role}</p>
        <p><strong>Subscription:</strong> ${user.subscription}</p>
        <p><strong>Created:</strong> ${new Date(
          user.createdAt
        ).toLocaleString()}</p>
        <p><strong>Last Login:</strong> ${
          user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"
        }</p>
      </div>
      
      <div class="user-detail-section">
        <h5>Login History</h5>
        <div class="login-history">
          ${loginHistory}
        </div>
      </div>
      
      <div class="user-detail-section">
        <h5>Payment History</h5>
        <div class="payment-history">
          ${paymentHistory}
        </div>
      </div>
    `;

    userModal.classList.remove("hidden");
  }

  async function fetchUsers() {
    try {
      const searchQuery = userSearch?.value || "";
      const subscription = subscriptionFilter?.value || "";
      const role = roleFilter?.value || "";

      const response = await fetch("http://localhost:3000/admin/users", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { users, stats } = await response.json();

      // Update stats
      document.getElementById("total-users").textContent = stats.total;
      document.getElementById("free-users").textContent = stats.free;
      document.getElementById("basic-users").textContent = stats.basic;
      document.getElementById("premium-users").textContent = stats.premium;

      // Filter users based on search and filters
      let filteredUsers = users;
      if (searchQuery) {
        filteredUsers = filteredUsers.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      if (subscription) {
        filteredUsers = filteredUsers.filter(
          (user) => user.subscription === subscription
        );
      }
      if (role) {
        filteredUsers = filteredUsers.filter((user) => user.role === role);
      }

      const usersTable = document.getElementById("users-table");
      if (!usersTable) return;

      usersTable.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Subscription</th>
              <th>Last Login</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredUsers
              .map(
                (user) => `
              <tr class="user-row" data-user-id="${user._id}">
                <td>${user.name || "N/A"}</td>
                <td>${user.email || "N/A"}</td>
                <td>${user.role || "N/A"}</td>
                <td>${user.subscription || "N/A"}</td>
                <td>${
                  user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString()
                    : "Never"
                }</td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                  ${
                    currentUserRole === "super_admin" &&
                    user.role !== "super_admin"
                      ? `<button onclick="deleteUser('${user._id}')" class="action-button delete">Delete</button>`
                      : ""
                  }
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      // Add click event listeners to user rows
      document.querySelectorAll(".user-row").forEach((row) => {
        row.addEventListener("click", (e) => {
          // Don't trigger if clicking on action buttons
          if (!e.target.classList.contains("action-button")) {
            const userId = row.dataset.userId;
            const user = users.find((u) => u._id === userId);
            if (user) {
              showUserDetails(user);
            }
          }
        });
      });

      // Add click event listeners to delete buttons
      document.querySelectorAll(".action-button.delete").forEach((button) => {
        button.addEventListener("click", async (e) => {
          e.stopPropagation(); // Prevent row click
          const userId = e.target.closest(".user-row").dataset.userId;
          if (confirm("Are you sure you want to delete this user?")) {
            try {
              const response = await fetch(
                `http://localhost:3000/admin/users/${userId}`,
                {
                  method: "DELETE",
                  credentials: "include",
                }
              );

              if (!response.ok) {
                throw new Error("Failed to delete user");
              }

              // Remove the row from the table
              e.target.closest(".user-row").remove();

              // Refresh the users list to update stats
              fetchUsers();
            } catch (error) {
              console.error("Error deleting user:", error);
              alert("Failed to delete user. Please try again.");
            }
          }
        });
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      const usersTable = document.getElementById("users-table");
      if (usersTable) {
        usersTable.innerHTML = `
          <div class="empty-state">
            <p>Error loading users. Please try again. (${error.message})</p>
          </div>
        `;
      }
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async function fetchPastSummaries(query = "") {
    try {
      const endpoint = query
        ? `http://localhost:3000/summaries/search?query=${encodeURIComponent(
            query
          )}`
        : "http://localhost:3000/summaries/summaries";

      const response = await fetch(endpoint, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summaries");
      }

      const summaries = await response.json();

      if (summaries.length === 0) {
        pastSummariesList.innerHTML = `
          <div class="empty-state">
            <p>No summaries found.</p>
            <button id="generate-new">Generate a new summary</button>
          </div>
        `;

        document
          .getElementById("generate-new")
          ?.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "openPopup" });
          });

        return;
      }

      pastSummariesList.innerHTML = summaries
        .map((summary) => {
          let domain = "Unknown Domain";
          try {
            // Validate the URL before constructing it
            if (summary.url && isValidUrl(summary.url)) {
              domain = new URL(summary.url).hostname;
            }
          } catch (error) {
            console.error("Invalid URL:", summary.url, error);
          }

          return `
            <div class="summary-card">
              <div class="summary-title">${
                summary.tags[0]?.name || "Untitled"
              }</div>
              <div class="summary-domain">${summary.domain || domain}</div>
              <div class="summary-text">${
                summary.shortSummary || summary.longSummary
              }</div>
              <div class="summary-tags">
                ${summary.tags
                  .map(
                    (tag) =>
                      `<span class="tag" data-tag="${tag.name}">${tag.name}</span>`
                  )
                  .join("")}
              </div>
              <div class="summary-actions">
                <a href="${
                  summary.url
                }" target="_blank" class="action-button view-button">View Article</a>
                <button class="action-button download-button" data-url="${
                  summary.url
                }" data-type="short">Download Short</button>
                <button class="action-button download-button" data-url="${
                  summary.url
                }" data-type="long">Download Long</button>
              </div>
            </div>
          `;
        })
        .join("");

      document.querySelectorAll(".tag").forEach((tag) => {
        tag.addEventListener("click", () => {
          searchBar.value = tag.dataset.tag;
          fetchPastSummaries(tag.dataset.tag);
        });
      });

      document.querySelectorAll(".download-button").forEach((button) => {
        button.addEventListener("click", () => {
          downloadSummary(button.dataset.url, button.dataset.type);
        });
      });
    } catch (error) {
      console.error("Failed to fetch summaries:", error);
      pastSummariesList.innerHTML = `
        <div class="empty-state">
          <p>Error loading summaries. Please try again.</p>
        </div>
      `;
    }
  }

  // Helper function to validate URLs
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  async function fetchTags() {
    try {
      const response = await fetch("http://localhost:3000/summaries/tags", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const tags = await response.json();

      if (tags.length === 0) {
        tagsList.innerHTML = `
          <div class="empty-state">
            <p>No tags found. Tags are generated when you create summaries.</p>
          </div>
        `;
        return;
      }

      tagsList.innerHTML = tags
        .map(
          (tag) => `
        <div class="tag-item" data-tag="${tag.name}">
          <div class="tag-name">${tag.name}</div>
          <div class="tag-count">${tag.count} ${
            tag.count === 1 ? "summary" : "summaries"
          }</div>
        </div>
      `
        )
        .join("");

      document.querySelectorAll(".tag-item").forEach((tagItem) => {
        tagItem.addEventListener("click", () => {
          setActiveSection(pastSummariesLink, pastSummariesContent);
          searchBar.value = tagItem.dataset.tag;
          fetchPastSummaries(tagItem.dataset.tag);
        });
      });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      tagsList.innerHTML = `
        <div class="empty-state">
          <p>Error loading tags. Please try again.</p>
        </div>
      `;
    }
  }

  async function fetchProfile() {
    try {
      const response = await fetch("http://localhost:3000/profile", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const profile = await response.json();

      const joinDate = new Date(profile.createdAt);
      const formattedDate = joinDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const subscriptionText =
        profile.subscription === "free"
          ? "Free Plan"
          : profile.subscription === "basic"
          ? "Basic Plan"
          : "Premium Plan";

      userInfo.innerHTML = `
        <img src="${
          profile.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            profile.name
          )}&background=random`
        }" alt="${profile.name}" class="user-avatar">
        <div class="user-name">${profile.name}</div>
        <div class="user-email">${profile.email}</div>
        <div class="user-subscription">Current Plan: ${subscriptionText}</div>
        <div class="user-joined">Member since: ${formattedDate}</div>
      `;
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      userInfo.innerHTML = `
        <div class="empty-state">
          <p>Error loading profile. Please try again.</p>
        </div>
      `;
    }
  }

  async function fetchPlans() {
    try {
      const [plansResponse, profileResponse] = await Promise.all([
        fetch("http://localhost:3000/payment/plans", {
          credentials: "include",
        }),
        fetch("http://localhost:3000/profile", { credentials: "include" }),
      ]);

      if (!plansResponse.ok || !profileResponse.ok) {
        throw new Error("Failed to fetch plans or profile");
      }

      const plans = await plansResponse.json();
      const profile = await profileResponse.json();

      // Hide payment content if user is super_admin
      if (profile.role === "super_admin") {
        paymentContent.innerHTML = `
          <div class="empty-state">
            <p>As a Super Admin, you automatically have access to all premium features.</p>
          </div>
        `;
        return;
      }

      // Filter out basic plan if user has premium subscription
      const availablePlans =
        profile.subscription === "premium"
          ? plans.filter((plan) => plan.id === "premium")
          : plans;

      plansContainer.innerHTML = availablePlans
        .map(
          (plan) => `
          <div class="plan-card ${
            profile.subscription === plan.id ? "current-plan" : ""
          }">
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">$${plan.price}/month</div>
            <ul class="plan-features">
              ${plan.features.map((feature) => `<li>${feature}</li>`).join("")}
            </ul>
            ${
              profile.subscription !== plan.id
                ? `<button class="subscribe-button" data-plan="${plan.id}">Subscribe</button>`
                : ""
            }
          </div>
        `
        )
        .join("");

      document.querySelectorAll(".subscribe-button").forEach((button) => {
        button.addEventListener("click", () => {
          createCheckoutSession(button.dataset.plan);
        });
      });
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      plansContainer.innerHTML = `
        <div class="empty-state">
          <p>Error loading subscription plans. Please try again.</p>
        </div>
      `;
    }
  }

  async function createCheckoutSession(planId) {
    try {
      const response = await fetch(
        "http://localhost:3000/payment/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planId }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

      // Open the checkout URL in a new window
      const checkoutWindow = window.open(data.url, "stripeCheckout");

      // Listen for messages from the payment completion page
      window.addEventListener("message", async function (event) {
        if (event.data.type === "payment_success") {
          checkoutWindow.close();

          // Handle successful payment
          try {
            await fetch("http://localhost:3000/payment/payment-success", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({ session_id: event.data.sessionId }),
            });

            // Refresh the plans and payment history
            fetchPlans();
            fetchPaymentHistory();
            alert("Payment successful! Your subscription has been updated.");
          } catch (error) {
            console.error("Error processing payment success:", error);
            alert(
              "There was an error processing your payment. Please try again."
            );
          }
        } else if (event.data.type === "payment_cancel") {
          checkoutWindow.close();
          alert(
            "Payment cancelled. Please try again if you wish to subscribe."
          );
        }
      });
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to process payment. Please try again.");
    }
  }

  async function downloadSummary(url, type) {
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

      const content = await response.text();
      const blob = new Blob([content], { type: "text/plain" });
      const downloadUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${type}-summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download summary. Please try again.");
    }
  }

  function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // Remove the automatic file input click
  paymentLink.addEventListener("click", () => {
    setActiveSection(paymentLink, paymentContent);
    fetchPlans();
    fetchPaymentHistory();
  });

  document.addEventListener("DOMContentLoaded", function () {
    fetchPaymentHistory();
  });
});
