// Auth related functions
const IP_ADD = process.env.IP_ADD;

export async function checkAuth() {
  try {
    const response = await fetch(`http://${IP_ADD}:3000/auth/status`, {
      credentials: "include",
    });
    const data = await response.json();

    if (!data.isAuthenticated) {
      window.close();
      chrome.runtime.sendMessage({ action: "openPopup" });
      return null;
    } else {
      return data.user.role;
    }
  } catch (error) {
    console.error("Auth check error:", error);
    showError("Could not connect to server. Please try again later.");
    return null;
  }
}

export function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}