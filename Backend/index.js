const express = require("express");
const { connectToDb } = require("./connection");
const dotenv = require("dotenv").config();
const summaryRouter = require("./routes/Summary");
const authRouter = require("./routes/auth");
const chatRouter = require("./routes/chat");
const paymentRouter = require("./routes/payment");
const adminRouter = require("./routes/admin");
const passport = require("passport");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import passport configuration
require("./config/passport");

const port = 3000;
const MONGO_URI = process.env.MONGO_URI;
connectToDb(MONGO_URI);

const app = express();

// Enable CORS for Chrome extension
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Initialize passport
app.use(passport.initialize());

// Routes
app.use("/summarize", summaryRouter);
app.use("/summaries", summaryRouter);
app.use("/chat", chatRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/payment", paymentRouter);

// User status endpoint (JWT Authentication)
app.get(
  "/user",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    return res.json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture,
        subscription: req.user.subscription,
        role: req.user.role,
      },
    });
  }
);

// Profile endpoint (JWT Authentication)
app.get(
  "/profile",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    return res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      picture: req.user.picture,
      subscription: req.user.subscription,
      role: req.user.role,
      createdAt: req.user.createdAt,
    });
  }
);

// Stripe Payment Success Page (For Extension)
app.get("/payment/success", (req, res) => {
  const sessionId = req.query.session_id;
  const token = req.query.token;
  res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage({
            type: 'payment_success',
            sessionId: '${sessionId}',
            token: '${token}'
          }, '*');
          window.close();
        </script>
      </body>
    </html>
  `);
});

// Stripe Payment Cancel Page (For Extension)
app.get("/payment/cancel", (req, res) => {
  const token = req.query.token;
  res.send(`
    <html>
      <body>
        <script>
          window.opener.postMessage({
            type: 'payment_cancel',
            token: '${token}'
          }, '*');
          window.close();
        </script>
      </body>
    </html>
  `);
});

app.listen(port, () => console.log(`Server started on PORT ${port}`));
