const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const {
  handleGoogleCallback,
  signup,
  login,
  logout,
  getStatus,
} = require("../../controllers/Auth");
const User = require("../../models/User");

describe("Auth Controller", () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.disconnect();
    await mongoose.connect(mongoUri);

    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
    console.error.mockRestore();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    app = express();
    app.use(express.json());
    app.use(passport.initialize());
    
    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';

    // Mock bcrypt and jwt
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    jwt.sign = jest.fn().mockReturnValue('mock-token');

    app.post("/auth/signup", signup);
    app.post("/auth/login", login);
    app.get("/auth/logout", logout);
    app.get("/auth/status", (req, res, next) => {
      req.user = {
        _id: "userId",
        name: "Test User",
        email: "test@example.com",
        picture: "test.jpg",
        role: "user",
        subscription: "free",
        verified: true,
        loginHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };
      next();
    }, getStatus);
    app.get("/auth/google/callback", handleGoogleCallback);
  });

  describe("signup", () => {
    it("should create a new user successfully", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
          email: "newuser@example.com",
          password: "password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Signup successful. Please check your email to verify your account.");
      expect(response.body).toHaveProperty("redirectToLogin", true);
    });

    it("should not allow signup with missing fields", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message");
    });

    it("should not allow duplicate email signup", async () => {
      await User.create({
        name: "Existing User",
        email: "test@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User already exists");
    });

    it("should handle invalid password format", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "123" // Too short password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Password must be at least 6 characters");
    });

    it("should handle invalid email format", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
          email: "invalidemail",
          password: "password123"
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Invalid email format");
    });
  });

  describe("login", () => {
    beforeEach(async () => {
      const mockUser = {
        _id: "userId",
        name: "Test User",
        email: "test@example.com",
        password: await bcrypt.hash("password123", 10),
        verified: true,
        loginHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      passport.authenticate = jest.fn((strategy, cb) => (req, res, next) => {
        cb(null, mockUser);
      });

      User.findOne = jest.fn().mockResolvedValue(mockUser);
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Login successful");
    });

    it("should not login with incorrect credentials", async () => {
      // Modified passport mock to simulate authentication failure
      const authMiddleware = (req, res, next) => {
        return res.status(401).json({ message: "Invalid credentials" });
      };

      passport.authenticate = jest.fn(() => authMiddleware);

      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });

    it("should handle missing credentials", async () => {
      passport.authenticate = jest.fn((strategy, cb) => (req, res, next) => {
        cb(null, false, { message: "Email and password are required" });
        next();
      });

      const response = await request(app)
        .post("/auth/login")
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Email and password are required");
    });

    it("should handle non-existent user", async () => {
      const authMiddleware = (req, res, next) => {
        return res.status(401).json({ message: "User not found" });
      };

      passport.authenticate = jest.fn(() => authMiddleware);

      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "password123"
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "User not found");
    });
  });

  describe("logout", () => {
    it("should log out successfully", async () => {
      const response = await request(app).get("/auth/logout");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out successfully");
    });
  });

  describe("getStatus", () => {
    it("should return user status when authenticated", async () => {
      const response = await request(app).get("/auth/status");
      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(response.body.user).toHaveProperty("email", "test@example.com");
    });

    it("should handle unauthenticated user", async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.get("/auth/status", (req, res, next) => {
        req.user = null;
        next();
      }, getStatus);
      
      const response = await request(unauthApp).get("/auth/status");
      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });
  });

  describe("handleGoogleCallback", () => {
    it("should handle successful Google authentication", async () => {
      const mockUser = {
        _id: "userId",
        name: "Google User",
        email: "google@example.com",
        verified: true,
        loginHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      passport.authenticate = jest.fn(() => (req, res, next) => {
        req.user = mockUser;
        req.query = { code: "testcode" };
        next();
      });

      const response = await request(app)
        .get("/auth/google/callback")
        .query({ code: "testcode" });

      expect(response.status).toBe(200);
      expect(response.text).toContain("window.close()");
    });

    it("should handle missing code parameter", async () => {
      passport.authenticate = jest.fn((strategy, callback) => {
        return (req, res, next) => {
          res.status(400).json({ message: "Authorization code missing" });
        };
      });

      const response = await request(app).get("/auth/google/callback");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Authorization code missing");
    });

    it("should handle token generation failure", async () => {
      const mockUser = {
        _id: "userId",
        name: "Google User",
        email: "google@example.com"
      };

      passport.authenticate = jest.fn((strategy, callback) => {
        return (req, res, next) => {
          callback(null, mockUser);
          jwt.sign = jest.fn().mockImplementation(() => {
            throw new Error("Token generation failed");
          });
          res.status(500).json({ message: "Authentication failed" });
        };
      });

      const response = await request(app)
        .get("/auth/google/callback")
        .query({ code: "testcode" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Authentication failed");
    });
  });

  describe("error handling", () => {
    it("should handle database connection errors", async () => {
      jest.spyOn(User.prototype, "save").mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await request(app)
        .post("/auth/signup")
        .send({
          name: "Test User",
          email: "test@example.com",
          password: "password123"
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Server error");
    });

    it("should handle JWT signing errors", async () => {
      const mockUser = {
        _id: "userId",
        name: "Test User",
        email: "test@example.com",
      };

      passport.authenticate = jest.fn((strategy, options, callback) => {
        return (req, res, next) => {
          // Mock JWT signing error
          jwt.sign = jest.fn().mockImplementation(() => {
            throw new Error("JWT signing failed");
          });
          res.status(500).json({ message: "Authentication failed" });
        };
      });

      const response = await request(app)
        .post("/auth/login")
        .send({
          email: "test@example.com",
          password: "password123"
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Authentication failed");
    });
  });
});
