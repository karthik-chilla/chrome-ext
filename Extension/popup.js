// let save = true;
// document.getElementById("generate-summary").addEventListener("click", () => {
//   const loader = document.getElementById("loader");
//   const summary = document.getElementById("summary");
//   const summaryTypeCheckbox = document.getElementById("summaryType");
//   const isLong = summaryTypeCheckbox.checked ? "long" : "short";

//   loader.style.display = "block";
//   summary.innerText = "";

//   chrome.tabs.query({ active: true }, (tabs) => {
//     chrome.scripting.executeScript(
//       { target: { tabId: tabs[0].id }, function: getSelectedOrFullText },
//       (results) => {
//         if (results) {
//           const { text, isSelected } = results[0].result;
//           console.log("IN POPUP.JS, isSelected:", isSelected);
//           fetchSummary(text, isLong, tabs[0].url, tabs[0].domain, !isSelected);
//         }
//       }
//     );
//   });
// });

// function getSelectedOrFullText() {
//   console.log("In getSelectedOrFullText");

//   const x = window.getSelection().toString();
//   console.log(x);

//   if (x) {
//     save = false;
//     console.log("Returning selected text", save);
//     return { text: x, isSelected: true };
//   }
//   return { text: document.body.innerText.slice(0, 5000), isSelected: false };
// }

// function fetchSummary(text, type, url, domain, save) {
//   fetch("http://localhost:3000/summarize", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       text,
//       url,
//       domain,
//       title: document.title,
//       type,
//       save,
//     }),
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       document.getElementById("loader").style.display = "none";
//       document.getElementById("summary").innerText = data.response;
//     })
//     .catch((error) => {
//       console.error("Error:", error);
//       document.getElementById("loader").style.display = "none";
//       document.getElementById("summary").innerText =
//         "⚠️ Error generating summary. Please try again.";
//     });
// }
