// // Summaries related functions
// export async function fetchPastSummaries(query = "") {
//   const pastSummariesList = document.getElementById("past-summaries-list");

//   try {
//     const endpoint = query
//       ? `http://localhost:3000/summarize/search?query=${encodeURIComponent(
//           query
//         )}`
//       : `http://localhost:3000/summaries/summaries`;

//     const response = await fetch(endpoint, {
//       credentials: "include",
//     });

//     if (!response.ok) {
//       throw new Error("Failed to fetch summaries");
//     }

//     const summaries = await response.json();

//     if (summaries.length === 0) {
//       pastSummariesList.innerHTML = `
//         <div class="empty-state">
//           <h3>No summaries found. Start by generating a summary from any webpage!</h3>
//         </div>
//       `;

//       return;
//     }

//     renderSummaries(summaries);
//   } catch (error) {
//     console.error("Failed to fetch summaries:", error);
//     pastSummariesList.innerHTML = `
//       <div class="empty-state">
//         <p>Error loading summaries. Please try again.</p>
//       </div>
//     `;
//   }
// }

// function renderSummaries(summaries) {
//   const pastSummariesList = document.getElementById("past-summaries-list");

//   pastSummariesList.innerHTML = summaries
//     .map((summary) => {
//       const domain = getDomain(summary.url);

//       return `
//         <div class="summary-card" data-summary-id="${summary._id}">
//           <div class="summary-header">
//             <div class="summary-title">${
//               summary.tags[0]?.name || "Untitled"
//             }</div>
//             <div class="summary-domain">${summary.domain || domain}</div>
//           </div>

//           <div class="ai-provider-info">
//             ${
//               summary.aiProvider_short
//                 ? `<div>✨ Short summary by ${summary.aiProvider_short}</div>`
//                 : ""
//             }
//             ${
//               summary.aiProvider_long
//                 ? `<div>📝 Long summary by ${summary.aiProvider_long}</div>`
//                 : ""
//             }
//           </div>

//           <div class="summary-actions">
//             ${
//               summary.shortSummary
//                 ? createViewButton("short", summary.shortSummary)
//                 : ""
//             }
//             ${
//               summary.longSummary
//                 ? createViewButton("long", summary.longSummary)
//                 : ""
//             }
//             ${
//               summary.url && !summary.url.startsWith("file-")
//                 ? `<a href="${summary.url}" target="_blank" class="action-button visit-button">
//                     <i class="bi bi-box-arrow-up-right"></i> Visit Page
//                    </a>`
//                 : ""
//             }
//             <button class="action-button delete-button" data-id="${
//               summary._id
//             }">
//               <i class="bi bi-trash"></i> Delete
//             </button>
//           </div>

//           <div class="summary-content" id="summary-content-${
//             summary._id
//           }-short"></div>
//           <div class="summary-content" id="summary-content-${
//             summary._id
//           }-long"></div>

//           <div class="summary-actions" id="download-actions-${
//             summary._id
//           }" style="display: none;">
//             ${
//               summary.shortSummary
//                 ? createDownloadButton("short", summary.url)
//                 : ""
//             }
//             ${
//               summary.longSummary
//                 ? createDownloadButton("long", summary.url)
//                 : ""
//             }
//           </div>

//           <div class="summary-tags">
//             ${summary.tags
//               .map(
//                 (tag) =>
//                   `<span class="tag" data-tag="${tag.name}">${tag.name}</span>`
//               )
//               .join("")}
//           </div>
//         </div>
//       `;
//     })
//     .join("");

//   addSummaryEventListeners();
// }

// function createViewButton(type, summary) {
//   return `
//     <button class="action-button view-button" data-type="${type}" data-summary="${encodeURIComponent(
//     summary
//   )}">
//       <i class="bi bi-eye"></i> View ${
//         type.charAt(0).toUpperCase() + type.slice(1)
//       }
//     </button>
//   `;
// }

// function createDownloadButton(type, url) {
//   return `
//     <button class="action-button download-button" data-type="${type}" data-url="${encodeURIComponent(
//     url
//   )}">
//       <i class="bi bi-download"></i> Download ${
//         type.charAt(0).toUpperCase() + type.slice(1)
//       }
//     </button>
//   `;
// }

// function addSummaryEventListeners() {
//   document.querySelectorAll(".view-button").forEach((button) => {
//     button.addEventListener("click", handleViewClick);
//   });

