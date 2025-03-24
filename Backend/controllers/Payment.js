const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const IP_ADD = process.env.IP_ADD;


async function getPlans(req, res) {
  // Return empty array for super_admin
  if (req.user && req.user.role === "super_admin") {
    return res.json([]);
  }

  const plans = [
    {
      id: "basic",
      name: "Basic Plan",
      price: 4.99,
      features: ["File summaries generation"],
    },
    {
      id: "premium",
      name: "Premium Plan",
      price: 9.99,
      features: ["Access to Chatbot", "Generate and Download file summaries"],
    },
  ];

  res.json(plans);
}

async function createCheckoutSession(req, res) {
  try {
    // Prevent super_admin from creating checkout sessions
    if (req.user.role === "super_admin") {
      return res
        .status(403)
        .json({ error: "Super admins already have premium access" });
    }

    const { planId } = req.body;

    // Get plan details
    let planDetails;
    if (planId === "basic") {
      planDetails = {
        name: "Basic Plan",
        price: 499, // in cents
      };
    } else if (planId === "premium") {
      planDetails = {
        name: "Premium Plan",
        price: 999, // in cents
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
      success_url: `http://${IP_ADD}:3000/payment/success?session_id={CHECKOUT_SESSION_ID}&token=${req.cookies.jwt}`,
      cancel_url: `http://${IP_ADD}:3000/payment/cancel?token=${req.cookies.jwt}`,
      client_reference_id: req.user._id.toString(),
      metadata: {
        userId: req.user._id.toString(),
        planId: planId,
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Payment error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

async function handlePaymentSuccess(req, res) {
  try {
    const { session_id } = req.body;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === "paid") {
      // Check if payment was already processed
      const user = await User.findById(session.client_reference_id);
      const paymentExists = user.paymentHistory.some(
        (payment) =>
          payment.description ===
          `Subscription to ${session.metadata.planId} plan`
      );

      if (!paymentExists) {
        // Update user subscription and payment history
        await User.findByIdAndUpdate(session.client_reference_id, {
          subscription: session.metadata.planId,
          $push: {
            paymentHistory: {
              amount: session.amount_total / 100, // Convert cents to dollars
              description: `Subscription to ${session.metadata.planId} plan`,
              status: "completed",
              date: new Date(),
            },
          },
        });
      }

      res.json({ success: true });
    } else {
      res.status(400).json({ error: "Payment not completed" });
    }
  } catch (error) {
    console.error("Payment success handler error:", error);
    res.status(500).json({ error: "Failed to process payment success" });
  }
}

async function getPaymentHistory(req, res) {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      subscription: user.subscription,
      paymentHistory: user.paymentHistory || [],
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
}

module.exports = {
  getPlans,
  createCheckoutSession,
  handlePaymentSuccess,
  getPaymentHistory,
};
