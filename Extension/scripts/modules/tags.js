// Tags related functions
export async function fetchTags() {
  const tagsList = document.getElementById("tags-list");

  try {
    const response = await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/summarize/tags", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tags");
    }

    const tags = await response.json();

    if (!tags || tags.length === 0) {
      tagsList.innerHTML = `
        <div class="empty-state">
          <p>No tags found. Tags are automatically generated when you create summaries.</p>
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

    addTagEventListeners();
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    tagsList.innerHTML = `
      <div class="empty-state">
        <p>Error loading tags. Please try again.</p>
      </div>
    `;
  }
}

function addTagEventListeners() {
  document.querySelectorAll(".tag-item").forEach((tagItem) => {
    tagItem.addEventListener("click", async () => {
      const tagName = tagItem.dataset.tag;

      try {
        // Switch to past summaries view
        const pastSummariesLink = document.getElementById("past-summaries");
        const pastSummariesContent = document.getElementById(
          "past-summaries-content"
        );
        const searchBar = document.getElementById("search-bar");
        const sectionLinks = document.querySelectorAll(".sidebar a");
        const contentSections = document.querySelectorAll(".content-section");

        // Import UI module dynamically
        const { setActiveSection } = await import("./ui.js");
        setActiveSection(
          pastSummariesLink,
          pastSummariesContent,
          sectionLinks,
          contentSections
        );

        // Update search bar and filter summaries
        searchBar.value = tagName;
        const { fetchPastSummaries } = await import("./summaries.js");
        await fetchPastSummaries(tagName);

        // Scroll to the top of the past summaries section
        pastSummariesContent.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error("Error fetching summaries by tag:", error);
        showError("Failed to fetch summaries for this tag");
      }
    });
  });
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}
