// Tags related functions
export async function fetchTags() {
  const tagsList = document.getElementById("tags-list");

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
    tagItem.addEventListener("click", () => {
      const pastSummariesLink = document.getElementById("past-summaries");
      const pastSummariesContent = document.getElementById(
        "past-summaries-content"
      );
      const searchBar = document.getElementById("search-bar");
      const sectionLinks = document.querySelectorAll(".sidebar a");
      const contentSections = document.querySelectorAll(".content-section");

      // Import and use setActiveSection from ui.js
      import("./ui.js").then(({ setActiveSection }) => {
        setActiveSection(
          pastSummariesLink,
          pastSummariesContent,
          sectionLinks,
          contentSections
        );
        searchBar.value = tagItem.dataset.tag;
        import("./summaries.js").then(({ fetchPastSummaries }) => {
          fetchPastSummaries(tagItem.dataset.tag);
        });
      });
    });
  });
}