//   document.querySelectorAll(".download-button").forEach((button) => {
//     button.addEventListener("click", handleDownloadClick);
//   });

//   document.querySelectorAll(".tag").forEach((tag) => {
//     tag.addEventListener("click", () => {
//       const searchBar = document.getElementById("search-bar");
//       searchBar.value = tag.dataset.tag;
//       fetchPastSummaries(tag.dataset.tag);
//     });
//   });

//   document.querySelectorAll(".delete-button").forEach((button) => {
//     button.addEventListener("click", handleDeleteClick);
//   });
// }

// async function handleDeleteClick(e) {
//   const button = e.target.closest(".delete-button");
//   const summaryId = button.dataset.id;

//   if (confirm("Are you sure you want to delete this summary?")) {
//     try {
//       const response = await fetch(
//         `http://localhost:3000/summarize/summaries/${summaryId}`,
//         {
//           method: "DELETE",
//           credentials: "include",
//         }
//       );

//       if (!response.ok) {
//         throw new Error("Failed to delete summary");
//       }

//       // Remove the summary card from the UI
//       const summaryCard = button.closest(".summary-card");
//       summaryCard.remove();

//       // If no summaries left, show empty state
//       const remainingSummaries = document.querySelectorAll(".summary-card");
//       if (remainingSummaries.length === 0) {
//         const pastSummariesList = document.getElementById(
//           "past-summaries-list"
//         );
//         pastSummariesList.innerHTML = `
//           <div class="empty-state">
//             <p>No summaries found. Start by generating a summary from any webpage!</p>
//           </div>
//         `;

//       }
//     } catch (error) {
//       console.error("Error deleting summary:", error);
//       alert("Failed to delete summary. Please try again.");
//     }
//   }
// }

// function handleViewClick(e) {
//   const button = e.target.closest(".view-button");
//   if (!button) return;

//   const card = button.closest(".summary-card");
//   const summaryId = card.dataset.summaryId;
//   const type = button.dataset.type;
//   const summary = decodeURIComponent(button.dataset.summary);
//   const summaryContent = card.querySelector(
//     `#summary-content-${summaryId}-${type}`
//   );
//   const downloadActions = card.querySelector(`#download-actions-${summaryId}`);

//   // Close any open summaries in other cards
//   document.querySelectorAll(".summary-card").forEach((otherCard) => {
//     if (otherCard !== card) {
//       otherCard.querySelectorAll(".summary-content").forEach((content) => {
//         content.style.display = "none";
//         content.textContent = "";
//       });
//       otherCard.querySelector(`[id^="download-actions-"]`).style.display =
//         "none";
//       otherCard.querySelectorAll(".view-button").forEach((btn) => {
//         btn.innerHTML = `<i class="bi bi-eye"></i> View ${
//           btn.dataset.type.charAt(0).toUpperCase() + btn.dataset.type.slice(1)
//         }`;
//       });
//     }
//   });

//   // Close other summary type in the same card
//   const otherType = type === "short" ? "long" : "short";
//   const otherContent = card.querySelector(
//     `#summary-content-${summaryId}-${otherType}`
//   );
//   const otherButton = card.querySelector(
//     `.view-button[data-type="${otherType}"]`
//   );
//   if (otherContent) {
//     otherContent.style.display = "none";
//     otherContent.textContent = "";
//     if (otherButton) {
//       otherButton.innerHTML = `<i class="bi bi-eye"></i> View ${
//         otherType.charAt(0).toUpperCase() + otherType.slice(1)
//       }`;
//     }
//   }

//   // Toggle current summary
//   if (summaryContent.style.display === "block") {
//     summaryContent.style.display = "none";
//     summaryContent.textContent = "";
//     downloadActions.style.display = "none";
//     button.innerHTML = `<i class="bi bi-eye"></i> View ${
//       type.charAt(0).toUpperCase() + type.slice(1)
//     }`;
//   } else {
//     summaryContent.style.display = "block";
//     summaryContent.textContent = summary;
//     downloadActions.style.display = "flex";
//     button.innerHTML = `<i class="bi bi-eye-slash"></i> Hide ${
//       type.charAt(0).toUpperCase() + type.slice(1)
//     }`;
//   }
// }

// async function handleDownloadClick(e) {
//   const type = e.target.dataset.type;
//   const url = decodeURIComponent(e.target.dataset.url);

