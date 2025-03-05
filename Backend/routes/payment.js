const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");


router.get("/plans", (req, res) => {
  const plans = [
   

    
  ];
  
  res.json(plans);
});


router.post("/create-checkout-session", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  try {
    const { planId } = req.body;
    
    
    let planDetails;
    if (planId === "basic") {
      planDetails = {
        name: "Basic Plan",
        price: 499 
      };
    } else if (planId === "premium") {
      planDetails = {
        name: "Premium Plan",
        price: 999 
      };
    } else {
      return res.status(400).json({ error: "Invalid plan" });
    }
    
  
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
      success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment-cancel`,
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


router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
   
    try {
      const userId = session.metadata.userId;
      const planId = session.metadata.planId;
      
     
      await User.findByIdAndUpdate(userId, {
        subscription: planId,
        $push: {
          paymentHistory: {
            amount: session.amount_total / 100,
            description: `Subscription to ${planId} plan`,
            status: "completed"
          }
        }
      });
    } catch (error) {
      console.error("Error updating user subscription:", error);
    }
  }
  
  res.json({ received: true });
});


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

module.exports = router;