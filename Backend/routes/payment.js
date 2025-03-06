const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");

// Get subscription plans
router.get("/plans", (req, res) => {
  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: 4.99,
      features: [
        "Unlimited summaries",
        "Save up to 50 summaries",
        "Basic tag generation"
      ]
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: 9.99,
      features: [
        "Unlimited summaries",
        "Save unlimited summaries",
        "Advanced tag generation",
        "Priority support",
        "Export to PDF/Word"
      ]
    }
  ];
  
  res.json(plans);
});

// Create checkout session
router.post("/create-checkout-session", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const { planId } = req.body;
    const extensionId=req.headers['x-extension-id'];

    if (!extensionId) {
      return res.status(400).json({ error: "Extension ID not provided" });
    }
    
    
    // Get plan details
    let planDetails;
    if (planId === "basic") {
      planDetails = {
        name: "Basic Plan",
        price: 499 // in cents
      };
    } else if (planId === "premium") {
      planDetails = {
        name: "Premium Plan",
        price: 999 // in cents
      };
    } else {
      return res.status(400).json({ error: "Invalid plan" });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: planDetails.name,
            },
            unit_amount: planDetails.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/payment/cancel`,
      client_reference_id: req.user._id.toString(),
      metadata: {
        userId: req.user._id.toString(),
        planId: planId
      }
    });
    
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Payment success handler
router.post("/payment-success", async (req, res) => {
  try {
    const { session_id } = req.body;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      // Update user subscription and payment history
      await User.findByIdAndUpdate(session.client_reference_id, {
        subscription: session.metadata.planId,
        $push: {
          paymentHistory: {
            amount: session.amount_total / 100, // Convert cents to dollars
            description: `Subscription to ${session.metadata.planId} plan`,
            status: "completed",
            date: new Date() // Add the current date
          }
        }
      });

      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Payment not completed" });
    }
  } catch (error) {
    console.error("Payment success handler error:", error);
    res.status(500).json({ error: "Failed to process payment success" });
  }
});

// Get user payment history
router.get("/history", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const user = await User.findById(req.user._id);
    res.json({
      subscription: user.subscription,
      paymentHistory: user.paymentHistory || []
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

router.get("/payment/history", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      paymentHistory: user.paymentHistory || []
    });
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

module.exports = router;