//   try {
//     const response = await fetch(
//       `http://localhost:3000/summarize/download?url=${encodeURIComponent(
//         url
//       )}&type=${type}`,
//       {
//         credentials: "include",
//       }
//     );

//     if (!response.ok) {
//       throw new Error("Failed to download summary");
//     }

//     const blob = await response.blob();
//     const downloadUrl = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = downloadUrl;
//     a.download = `${type}-summary.txt`;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     window.URL.revokeObjectURL(downloadUrl);
//   } catch (error) {
//     console.error("Download error:", error);
//     alert("Failed to download summary. Please try again.");
//   }
// }

// function getDomain(url) {
//   try {
//     if (url && !url.startsWith("file-")) {
//       return new URL(url).hostname;
//     }
//     return "Local File";
//   } catch (error) {
//     console.error("Invalid URL:", url, error);
//     return "Unknown Domain";
//   }
// }

// Summaries related functions
const IP_ADD = process.env.IP_ADD;

export async function fetchPastSummaries(query = "") {
  const pastSummariesList = document.getElementById("past-summaries-list");

  try {
    const endpoint = query
      ? `http://ec2-51-21-170-204.eu-north-1.compute.amazonaws.com:3000/summarize/search?query=${encodeURIComponent(
          query
        )}`
      : `http://ec2-51-21-170-204.eu-north-1.compute.amazonaws.com:3000/summaries/summaries`;

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
          <h3>No summaries found. Start by generating a summary from any webpage!</h3>
        </div>
      `;

      return;
    }

    renderSummaries(summaries);
  } catch (error) {
    console.error("Failed to fetch summaries:", error);
    pastSummariesList.innerHTML = `
      <div class="empty-state">
        <p>Error loading summaries. Please try again.</p>
      </div>
    `;
  }
}

function renderSummaries(summaries) {
  const pastSummariesList = document.getElementById("past-summaries-list");

  pastSummariesList.innerHTML = summaries
    .map((summary) => {
      const domain = getDomain(summary.url);

      return `
        <div class="summary-card" data-summary-id="${summary._id}">
          <div class="summary-header">
            <div class="summary-title">${summary.tags[0]?.name || summary.domain}</div>
            <div class="summary-domain">${summary.domain || domain}</div>
          </div>
          
          <div class="ai-provider-info">
            ${
              summary.aiProvider_short
                ? `<div>✨ Short summary by ${summary.aiProvider_short}</div>`
                : ""
            }
            ${
              summary.aiProvider_long
                ? `<div>📝 Long summary by ${summary.aiProvider_long}</div>`
                : ""
            }
          </div>

          <div class="summary-actions">
            ${
              summary.shortSummary
                ? createViewButton("short", summary.shortSummary)
                : ""
            }
            ${
              summary.longSummary
                ? createViewButton("long", summary.longSummary)
                : ""
            }
            ${
              summary.url && !summary.url.startsWith("file-")
                ? `<a href="${summary.url}" target="_blank" class="action-button visit-button">
                    <i class="bi bi-box-arrow-up-right"></i> Visit Page
                   </a>`
                : ""
            }
            <button class="action-button delete-button" data-id="${
              summary._id
            }">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>

          <div class="summary-content" id="summary-content-${
            summary._id
          }-short"></div>
          <div class="summary-content" id="summary-content-${
            summary._id
          }-long"></div>

          <div class="summary-actions" id="download-actions-${
            summary._id
          }" style="display: none;">
            ${
              summary.shortSummary
                ? createDownloadButton("short", summary.url)
                : ""
            }
            ${
              summary.longSummary
                ? createDownloadButton("long", summary.url)
                : ""
            }
          </div>

          <div class="summary-tags">
            ${summary.tags
              .map(
                (tag) =>
                  `<span class="tag" data-tag="${tag.name}">${tag.name}</span>`
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  addSummaryEventListeners();
}

function createViewButton(type, summary) {
  return `
    <button class="action-button view-button" data-type="${type}" data-summary="${encodeURIComponent(
      summary
    )}">
      <i class="bi bi-eye"></i> View ${
        type.charAt(0).toUpperCase() + type.slice(1)
      }
    </button>
  `;
}

function createDownloadButton(type, url) {
  return `
    <button class="action-button download-button" data-type="${type}" data-url="${encodeURIComponent(
      url
    )}">
      <i class="bi bi-download"></i> Download ${
        type.charAt(0).toUpperCase() + type.slice(1)
      }
    </button>
  `;
}

function addSummaryEventListeners() {
  document.querySelectorAll(".view-button").forEach((button) => {
    button.addEventListener("click", handleViewClick);
  });

  document.querySelectorAll(".download-button").forEach((button) => {
    button.addEventListener("click", handleDownloadClick);
  });

  document.querySelectorAll(".tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      const searchBar = document.getElementById("search-bar");
      searchBar.value = tag.dataset.tag;
      fetchPastSummaries(tag.dataset.tag);
    });
  });

  document.querySelectorAll(".delete-button").forEach((button) => {
    button.addEventListener("click", handleDeleteClick);
  });
}

