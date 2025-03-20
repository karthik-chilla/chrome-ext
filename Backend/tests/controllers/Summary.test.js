const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Summary, Tag } = require("../../models/Summary");
const User = require("../../models/User");
const summarise = require("../../controllers/Summary.js");

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(Promise.resolve("Generated Summary")),
        },
      }),
    }),
  })),
}));

describe("Summary Controller", () => {
  let mongoServer;
  let mockReq;
  let mockRes;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: new mongoose.Types.ObjectId(), subscription: "premium" },
      body: {
        text: "This is a test summary content.",
        type: "short",
        url: "https://example.com",
        domain: "example.com",
        title: "Example Title",
        save: true,
        aiProvider: "gemini",
      },
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it("should return a generated summary", async () => {
    await summarise(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });
  });

  it("should return 401 if user is not authenticated", async () => {
    mockReq.user = null;
    await summarise(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  it("should handle an invalid URL", async () => {
    mockReq.body.url = "invalid_url";
    await summarise(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid URL" });
  });

  it("should return an error when AI provider is incorrect", async () => {
    mockReq.body.aiProvider = "invalid";
    await summarise(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with invalid. Falling back to Gemini.",
      fallback: true,
    });
  });

  it("should return 403 if summarizing a restricted domain", async () => {
    mockReq.body.url = "https://youtube.com/video";
    await summarise(mockReq, mockRes);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "This extension doesn't work on streaming/video websites",
      isRestricted: true,
    });
  });
});
