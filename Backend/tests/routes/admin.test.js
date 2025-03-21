const request = require("supertest");
const express = require("express");
const passport = require("passport");
const adminRoutes = require("../../routes/admin");
const { getAnalytics, getUsers, deleteUser } = require("../../controllers/Admin");

jest.mock("../../controllers/Admin", () => ({
  getAnalytics: jest.fn((req, res) => res.json({ message: "Analytics data" })),
  getUsers: jest.fn((req, res) => res.json({ users: [], stats: {} })),
  deleteUser: jest.fn((req, res) => res.json({ message: "User deleted" })),
}));

jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { role: "super_admin" }; // Mock authenticated super admin user
    next();
  }),
}));

describe("Admin Routes", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/admin", adminRoutes);
  });

  it("should return analytics data for super admin", async () => {
    const response = await request(app).get("/admin/analytics");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Analytics data" });
    expect(getAnalytics).toHaveBeenCalled();
  });

  it("should return users data for super admin", async () => {
    const response = await request(app).get("/admin/users");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ users: [], stats: {} });
    expect(getUsers).toHaveBeenCalled();
  });

  it("should delete a user for super admin", async () => {
    const response = await request(app).delete("/admin/users/123");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "User deleted" });
    expect(deleteUser).toHaveBeenCalledWith(
      expect.objectContaining({ params: { userId: "123" } }),
      expect.any(Object)
    );
  });

  it("should return 403 for unauthorized access", async () => {
    passport.authenticate.mockImplementationOnce(() => (req, res, next) => {
      req.user = { role: "regular_user" }; // Mock non-super admin user
      next();
    });

    const response = await request(app).get("/admin/analytics");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Unauthorized access" });
  });
});
