const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  getPlans,
  createCheckoutSession,
  handlePaymentSuccess,
  getPaymentHistory,
} = require("../controllers/Payment");

// Get subscription plans
router.get(
  "/plans",
  passport.authenticate("jwt", { session: false }),
  getPlans
);

// Create checkout session (with JWT authentication)
router.post(
  "/create-checkout-session",
  passport.authenticate("jwt", { session: false }),
  createCheckoutSession
);

// Payment success handler (with JWT authentication)
router.post(
  "/payment-success",
  passport.authenticate("jwt", { session: false }),
  handlePaymentSuccess
);

// Get user payment history (with JWT authentication)
router.get(
  "/history",
  passport.authenticate("jwt", { session: false }),
  getPaymentHistory
);

router.get("/payment/history", getPaymentHistory);

module.exports = router;
