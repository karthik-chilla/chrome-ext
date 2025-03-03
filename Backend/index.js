const express = require("express");
const { connectToDb } = require("./connection");
const dotenv = require("dotenv").config();
const summaryRouter = require("./routes/Summary");
const authRouter = require("./routes/auth");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Import passport configuration
require("./config/passport");

const port = 3000;
const MONGO_URI = process.env.MONGO_URI;
connectToDb(MONGO_URI);

const app = express();

// Enable CORS for Chrome extension
app.use(cors({
  origin: ["chrome-extension://*", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/summarize", summaryRouter);
app.use("/auth", authRouter);

// User status endpoint
app.get("/user", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ 
      isAuthenticated: true, 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture
      }
    });
  }
  return res.json({ isAuthenticated: false });
});

app.listen(port, () => console.log(`Server started on PORT ${port}`));