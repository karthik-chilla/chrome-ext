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
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Mock console.error to suppress error logs
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }

    // Restore console.error after tests
    console.error.mockRestore();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    app = express();
    app.use(express.json());
    app.use(passport.initialize());

    // Setup routes
    app.post("/auth/signup", signup);
    app.post("/auth/login", login);
    app.get("/auth/logout", logout);
    app.get(
      "/auth/status",
      (req, res, next) => {
        req.user = {
          _id: "userId",
          name: "Test User",
          email: "test@example.com",
          picture: "test.jpg",
          role: "user",
          subscription: "free",
        };
        next();
      },
      getStatus
    );
    app.get("/auth/google/callback", handleGoogleCallback);
  });

  describe("signup", () => {
    it("should not allow duplicate email signup", async () => {
      await User.create({
        name: "Existing User",
        email: "test@example.com",
        password: "password123",
      });

      const response = await request(app).post("/auth/signup").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User already exists");
    });

    it("should handle server errors", async () => {
      jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const response = await request(app).post("/auth/signup").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Server error");
    });
  });

  describe("login", () => {
    it("should handle server errors", async () => {
      jest.spyOn(passport, "authenticate").mockImplementationOnce(() => {
        throw new Error("Server error");
      });

      const response = await request(app).post("/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Server error");
    });
  });

  describe("logout", () => {
    it("should log out a user successfully", async () => {
      const response = await request(app).get("/auth/logout");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logged out successfully");
    });
  });

  describe("getStatus", () => {
    it("should return the authenticated user's status", async () => {
      const response = await request(app).get("/auth/status");

      expect(response.status).toBe(200);
      expect(response.body.isAuthenticated).toBe(true);
      expect(response.body.user).toHaveProperty("email", "test@example.com");
    });
  });

  describe("handleGoogleCallback", () => {
    it("should handle errors during Google callback", async () => {
      jest.spyOn(jwt, "sign").mockImplementationOnce(() => {
        throw new Error("Google callback error");
      });

      const response = await request(app).get("/auth/google/callback");

      expect(response.status).toBe(500);
      expect(response.text).toBe("Authentication failed");
    });
  });
});