async function handleDeleteClick(e) {
  const button = e.target.closest(".delete-button");
  const summaryId = button.dataset.id;

  if (confirm("Are you sure you want to delete this summary?")) {
    try {
      const response = await fetch(
        `http://localhost:3000/summarize/summaries/${summaryId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete summary");
      }

      // Remove the summary card from the UI
      const summaryCard = button.closest(".summary-card");
      summaryCard.remove();

      // If no summaries left, show empty state
      const remainingSummaries = document.querySelectorAll(".summary-card");
      if (remainingSummaries.length === 0) {
        const pastSummariesList = document.getElementById(
          "past-summaries-list"
        );
        pastSummariesList.innerHTML = `
          <div class="empty-state">
            <p>No summaries found. Start by generating a summary from any webpage!</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error deleting summary:", error);
      alert("Failed to delete summary. Please try again.");
    }
  }
}

function handleViewClick(e) {
  const button = e.target.closest(".view-button");
  if (!button) return;

  const card = button.closest(".summary-card");
  const summaryId = card.dataset.summaryId;
  const type = button.dataset.type;
  const summary = decodeURIComponent(button.dataset.summary);
  const summaryContent = card.querySelector(
    `#summary-content-${summaryId}-${type}`
  );
  const downloadActions = card.querySelector(`#download-actions-${summaryId}`);

  // Close any open summaries in other cards
  document.querySelectorAll(".summary-card").forEach((otherCard) => {
    if (otherCard !== card) {
      otherCard.querySelectorAll(".summary-content").forEach((content) => {
        content.style.display = "none";
        content.textContent = "";
      });
      otherCard.querySelector(`[id^="download-actions-"]`).style.display =
        "none";
      otherCard.querySelectorAll(".view-button").forEach((btn) => {
        btn.innerHTML = `<i class="bi bi-eye"></i> View ${
          btn.dataset.type.charAt(0).toUpperCase() + btn.dataset.type.slice(1)
        }`;
      });
    }
  });

  // Close other summary type in the same card
  const otherType = type === "short" ? "long" : "short";
  const otherContent = card.querySelector(
    `#summary-content-${summaryId}-${otherType}`
  );
  const otherButton = card.querySelector(
    `.view-button[data-type="${otherType}"]`
  );
  if (otherContent) {
    otherContent.style.display = "none";
    otherContent.textContent = "";
    if (otherButton) {
      otherButton.innerHTML = `<i class="bi bi-eye"></i> View ${
        otherType.charAt(0).toUpperCase() + otherType.slice(1)
      }`;
    }
  }

  // Toggle current summary
  if (summaryContent.style.display === "block") {
    summaryContent.style.display = "none";
    summaryContent.textContent = "";
    downloadActions.style.display = "none";
    button.innerHTML = `<i class="bi bi-eye"></i> View ${
      type.charAt(0).toUpperCase() + type.slice(1)
    }`;
  } else {
    summaryContent.style.display = "block";
    summaryContent.textContent = summary;
    downloadActions.style.display = "flex";
    button.innerHTML = `<i class="bi bi-eye-slash"></i> Hide ${
      type.charAt(0).toUpperCase() + type.slice(1)
    }`;
  }
}

async function handleDownloadClick(e) {
  const type = e.target.dataset.type;
  const url = decodeURIComponent(e.target.dataset.url);

  try {
    const response = await fetch(
      `http://localhost:3000/summarize/download?url=${encodeURIComponent(
        url
      )}&type=${type}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to download summary");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${type}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error("Download error:", error);
    alert("Failed to download summary. Please try again.");
  }
}

function getDomain(url) {
  try {
    if (url && !url.startsWith("file-")) {
      return new URL(url).hostname;
    }
    return "Local File";
  } catch (error) {
    console.error("Invalid URL:", url, error);
    return "Unknown Domain";
  }
}
