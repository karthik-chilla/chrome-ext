document.addEventListener("DOMContentLoaded", async function () {
  // Import modules
  const { checkAuth, showError } = await import("./modules/auth.js");
  const { loadUserAnalytics } = await import("./modules/analytics.js");
  const { fetchProfile } = await import("./modules/profile.js");
  const { fetchPastSummaries } = await import("./modules/summaries.js");
  const { fetchTags } = await import("./modules/tags.js");
  const { fetchPlans, fetchPaymentHistory } = await import(
    "./modules/payment.js"
  );
  const { showUserDetails } = await import("./modules/ui.js");
  const { initializeFileSummaries } = await import(
    "./modules/file-summaries.js"
  );
  const { setActiveSection, debounce } = await import("./modules/ui.js");

  // Get all section links and content sections
  const sectionLinks = document.querySelectorAll(".sidebar a");
  const contentSections = document.querySelectorAll(".content-section");

  // Get DOM elements
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
  const favoriteAiBox = document.getElementById("favorite-ai-box");

  // State variables
  let currentUserRole = null;

  // Check if URL has #payment hash and switch to payment section
  if (window.location.hash === "#payment") {
    setActiveSection(
      paymentLink,
      paymentContent,
      sectionLinks,
      contentSections
    );
    fetchPlans();
    fetchPaymentHistory();
  } else {
    // Default to profile section
    setActiveSection(
      profileLink,
      profileContent,
      sectionLinks,
      contentSections
    );
    fetchProfile();
  }

  // Initialize file summaries
  initializeFileSummaries();

  // Initial auth check
  const authResult = await checkAuth();
  if (authResult) {
    currentUserRole = authResult;
    if (currentUserRole === "super_admin") {
      adminPanelLink.classList.remove("hidden");
      adminPanelLink.classList.add("visible");
      // Hide favorite AI box for admin as it's not relevant
      favoriteAiBox.style.display = "none";
    }
    fetchPastSummaries();
    loadUserAnalytics(); // Load analytics on initial load
  }

  // Event Listeners
  fileSummariesLink.addEventListener("click", async () => {
    try {
      const response = await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/profile", {
        credentials: "include",
      });
      const profile = await response.json();

      if (profile.subscription === "free" && profile.role !== "super_admin") {
        setActiveSection(
          paymentLink,
          paymentContent,
          sectionLinks,
          contentSections
        );
        fetchPlans();
        fetchPaymentHistory();
        alert("Please upgrade to Basic or Premium plan to use file summaries.");
      } else {
        setActiveSection(
          fileSummariesLink,
          fileSummariesContent,
          sectionLinks,
          contentSections
        );
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      showError("Failed to check subscription status");
    }
  });

  pastSummariesLink.addEventListener("click", () => {
    setActiveSection(
      pastSummariesLink,
      pastSummariesContent,
      sectionLinks,
      contentSections
    );
    fetchPastSummaries();
  });

  tagsLink.addEventListener("click", () => {
    setActiveSection(tagsLink, tagsContent, sectionLinks, contentSections);
    fetchTags();
  });

  profileLink.addEventListener("click", () => {
    setActiveSection(
      profileLink,
      profileContent,
      sectionLinks,
      contentSections
    );
    fetchProfile();
    loadUserAnalytics();
  });

  paymentLink.addEventListener("click", () => {
    setActiveSection(
      paymentLink,
      paymentContent,
      sectionLinks,
      contentSections
    );
    fetchPlans();
    fetchPaymentHistory();
  });

  adminPanelLink?.addEventListener("click", () => {
    setActiveSection(
      adminPanelLink,
      adminContent,
      sectionLinks,
      contentSections
    );
    fetchUsers();
    fetchAndDisplayAnalytics();
  });

  // Search functionality
  searchBar.addEventListener("input", (e) => {
    fetchPastSummaries(e.target.value);
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

  // Admin functionality
  async function fetchUsers() {
    try {
      const searchQuery = userSearch?.value || "";
      const subscription = subscriptionFilter?.value || "";

      const response = await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/admin/users", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { users, stats } = await response.json();

      // Update stats
      document.getElementById("total-users").textContent = stats.total || 0;
      document.getElementById("free-users").textContent = stats.free || 0;
      document.getElementById("basic-users").textContent = stats.basic || 0;
      document.getElementById("premium-users").textContent = stats.premium || 0;

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

      renderUsersTable(filteredUsers);
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

  function renderUsersTable(users) {
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
          ${users
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
        e.stopPropagation();
        const userId = e.target.closest(".user-row").dataset.userId;
        if (confirm("Are you sure you want to delete this user?")) {
          try {
            const response = await fetch(
              `http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/admin/users/${userId}`,
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
  }

  async function fetchAndDisplayAnalytics() {
    try {
      const response = await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/admin/analytics", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      renderAdminAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      const analyticsContainer = document.querySelector(".analytics-container");
      if (analyticsContainer) {
        analyticsContainer.innerHTML = `
          <div class="empty-state">
            <p>Error loading analytics. Please try again.</p>
          </div>
        `;
      }
    }
  }

  function renderAdminAnalytics(data) {
    // Update user stats
    document.getElementById("total-users").textContent = data.userStats.total;
    document.getElementById("free-users").textContent = data.userStats.free;
    document.getElementById("basic-users").textContent = data.userStats.basic;
    document.getElementById("premium-users").textContent =
      data.userStats.premium;

    // Create charts using Chart.js
    createUserSubscriptionsChart(data.userStats);
    createSummaryTypesChart(data.summaryStats.types);
    createDailySummariesChart(data.summaryStats.daily);
    createTopDomainsChart(data.summaryStats.domains);
  }

  function createUserSubscriptionsChart(userStats) {
    const ctx = document
      .getElementById("userSubscriptionsChart")
      .getContext("2d");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Free", "Basic", "Premium"],
        datasets: [
          {
            data: [userStats.free, userStats.basic, userStats.premium],
            backgroundColor: ["#ffc107", "#17a2b8", "#28a745"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "User Subscriptions",
          },
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  function createSummaryTypesChart(types) {
    const ctx = document.getElementById("summaryTypesChart").getContext("2d");
    new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Short", "Long"],
        datasets: [
          {
            data: [types.short, types.long],
            backgroundColor: ["#007bff", "#6610f2"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Summary Types Distribution",
          },
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  function createDailySummariesChart(dailyData) {
    const dates = Object.keys(dailyData).sort();
    const counts = dates.map((date) => dailyData[date]);

    const ctx = document.getElementById("dailySummariesChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Daily Summaries",
            data: counts,
            borderColor: "#007bff",
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Daily Summary Generation",
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  function createTopDomainsChart(domainsData) {
    const domains = Object.entries(domainsData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const ctx = document.getElementById("topDomainsChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: domains.map((d) => d[0]),
        datasets: [
          {
            label: "Summaries Generated",
            data: domains.map((d) => d[1]),
            backgroundColor: "#20c997",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Top 10 Domains",
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  // Initialize analytics if profile section is active
  if (profileContent.classList.contains("active")) {
    loadUserAnalytics();
  }
});
