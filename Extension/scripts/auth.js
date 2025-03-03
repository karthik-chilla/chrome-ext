document.addEventListener('DOMContentLoaded', function() {
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showLoginLink = document.getElementById('show-login');
  const showSignupLink = document.getElementById('show-signup');
  const loginButton = document.getElementById('login-button');
  const signupButton = document.getElementById('signup-button');
  const googleLoginButton = document.getElementById('google-login');
  const googleSignupButton = document.getElementById('google-signup');
  const logoutButton = document.getElementById('logout-button');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');

  // Check authentication status on load
  checkAuthStatus();

  // Show login form
  showLoginLink.addEventListener('click', function(e) {
    e.preventDefault();
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  });

  // Show signup form
  showSignupLink.addEventListener('click', function(e) {
    e.preventDefault();
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Handle login
  loginButton.addEventListener('click', function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
      loginError.textContent = 'Please fill in all fields';
      return;
    }
    
    loginError.textContent = '';
    
    fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Login successful') {
        displayUserInfo(data.user);
        showAppInterface();
      } else {
        loginError.textContent = data.message || 'Login failed';
      }
    })
    .catch(error => {
      loginError.textContent = 'Error connecting to server';
      console.error('Login error:', error);
    });
  });

  // Handle signup
  signupButton.addEventListener('click', function() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    
    if (!name || !email || !password) {
      signupError.textContent = 'Please fill in all fields';
      return;
    }
    
    signupError.textContent = '';
    
    fetch('http://localhost:3000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password }),
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Signup successful') {
        displayUserInfo(data.user);
        showAppInterface();
      } else {
        signupError.textContent = data.message || 'Signup failed';
      }
    })
    .catch(error => {
      signupError.textContent = 'Error connecting to server';
      console.error('Signup error:', error);
    });
  });

  // Handle Google login/signup
  googleLoginButton.addEventListener('click', openGoogleAuth);
  googleSignupButton.addEventListener('click', openGoogleAuth);

  function openGoogleAuth() {
    chrome.tabs.create({ url: 'http://localhost:3000/auth/google' });
    
    // Set up a listener to check when the auth is complete
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
      if (changeInfo.url && changeInfo.url.includes('chrome-extension://')) {
        chrome.tabs.onUpdated.removeListener(listener);
        checkAuthStatus();
      }
    });
  }

  // Handle logout
  logoutButton.addEventListener('click', function() {
    fetch('http://localhost:3000/auth/logout', {
      method: 'GET',
      credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
      showAuthInterface();
    })
    .catch(error => {
      console.error('Logout error:', error);
    });
  });

  // Check authentication status
  function checkAuthStatus() {
    chrome.runtime.sendMessage({action: "checkAuth"}, function(response) {
      if (response && response.isAuthenticated) {
        displayUserInfo(response.user);
        showAppInterface();
      } else {
        showAuthInterface();
      }
    });
  }

  // Display user info
  function displayUserInfo(user) {
    userName.textContent = user.name;
    userEmail.textContent = user.email;
    
    if (user.picture) {
      userAvatar.src = user.picture;
    } else {
      // Default avatar if no picture
      userAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random';
    }
  }

  // Show app interface
  function showAppInterface() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
  }

  // Show auth interface
  function showAuthInterface() {
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
  }
});