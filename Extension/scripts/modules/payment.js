// Payment related functions
export async function fetchPlans() {
  const plansContainer = document.getElementById("plans-container");

  try {
    const [plansResponse, profileResponse] = await Promise.all([
      fetch("http://localhost:3000/payment/plans", {
        credentials: "include",
      }),
      fetch("http://localhost:3000/profile", { credentials: "include" }),
    ]);

    if (!plansResponse.ok || !profileResponse.ok) {
      throw new Error("Failed to fetch plans or profile");
    }

    const plans = await plansResponse.json();
    const profile = await profileResponse.json();

    // Hide payment content if user is super_admin
    if (profile.role === "super_admin") {
      document.getElementById("payment-content").innerHTML = `
          <div class="empty-state">
            <p>As a Super Admin, you automatically have access to all premium features.</p>
          </div>
        `;
      return;
    }

    // Filter out basic plan if user has premium subscription
    const availablePlans =
      profile.subscription === "premium"
        ? plans.filter((plan) => plan.id === "premium")
        : plans;

    plansContainer.innerHTML = availablePlans
      .map(
        (plan) => `
          <div class="plan-card ${
            profile.subscription === plan.id ? "current-plan" : ""
          }">
            <div class="plan-name">${plan.name}</div>
            <div class="plan-price">$${plan.price}/month</div>
            <ul class="plan-features">
              ${plan.features.map((feature) => `<li>${feature}</li>`).join("")}
            </ul>
            ${
              profile.subscription !== plan.id
                ? `<button class="subscribe-button" data-plan="${plan.id}">Subscribe</button>`
                : ""
            }
          </div>
        `
      )
      .join("");

    addPaymentEventListeners();
  } catch (error) {
    console.error("Failed to fetch plans:", error);
    plansContainer.innerHTML = `
        <div class="empty-state">
          <p>Error loading subscription plans. Please try again.</p>
        </div>
      `;
  }
}

function addPaymentEventListeners() {
  document.querySelectorAll(".subscribe-button").forEach((button) => {
    button.addEventListener("click", () => {
      createCheckoutSession(button.dataset.plan);
    });
  });
}

async function createCheckoutSession(planId) {
  try {
    const response = await fetch(
      "http://localhost:3000/payment/create-checkout-session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create checkout session");
    }

    const data = await response.json();

    // Open the checkout URL in a new window
    const checkoutWindow = window.open(data.url, "stripeCheckout");

    // Listen for messages from the payment completion page
    window.addEventListener("message", async function (event) {
      if (event.data.type === "payment_success") {
        checkoutWindow.close();

        // Handle successful payment
        try {
          await fetch("http://localhost:3000/payment/payment-success", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ session_id: event.data.sessionId }),
          });

          // Refresh the plans and payment history
          fetchPlans();
          fetchPaymentHistory();
          alert("Payment successful! Your subscription has been updated.");
        } catch (error) {
          console.error("Error processing payment success:", error);
          alert(
            "There was an error processing your payment. Please try again."
          );
        }
      } else if (event.data.type === "payment_cancel") {
        checkoutWindow.close();
        alert("Payment cancelled. Please try again if you wish to subscribe.");
      }
    });
  } catch (error) {
    console.error("Payment error:", error);
    alert("Failed to process payment. Please try again.");
  }
}

export async function fetchPaymentHistory() {
  const paymentHistory = document.getElementById("payment-history");

  try {
    const response = await fetch("http://localhost:3000/payment/history", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch payment history");
    }

    const data = await response.json();

    if (!data.paymentHistory || data.paymentHistory.length === 0) {
      paymentHistory.innerHTML = `
          <div class="empty-state">
            <p>No payment history found.</p>
          </div>
        `;
      return;
    }

    paymentHistory.innerHTML = data.paymentHistory
      .map((payment) => {
        const date = new Date(payment.date);
        const formattedDate = date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return `
          <div class="payment-item">
            <div class="payment-date">${formattedDate}</div>
            <div class="payment-amount">$${payment.amount.toFixed(2)}</div>
            <div class="payment-description">${payment.description}</div>
            <div class="payment-status">Status: ${payment.status}</div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    paymentHistory.innerHTML = `
        <div class="empty-state">
          <p>Error loading payment history. Please try again.</p>
        </div>
      `;
  }
}
