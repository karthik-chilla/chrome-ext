console.log("✅ Content script loaded!");
const IP_ADD = process.env.IP_ADD;


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarizePage") {
    // Expanded authentication keywords list
    const authKeywords = [
      "login",
      "signin",
      "sign-in",
      "signup",
      "sign-up",
      "register",
      "authentication",
      "password",
      "forgot-password",
      "reset-password",
      "userlogin",
      "userauth",
      "auth",
      "authenticate",
      "account-login",
      "secure-login",
      "access-control",
      "verify",
      "mfa",
      "2fa",
      "authenticator",
      "authorization",
    ];

    const currentUrl = window.location.href.toLowerCase();
    const authRegex = new RegExp(
      `(?:[/?&]|\b)(${authKeywords.join("|")})(?:[/?&=]|\b)`,
      "i"
    );
    const urlContainsAuth = authRegex.test(currentUrl);

    if (urlContainsAuth) {
      sendResponse({
        error:
          "This extension doesn't work on login/signup pages for security reasons.",
        isRestricted: true,
      });
      return true;
    }

    // Check for video streaming platforms
    const restrictedDomains = [
      "netflix.com",
      "primevideo.com",
      "amazon.com/Prime-Video",
      "hulu.com",
      "disneyplus.com",
      "hotstar.com",
      "youtube.com",
      "vimeo.com",
      "dailymotion.com",
      "hbomax.com",
      "peacocktv.com",
      "paramountplus.com",
    ];

    const currentDomain = window.location.hostname.toLowerCase();
    if (restrictedDomains.some((domain) => currentDomain.includes(domain))) {
      sendResponse({
        error: "This extension doesn't work on video streaming platforms.",
        isRestricted: true,
      });
      return true;
    }

    // Additional check for auth forms in page content
    const forms = document.getElementsByTagName("form");
    const hasAuthForm = Array.from(forms).some((form) => {
      const formHtml = form.innerHTML.toLowerCase();
      return authKeywords.some((keyword) => formHtml.includes(keyword));
    });

    if (hasAuthForm) {
      sendResponse({
        error:
          "This extension doesn't work on pages containing login/signup forms for security reasons.",
        isRestricted: true,
      });
      return true;
    }

    const selectedText = window.getSelection().toString();
    const pageUrl = window.location.href;

    if (selectedText) {
      // Send selected text to the backend
      fetch(`http://${IP_ADD}:3000/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedText,
          url: pageUrl,
          type: request.type,
          save: true,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          sendResponse({ summary: data.response });
        })
        .catch((error) => {
          console.error("Error:", error);
          sendResponse({ summary: "Error fetching summary." });
        });
    } else {
      // If no text is selected, summarize the entire page
      const fullText = document.body.innerText;
      const maxTokens = 30000; // Adjust based on API limits
      const truncatedText = fullText.split(" ").slice(0, maxTokens).join(" ");

      fetch(`http://${IP_ADD}:3000/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: truncatedText,
          url: pageUrl,
          type: request.type,
          save: true,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          sendResponse({ summary: data.response });
        })
        .catch((error) => {
          console.error("Error:", error);
          sendResponse({ summary: "Error fetching summary." });
        });
    }

    return true; // Required for async sendResponse
  }
});
