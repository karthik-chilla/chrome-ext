/*const request = require("supertest");
const express = require("express");
const passport = require("passport");
const adminRoutes = require("../../routes/admin");
const {
  getAnalytics,
  getUsers,
  deleteUser,
} = require("../../controllers/Admin");

jest.mock("passport");
jest.mock("../../controllers/Admin");

const app = express();
app.use(express.json());
app.use("/admin", adminRoutes);

describe("Admin Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSuperAdmin = {
    id: "1",
    role: "super_admin",
  };

  const mockRegularUser = {
    id: "2",
    role: "user",
  };

  it("should return analytics data for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    getAnalytics.mockImplementation((req, res) => {
      res.status(200).json({ analytics: "mock data" });
    });

    const res = await request(app).get("/admin/analytics");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("analytics", "mock data");
  });

  it("should return a list of users for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    getUsers.mockImplementation((req, res) => {
      res.status(200).json({ users: ["user1", "user2"] });
    });

    const res = await request(app).get("/admin/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body.users).toEqual(["user1", "user2"]);
  });

  it("should delete a user for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    deleteUser.mockImplementation((req, res) => {
      res.status(200).json({ message: "User deleted" });
    });

    const res = await request(app).delete("/admin/users/123");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "User deleted");
  });

  it("should return 403 for unauthorized access", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockRegularUser; // Simulate a non-super-admin user
        next();
      }
    );

    const res = await request(app).get("/admin/analytics");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Unauthorized access" });
  });
});
*/

const request = require("supertest");
const express = require("express");
const passport = require("passport");
const adminRoutes = require("../../routes/admin");
const {
  getAnalytics,
  getUsers,
  deleteUser,
} = require("../../controllers/Admin");

jest.mock("passport");
jest.mock("../../controllers/Admin", () => ({
  getAnalytics: jest.fn((req, res) =>
    res.status(200).json({ analytics: "mock data" })
  ),
  getUsers: jest.fn((req, res) =>
    res.status(200).json({ users: ["user1", "user2"] })
  ),
  deleteUser: jest.fn((req, res) =>
    res.status(200).json({ message: "User deleted" })
  ),
}));

const app = express();
app.use(express.json());
app.use("/admin", adminRoutes);

describe("Admin Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSuperAdmin = {
    id: "1",
    role: "super_admin",
  };

  const mockRegularUser = {
    id: "2",
    role: "user",
  };

  it("should return analytics data for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    getAnalytics.mockImplementation((req, res) => {
      res.status(200).json({ analytics: "mock data" });
    });

    const res = await request(app).get("/admin/analytics");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("analytics", "mock data");
  });

  it("should return a list of users for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    getUsers.mockImplementation((req, res) => {
      res.status(200).json({ users: ["user1", "user2"] });
    });

    const res = await request(app).get("/admin/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body.users).toEqual(["user1", "user2"]);
  });

  it("should delete a user for super admin", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockSuperAdmin;
        next();
      }
    );

    deleteUser.mockImplementation((req, res) => {
      res.status(200).json({ message: "User deleted" });
    });

    const res = await request(app).delete("/admin/users/123");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "User deleted");
  });

  it("should return 403 for unauthorized access", async () => {
    passport.authenticate.mockImplementation(
      (strategy, options) => (req, res, next) => {
        req.user = mockRegularUser; // Simulate a non-super-admin user
        next();
      }
    );

    const res = await request(app).get("/admin/analytics");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Unauthorized access" });
  });
});
