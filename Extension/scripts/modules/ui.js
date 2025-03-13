// UI related functions
export function setActiveSection(link, content, sectionLinks, contentSections) {
  sectionLinks.forEach((el) => el.classList.remove("active"));
  contentSections.forEach((el) => {
    el.classList.remove("active");
    el.classList.add("hidden");
  });

  link.classList.add("active");
  content.classList.remove("hidden");
  content.classList.add("active");
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function showUserDetails(user) {
  const userModal = document.getElementById("userModal");
  const modalContent = document.getElementById("userModalContent");

  const loginHistory =
    user.loginHistory
      ?.map(
        (log) => `
      <div class="history-item">
        <span>${new Date(log.timestamp).toLocaleString()}</span>
        <span>${log.action}</span>
        <span>${log.ipAddress}</span>
      </div>
    `
      )
      .join("") || "No login history";

  const paymentHistory =
    user.paymentHistory
      ?.map(
        (payment) => `
      <div class="history-item">
        <span>${new Date(payment.date).toLocaleString()}</span>
        <span>$${payment.amount}</span>
        <span>${payment.description}</span>
        <span class="payment-status status-${payment.status}">${
          payment.status
        }</span>
      </div>
    `
      )
      .join("") || "No payment history";

  modalContent.innerHTML = `
      <div class="user-detail-section">
        <h5>User Information</h5>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role}</p>
        <p><strong>Subscription:</strong> ${user.subscription}</p>
        <p><strong>Created:</strong> ${new Date(
          user.createdAt
        ).toLocaleString()}</p>
        <p><strong>Last Login:</strong> ${
          user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"
        }</p>
      </div>
      
      <div class="user-detail-section">
        <h5>Login History</h5>
        <div class="login-history">
          ${loginHistory}
        </div>
      </div>
      
      <div class="user-detail-section">
        <h5>Payment History</h5>
        <div class="payment-history">
          ${paymentHistory}
        </div>
      </div>
    `;

  userModal.classList.remove("hidden");
}
