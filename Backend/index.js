const express = require("express");
const { connectToDb } = require("./connection");
require("dotenv").config();
const summaryRouter = require("./routes/Summary");
const authRouter = require("./routes/auth");
const chatRouter = require("./routes/chat");
const paymentRouter = require("./routes/payment");
const adminRouter = require("./routes/admin");
const passport = require("passport");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { sendMail } = require("./utils/sendMail");

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


app.post("/send-verification-mail", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Sending verification email to:", email);

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    const verificationUrl = `http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/verify-email?token=${token}`;

    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
        <p style="color: #666; line-height: 1.6;">
          Thank you for signing up! Please click the button below to verify your email address.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; 
                    color: white; 
                    padding: 12px 24px; 
                    text-decoration: none; 
                    border-radius: 4px; 
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `;

    await sendMail(
      email,
      "Verify your email address",
      `Please verify your email by clicking this link: ${verificationUrl}`,
      html
    );

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ message: "Failed to send verification email" });
  }
});

app.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    if (!email) {
      return res.status(400).json({ message: "Invalid token" });
    }

    const response = await fetch("http://ec2-51-20-31-235.eu-north-1.compute.amazonaws.com:3000/auth/verifyEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, verified: true }),
    }).then((res) => res.json());

    if (!response.success) {
      return res.status(400).send(`
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f8f9fa;
                }
                .error-container {
                  text-align: center;
                  padding: 2rem;
                  background-color: #fff;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                .error-icon {
                  font-size: 48px;
                  color: #dc3545;
                  margin-bottom: 1rem;
                }
                .error-message {
                  color: #721c24;
                  margin-bottom: 1rem;
                }
              </style>
            </head>
            <body>
              <div class="error-container">
                <div class="error-icon">❌</div>
                <h2 class="error-message">Email verification failed</h2>
                <p>Please try again or contact support.</p>
              </div>
            </body>
          </html>
        `);
    }

    res.send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .success-container {
              text-align: center;
              padding: 2rem;
              background-color: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              animation: fadeIn 0.5s ease-out;
            }
            .success-icon {
              font-size: 48px;
              color: #28a745;
              margin-bottom: 1rem;
              animation: bounce 1s ease-out;
            }
            .success-message {
              color: #155724;
              margin-bottom: 1rem;
            }
            .login-link {
              display: inline-block;
              padding: 0.5rem 1rem;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              transition: background-color 0.2s;
            }
            .login-link:hover {
              background-color: #0056b3;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes bounce {
              0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
              40% { transform: translateY(-30px); }
              60% { transform: translateY(-15px); }
            }
          </style>
        </head>
        <body>
          <div class="success-container">
            <div class="success-icon">✓</div>
            <h2 class="success-message">Email verified successfully!</h2>
            <p>Open the extension , you can now log in to your account.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f8f9fa;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
              background-color: #fff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .error-icon {
              font-size: 48px;
              color: #dc3545;
              margin-bottom: 1rem;
            }
            .error-message {
              color: #721c24;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">❌</div>
            <h2 class="error-message">Internal server error</h2>
            <p>Please try again later.</p>
          </div>
        </body>
      </html>
    `);
  }
});




app.listen(port, () => console.log(`Server started on PORT ${port}`));


