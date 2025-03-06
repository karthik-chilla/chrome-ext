document.addEventListener("DOMContentLoaded", () => {
  
  const pastSummariesLink = document.getElementById("past-summaries");
  const tagsLink = document.getElementById("tags");
  const profileLink = document.getElementById("profile");
  const paymentLink = document.getElementById("payment");
  
  
  const pastSummariesContent = document.getElementById("past-summaries-content");
  const tagsContent = document.getElementById("tags-content");
  const profileContent = document.getElementById("profile-content");
  const paymentContent = document.getElementById("payment-content");
  

  const searchBar = document.getElementById("search-bar");
  const pastSummariesList = document.getElementById("past-summaries-list");
  const tagsList = document.getElementById("tags-list");
  const userInfo = document.getElementById("user-info");
  const plansContainer = document.getElementById("plans-container");
  const paymentHistory = document.getElementById("payment-history");
 
  checkAuth();
  
  function checkAuth() {
    fetch("http://localhost:3000/auth/status", {
      method: "GET",
      credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
      if (!data.isAuthenticated) {
        
        window.close();
        chrome.runtime.sendMessage({ action: "openPopup" });
      } else {
        
        fetchPastSummaries();
      }
    })
    .catch(error => {
      console.error("Auth check error:", error);
      showError("Could not connect to server. Please try again later.");
    });
  }
  
  
  pastSummariesLink.addEventListener("click", () => {
    setActiveSection(pastSummariesLink, pastSummariesContent);
    fetchPastSummaries();
  });
  
  tagsLink.addEventListener("click", () => {
    setActiveSection(tagsLink, tagsContent);
    fetchTags();
  });
  
  profileLink.addEventListener("click", () => {
    setActiveSection(profileLink, profileContent);
    fetchProfile();
  });
  
  paymentLink.addEventListener("click", () => {
    setActiveSection(paymentLink, paymentContent);
    fetchPlans();
    fetchPaymentHistory();
  });
  
  
  searchBar.addEventListener("input", (e) => {
    fetchPastSummaries(e.target.value);
  });
  
  
  function setActiveSection(link, content) {
   
    document.querySelectorAll(".sidebar a").forEach(el => {
      el.classList.remove("active");
    });
    
    
    link.classList.add("active");
    
   
    document.querySelectorAll(".content-section").forEach(el => {
      el.classList.remove("active");
      el.classList.add("hidden");
    });
    
   
    content.classList.remove("hidden");
    content.classList.add("active");
  }
  
  
  async function fetchPastSummaries(query = "") {
    try {
      const endpoint = query 
        ? `http://localhost:3000/summaries/search?query=${encodeURIComponent(query)}`
        : "http://localhost:3000/summaries/summaries";
      
      const response = await fetch(endpoint, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch summaries");
      }
      
      const summaries = await response.json();
      
      if (summaries.length === 0) {
        pastSummariesList.innerHTML = `
          <div class="empty-state">
            <p>No summaries found.</p>
            <button id="generate-new">Generate a new summary</button>
          </div>
        `;
        
        document.getElementById("generate-new")?.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "openPopup" });
        });
        
        return;
      }

      const getHostname = (url) => {
        try {
          if(!isValidUrl(url)){
            return "Extension page";
          }
          return new URL(url).hostname;
        } catch (e) {
          return "Invalid URL";
        }
      };
      


      pastSummariesList.innerHTML = summaries.map(summary => `
        <div class="summary-card">
          <div class="summary-title">${summary.title || "Untitled"}</div>
         <div class="summary-domain">${summary.domain || getHostname(summary.url)}</div>
          <div class="summary-text">${summary.shortSummary || summary.longSummary}</div>
          
          <div class="summary-tags">
            ${summary.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join("")}
          </div>
          
          <div class="summary-actions">
            <a href="${summary.url}" target="_blank" class="action-button view-button">View Article</a>
            <button class="action-button download-button" data-url="${summary.url}" data-type="short">Download Short</button>
            <button class="action-button download-button" data-url="${summary.url}" data-type="long">Download Long</button>
          </div>
        </div>
      `).join("");
      
     
      document.querySelectorAll(".tag").forEach(tag => {
        tag.addEventListener("click", () => {
          searchBar.value = tag.dataset.tag;
          fetchPastSummaries(tag.dataset.tag);
        });
      });
      
      
      document.querySelectorAll(".download-button").forEach(button => {
        button.addEventListener("click", () => {
          downloadSummary(button.dataset.url, button.dataset.type);
        });
      });
      
    } catch (error) {
      console.error("Failed to fetch summaries:", error);
      pastSummariesList.innerHTML = `
        <div class="empty-state">
          <p>Error loading summaries. Please try again.</p>
        </div>
      `;
    }
  }
  
  
  async function fetchTags() {
    try {
      const response = await fetch("http://localhost:3000/summaries/tags", {
        credentials: "include"
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
      
      tagsList.innerHTML = tags.map(tag => `
        <div class="tag-item" data-tag="${tag.name}">
          <div class="tag-name">${tag.name}</div>
          <div class="tag-count">${tag.count} ${tag.count === 1 ? 'summary' : 'summaries'}</div>
        </div>
      `).join("");
      
     
      document.querySelectorAll(".tag-item").forEach(tagItem => {
        tagItem.addEventListener("click", () => {
          setActiveSection(pastSummariesLink, pastSummariesContent);
          searchBar.value = tagItem.dataset.tag;
          fetchPastSummaries(tagItem.dataset.tag);
        });
      });
      
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      tagsList.innerHTML = `
        <div class="empty-state">
          <p>Error loading tags. Please try again.</p>
        </div>
      `;
    }
  }
  
  
  async function fetchProfile() {
    try {
      const response = await fetch("http://localhost:3000/profile", {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      
      const profile = await response.json();
      
    
      const joinDate = new Date(profile.createdAt);
      const formattedDate = joinDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
     
      const subscriptionText = profile.subscription === 'free' 
        ? 'Free Plan' 
        : profile.subscription === 'basic'
          ? 'Basic Plan'
          : 'Premium Plan';
      
      userInfo.innerHTML = `
        <img src="${profile.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`}" alt="${profile.name}" class="user-avatar">
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
  
  
  async function fetchPlans() {
    try {
      const [plansResponse, profileResponse] = await Promise.all([
        fetch("http://localhost:3000/payment/plans", { credentials: "include" }),
        fetch("http://localhost:3000/profile", { credentials: "include" })
      ]);
      
      if (!plansResponse.ok || !profileResponse.ok) {
        throw new Error("Failed to fetch plans or profile");
      }
      
      const plans = await plansResponse.json();
      const profile = await profileResponse.json();
      
      plansContainer.innerHTML = plans.map(plan => `
        <div class="plan-card ${profile.subscription === plan.id ? 'current-plan' : ''}">
          <div class="plan-name">${plan.name}</div>
          <div class="plan-price">$${plan.price}/month</div>
          <ul class="plan-features">
            ${plan.features.map(feature => `<li>${feature}</li>`).join("")}
          </ul>
          ${profile.subscription !== plan.id 
            ? `<button class="subscribe-button" data-plan="${plan.id}">Subscribe</button>` 
            : ''}
        </div>
      `).join("");
      
      document.querySelectorAll(".subscribe-button").forEach(button => {
        button.addEventListener("click", () => {
          createCheckoutSession(button.dataset.plan);
        });
      });
      
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      plansContainer.innerHTML = `
        <div class="empty-state">
          <p>Error loading subscription plans. Please try again.</p>
        </div>
      `;
    }
  }
  
 async function fetchPaymentHistory() {
  try {
    const response = await fetch("http://localhost:3000/payment/history", {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Failed to fetch payment history");
    }

    const data = await response.json();
    console.log("Fetched payment history:", data);

    if (!data.paymentHistory || data.paymentHistory.length === 0) {
      paymentHistory.innerHTML = `
        <div class="empty-state">
          <p>No payment history found.</p>
        </div>
      `;
      return;
    }

    paymentHistory.innerHTML = data.paymentHistory.map(payment => {
      const date = new Date(payment.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      return `
        <div class="payment-item">
          <div class="payment-date">${formattedDate}</div>
          <div class="payment-amount">$${payment.amount.toFixed(2)}</div>
          <div class="payment-description">${payment.description}</div>
          <div class="payment-status">Status: ${payment.status}</div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    paymentHistory.innerHTML = `
      <div class="empty-state">
        <p>Error loading payment history. Please try again.</p>
      </div>
    `;
  }
}

// Create checkout session
async function createCheckoutSession(planId) {
  try {
    const extensionId = chrome.runtime.id; // Get the extension ID dynamically
    console.log("Creating checkout session for plan:", planId);

    const response = await fetch("http://localhost:3000/payment/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Id": extensionId // Pass the extension ID
      },
      body: JSON.stringify({ planId }),
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error("Failed to create checkout session");
    }

    const data = await response.json();
    console.log("Stripe session URL:", data.url);

    // Open Stripe checkout in a new window
    const stripeWindow = window.open(data.url, "_blank");

    // Listen for payment completion
    window.addEventListener('message', async function(event) {
      if (event.data.type === 'payment_success') {
        const sessionId = event.data.sessionId;
        console.log("Payment success, session ID:", sessionId);

        // Notify the server about successful payment
        await fetch("http://localhost:3000/payment/payment-success", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ session_id: sessionId }),
          credentials: "include"
        });

        // Refresh the payment history
        fetchPaymentHistory();
        alert("Payment successful! Your subscription has been updated.");
      } else if (event.data.type === 'payment_cancel') {
        alert("Payment was canceled.");
      }
    });

  } catch (error) {
    console.error("Payment error:", error);
    alert("Failed to process payment. Please try again.");
  }
}

  function checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
  
    if (paymentStatus === 'success' && sessionId) {
      // Post message to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'payment_success',
          sessionId: sessionId
        }, '*');
  
        // Close the window
        window.close();
      } else {
        // Handle case when opened directly
        createCheckoutSession(sessionId);
      }
    }
  }
  
  // Call checkPaymentStatus on page load
  checkPaymentStatus();
  
  async function downloadSummary(url, type) {
    try {
      const response = await fetch(`http://localhost:3000/summaries/download?url=${encodeURIComponent(url)}&type=${type}`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to download summary");
      }
      
      const content = await response.text();
      const blob = new Blob([content], { type: "text/plain" });
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${type}-summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download summary. Please try again.");
    }
  }
  
  
  function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  document.getElementById("file-upload").click();
  paymentLink.addEventListener("click", () => {
    setActiveSection(paymentLink, paymentContent);
    fetchPlans();
    fetchPaymentHistory();
  });

  document.addEventListener("DOMContentLoaded",function(){
    fetchPaymentHistory();

  })



});