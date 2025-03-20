const request = require("supertest");
const app = require("../../index.js"); // Your Express app
const passport = require("passport");

// Mock chat controller
jest.mock("../../controllers/Chat", () => ({
  chatWithPage: jest.fn((req, res) =>
    res.json({ response: "Mock AI response" })
  ),
}));

// Mock Passport authentication
jest.mock("passport", () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { _id: "123", role: "super_admin", subscription: "premium" }; // Default mock user
    next();
  }),
}));

describe("Chat Routes", () => {
  it("should return 403 for non-premium users", async () => {
    passport.authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { subscription: "free", role: "user" }; // Non-premium user
      next();
    });

    const res = await request(app).post("/chat").send({
      message: "What is the content about?",
      pageContent: "This is some page content.",
      url: "http://example.com",
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Premium subscription required");
  });

  it("should allow premium users to access the chat", async () => {
    passport.authenticate.mockImplementation(() => (req, res, next) => {
      req.user = { subscription: "premium", role: "user" }; // Premium user
      next();
    });

    const res = await request(app).post("/chat").send({
      message: "What is the content about?",
      pageContent: "This is some page content.",
      url: "http://example.com",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.response).toBe("Mock AI response");
  });
});
