// Analytics related functions
export async function loadUserAnalytics() {
  try {
    const response = await fetch(
      "http://localhost:3000/summarize/user-analytics",
      {
        credentials: "include",
      }
    );
    const data = await response.json();

    // Update stats
    document.getElementById("user-total-summaries").textContent =
      data.totalSummaries;
    document.getElementById("user-today-summaries").textContent =
      data.todaySummaries;
    document.getElementById("user-favorite-ai").textContent = data.favoriteAi;

    // Create charts
    createDailySummariesChart(data.dailySummaries);
    createSummaryTypesChart(data.summaryTypes);
    createTopDomainsChart(data.domains);
    createAiProvidersChart(data.aiProviders);
  } catch (error) {
    console.error("Error loading analytics:", error);
  }
}

export function createDailySummariesChart(dailyData) {
  const ctx = document
    .getElementById("userDailySummariesChart")
    .getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(dailyData),
      datasets: [
        {
          label: "Daily Summaries",
          data: Object.values(dailyData),
          borderColor: "#007bff",
          tension: 0.1,
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
      },
    },
  });
}

export function createSummaryTypesChart(typesData) {
  const ctx = document.getElementById("userSummaryTypesChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Short", "Long"],
      datasets: [
        {
          data: [typesData.short, typesData.long],
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

export function createTopDomainsChart(domainsData) {
  const domains = Object.keys(domainsData);
  const counts = Object.values(domainsData);

  const ctx = document.getElementById("userTopDomainsChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: domains,
      datasets: [
        {
          label: "Summaries per Domain",
          data: counts,
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
      },
    },
  });
}

export function createAiProvidersChart(providersData) {
  const providers = Object.keys(providersData);
  const counts = Object.values(providersData);

  const ctx = document.getElementById("userAiProvidersChart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: providers,
      datasets: [
        {
          data: counts,
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
