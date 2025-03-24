// Analytics related functions
let charts = {};
const IP_ADD = process.env.IP_ADD;

function destroyCharts() {
  Object.values(charts).forEach((chart) => {
    if (chart) {
      chart.destroy();
    }
  });
  charts = {};
}

export async function loadUserAnalytics() {
  try {

    const profileResponse = await fetch(`http://${IP_ADD}:3000/profile`, {
      credentials: "include",
    });
    const profile = await profileResponse.json();

    // If super_admin, hide analytics section and return
    if (profile.role === "super_admin") {
      const analyticsSection = document.querySelector(".user-analytics");
      if (analyticsSection) {
        analyticsSection.style.display = "none";
      }
      return;
    }


    // Destroy existing charts first
    destroyCharts();

    // Fetch user analytics
    const response = await fetch(
      `http://${IP_ADD}:3000/summarize/user-analytics`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch analytics");
    }

    const data = await response.json();

    // Update stats
    document.getElementById("user-total-summaries").textContent =
      data.totalSummaries;
    document.getElementById("user-today-summaries").textContent =
      data.todaySummaries;
    document.getElementById("user-favorite-ai").textContent =
      data.favoriteAi || "None";

    // Create charts
    createDailySummariesChart(data.dailySummaries);
    createSummaryTypesChart(data.summaryTypes);
    createTopDomainsChart(data.domains);
    createAiProvidersChart(data.aiProviders);
  } catch (error) {
    console.error("Error loading analytics:", error);
    // Clear any existing charts on error
    destroyCharts();

    // Show error message in chart containers
    const chartContainers = document.querySelectorAll(".chart-container");
    chartContainers.forEach((container) => {
      container.innerHTML = `
        <div class="chart-error">
          <p>Error loading chart data. Please try again.</p>
        </div>
      `;
    });
  }
}

function createDailySummariesChart(dailyData) {
  const canvas = document.getElementById("userDailySummariesChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (charts.dailySummaries) {
    charts.dailySummaries.destroy();
  }

  const dates = Object.keys(dailyData).sort();
  const counts = dates.map((date) => dailyData[date]);

  charts.dailySummaries = new Chart(ctx, {
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
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Daily Summary Activity",
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

function createSummaryTypesChart(typesData) {
  const canvas = document.getElementById("userSummaryTypesChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (charts.summaryTypes) {
    charts.summaryTypes.destroy();
  }

  charts.summaryTypes = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Short", "Long"],
      datasets: [
        {
          data: [typesData.short || 0, typesData.long || 0],
          backgroundColor: ["#007bff", "#28a745"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Summary Types Distribution",
        },
      },
    },
  });
}

function createTopDomainsChart(domainsData) {
  const canvas = document.getElementById("userTopDomainsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (charts.topDomains) {
    charts.topDomains.destroy();
  }

  const domains = Object.entries(domainsData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  charts.topDomains = new Chart(ctx, {
    type: "bar",
    data: {
      labels: domains.map((d) => d[0]),
      datasets: [
        {
          label: "Summaries per Domain",
          data: domains.map((d) => d[1]),
          backgroundColor: "#007bff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "Top Domains",
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

function createAiProvidersChart(providersData) {
  const canvas = document.getElementById("userAiProvidersChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (charts.aiProviders) {
    charts.aiProviders.destroy();
  }

  const providers = Object.entries(providersData).sort((a, b) => b[1] - a[1]);

  charts.aiProviders = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: providers.map((p) => p[0]),
      datasets: [
        {
          data: providers.map((p) => p[1]),
          backgroundColor: [
            "#007bff",
            "#28a745",
            "#dc3545",
            "#ffc107",
            "#17a2b8",
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "AI Providers Usage",
        },
      },
    },
  });
}
