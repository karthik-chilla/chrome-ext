const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const {
  getAnalytics,
  getUsers,
  deleteUser,
} = require("../../controllers/Admin");
const User = require("../../models/User");

describe("Admin Controller", () => {
  let app;
  let mongoServer;
  let adminUser;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Close existing connections before creating new one
    await mongoose.disconnect();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});

    // Reset application
    app = express();
    app.use(express.json());

    // Create test data with realistic timestamps
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create admin user first
    adminUser = await User.create({
      name: "Admin User",
      email: "admin@test.com",
      password: "password123",
      role: "super_admin",
      subscription: "premium",
      summaryCount: 0,
      summaryHistory: [],
    });

    // Create regular users with summary data
    await User.insertMany([
      {
        name: "Free User",
        email: "free@test.com",
        password: "password",
        subscription: "free",
        summaryCount: 5,
        summaryHistory: [
          { timestamp: today, domain: "example.com", type: "short" },
          { timestamp: yesterday, domain: "test.com", type: "short" },
        ],
      },
      {
        name: "Premium User",
        email: "premium@test.com",
        password: "password",
        subscription: "premium",
        summaryCount: 10,
        summaryHistory: [
          { timestamp: today, domain: "example.com", type: "long" },
          { timestamp: today, domain: "example.com", type: "long" },
          { timestamp: yesterday, domain: "test.com", type: "long" },
        ],
      },
    ]);
  });

  // Test cases
  describe("getAnalytics", () => {
    it("should return correct analytics data", async () => {
      // Setup route
      app.get(
        "/analytics",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        getAnalytics
      );

      const response = await request(app).get("/analytics");

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("userStats");
      expect(response.body).toHaveProperty("summaryStats");

      // User stats validation
      expect(response.body.userStats).toEqual({
        total: 3,
        free: 1,
        basic: 0,
        premium: 2,
      });

      // Summary stats validation
      const { summaryStats } = response.body;
      expect(summaryStats.total).toBe(15); // Combined summaryCount
      expect(summaryStats.types).toEqual({
        short: 2,
        long: 3,
      });

      // Check domains with hasOwnProperty instead of toHaveProperty
      expect(summaryStats.domains).toBeDefined();
      expect(Object.keys(summaryStats.domains)).toContain("example.com");
      expect(Object.keys(summaryStats.domains)).toContain("test.com");
      expect(summaryStats.domains["example.com"]).toBe(3);
      expect(summaryStats.domains["test.com"]).toBe(2);
    });

    it("should handle errors gracefully", async () => {
      app.get(
        "/analytics",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        getAnalytics
      );

      // Use mockImplementationOnce instead of mockRejectedValueOnce
      jest.spyOn(User, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const response = await request(app).get("/analytics");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error fetching analytics");
    });
  });

  describe("getUsers", () => {
    it("should return list of all users with correct stats", async () => {
      app.get(
        "/users",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        getUsers
      );

      const response = await request(app).get("/users");

      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(3);
      expect(response.body.stats).toEqual({
        total: 3,
        free: 1,
        basic: 0,
        premium: 2, // Including admin user
      });

      // Verify user data structure
      const user = response.body.users.find((u) => u.email === "free@test.com");
      expect(user).toBeTruthy();
      expect(user).toHaveProperty("name", "Free User");
      expect(user).toHaveProperty("email", "free@test.com");
      expect(user).toHaveProperty("subscription", "free");
      expect(user).not.toHaveProperty("password");
    });

    it("should handle database errors", async () => {
      app.get(
        "/users",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        getUsers
      );

      jest.spyOn(User, "find").mockImplementationOnce(() => {
        throw new Error("Database error");
      });

      const response = await request(app).get("/users");

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error fetching users");
    });
  });

  describe("deleteUser", () => {
    it("should successfully delete a regular user", async () => {
      const regularUser = await User.findOne({ email: "free@test.com" });
      expect(regularUser).toBeTruthy();

      app.delete(
        "/users/:userId",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        deleteUser
      );

      const response = await request(app).delete(`/users/${regularUser._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User deleted successfully");

      const deletedUser = await User.findById(regularUser._id);
      expect(deletedUser).toBeNull();
    });

    it("should not allow deleting super admin", async () => {
      app.delete(
        "/users/:userId",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        deleteUser
      );

      const response = await request(app).delete(`/users/${adminUser._id}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Cannot delete Super Admin");

      // Verify admin still exists
      const adminStillExists = await User.findById(adminUser._id);
      expect(adminStillExists).toBeTruthy();
    });

    it("should handle non-existent user", async () => {
      app.delete(
        "/users/:userId",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        deleteUser
      );

      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).delete(`/users/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User not found");
    });

    it("should handle database errors", async () => {
      app.delete(
        "/users/:userId",
        (req, res, next) => {
          req.user = adminUser;
          next();
        },
        deleteUser
      );

      jest
        .spyOn(User, "findById")
        .mockRejectedValueOnce(new Error("Database error"));

      const response = await request(app).delete(
        `/users/${new mongoose.Types.ObjectId()}`
      );

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Error deleting user");
    });
  });
});
