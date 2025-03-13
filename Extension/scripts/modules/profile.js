// Profile related functions
export async function fetchProfile() {
  const userInfo = document.getElementById("user-info");

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
