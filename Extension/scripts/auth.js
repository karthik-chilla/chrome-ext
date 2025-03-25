document.addEventListener("DOMContentLoaded", function () {
  const authContainer = document.getElementById("auth-container");
  const appContainer = document.getElementById("app-container");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const showLoginLink = document.getElementById("show-login");
  const showSignupLink = document.getElementById("show-signup");
  const loginButton = document.getElementById("login-button");
  const signupButton = document.getElementById("signup-button");
  const googleLoginButton = document.getElementById("google-login");
  const googleSignupButton = document.getElementById("google-signup");
  const logoutButton = document.getElementById("logout-button");
  const loginError = document.getElementById("login-error");
  const signupError = document.getElementById("signup-error");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");
  const userEmail = document.getElementById("user-email");

  // Check authentication status on load
  checkAuthStatus();

  // Show login form
  showLoginLink.addEventListener("click", function (e) {
    e.preventDefault();
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    // Clear any existing error messages
    loginError.textContent = "";
    signupError.textContent = "";
  });

  // Show signup form
  showSignupLink.addEventListener("click", function (e) {
    e.preventDefault();
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    // Clear any existing error messages
    loginError.textContent = "";
    signupError.textContent = "";
  });

  // Handle login
  loginButton.addEventListener("click", async function () {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      loginError.textContent = "Please fill in all fields";
      loginError.style.display = "block";
      return;
    }

    loginError.textContent = "";

    try {
      const response = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsVerification) {
          loginError.textContent = data.message;
          // Add resend verification button with loading state
          const resendButton = document.createElement("button");
          resendButton.textContent = "Resend Verification Email";
          resendButton.style.marginTop = "10px";
          resendButton.onclick = async () => {
            // Show loading state
            const originalText = resendButton.textContent;
            resendButton.disabled = true;
            resendButton.innerHTML =
              '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

            try {
              const resendResponse = await fetch(
                "http://localhost:3000/auth/sendVerificationEmail",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email }),
                  credentials: "include",
                }
              );
              if (resendResponse.ok) {
                loginError.textContent =
                  "Verification email sent. Please check your inbox.";
                resendButton.remove(); // Remove the button after successful send
              } else {
                throw new Error("Failed to send verification email");
              }
            } catch (error) {
              loginError.textContent =
                "Error sending verification email. Please try again.";
              // Reset button state
              resendButton.disabled = false;
              resendButton.textContent = originalText;
            }
          };
          loginError.appendChild(resendButton);
        } else {
          throw new Error(data.message || "Authentication failed");
        }
        return;
      }

      if (data.message === "Login successful") {
        displayUserInfo(data.user);
        showAppInterface();
      } else {
        loginError.textContent = data.message || "Login failed";
        loginError.style.display = "block";
      }
    } catch (error) {
      loginError.textContent = error.message || "Error connecting to server";
      loginError.style.display = "block";
      console.error("Login error:", error);
    }
  });

  // Handle signup
  signupButton.addEventListener("click", async function () {
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    if (!name || !email || !password) {
      signupError.textContent = "Please fill in all fields";
      signupError.style.display = "block";
      return;
    }

    signupError.textContent = "";

    try {
      const response = await fetch("http://localhost:3000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      if (data.redirectToLogin) {
        signupError.style.color = "#28a745"; // Success color
        signupError.textContent = data.message;
        setTimeout(() => {
          loginForm.classList.remove("hidden");
          signupForm.classList.add("hidden");
          signupError.textContent = "";
        }, 1000);
      } else {
        signupError.textContent = data.message || "Signup failed";
        signupError.style.display = "block";
      }
    } catch (error) {
      signupError.textContent = error.message || "Error connecting to server";
      signupError.style.display = "block";
      console.error("Signup error:", error);
    }
  });

  // Handle Google login/signup
  googleLoginButton.addEventListener("click", openGoogleAuth);
  googleSignupButton.addEventListener("click", openGoogleAuth);

  function openGoogleAuth() {
    const width = 500;
    const height = 600;
    const left = screen.width / 2 - width / 2;
    const top = screen.height / 2 - height / 2;

    const authWindow = window.open(
      "http://localhost:3000/auth/google",
      "googleAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const checkWindowClosed = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkWindowClosed);
        setTimeout(checkAuthStatus, 1000);
      }
    }, 500);
  }

  // Handle logout
  logoutButton.addEventListener("click", async function () {
    try {
      const response = await fetch("http://localhost:3000/auth/logout", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        showAuthInterface();
      } else {
        console.error("Logout failed:", data.message);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  // Check authentication status
  async function checkAuthStatus() {
    try {
      const response = await fetch("http://localhost:3000/auth/status", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.isAuthenticated) {
        displayUserInfo(data.user);
        showAppInterface();
      } else {
        showAuthInterface();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      showAuthInterface();
    }
  }

  // Display user info
  function displayUserInfo(user) {
    userName.textContent = user.name;
    userEmail.textContent = user.email;

    if (user.picture) {
      userAvatar.src = user.picture;
    } else {
      userAvatar.src =
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(user.name) +
        "&background=random";
    }
  }

  // Show app interface
  function showAppInterface() {
    authContainer.classList.add("hidden");
    appContainer.classList.remove("hidden");
  }

  // Show auth interface
  function showAuthInterface() {
    appContainer.classList.add("hidden");
    authContainer.classList.remove("hidden");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    // Clear any existing error messages
    loginError.textContent = "";
    signupError.textContent = "";
  }
});
