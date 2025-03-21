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

  it("should return 403 for restricted domains", async () => {
    mockReq.body.url = "https://youtube.com/video";
    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "This extension doesn't work on streaming/video websites",
      isRestricted: true,
    });
  });

  it("should return 400 for invalid URL format", async () => {
    mockReq.body.url = "invalid-url";
    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid URL" });
  });

  it("should fallback to Gemini if AI provider is invalid", async () => {
    mockReq.body.aiProvider = "invalid";

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with invalid. Falling back to Gemini.",
      fallback: true,
    });
  });

  it("should handle missing Gemini API key", async () => {
    delete process.env.GEMINI_API_KEY;
    mockReq.body.aiProvider = "gemini";

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with gemini. Falling back to Gemini.",
      fallback: true,
    });
  });

  it("should handle missing Groq API key", async () => {
    delete process.env.GROQ_API_KEY;
    mockReq.body.aiProvider = "llama";

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with llama. Falling back to Gemini.",
      fallback: true,
    });
  });

  it("should save the summary when 'save' is true", async () => {
    const mockSummarySave = jest
      .spyOn(Summary.prototype, "save")
      .mockResolvedValue();

    await summarise(mockReq, mockRes);

    expect(mockSummarySave).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });

    mockSummarySave.mockRestore();
  });

  it("should update an existing summary when 'save' is true", async () => {
    const existingSummary = new Summary({
      user: mockReq.user._id,
      url: mockReq.body.url,
      domain: mockReq.body.domain,
      title: mockReq.body.title,
      text: mockReq.body.text,
      shortSummary: "Old Summary",
      aiProvider_short: "gemini",
    });
    await existingSummary.save();

    await summarise(mockReq, mockRes);

    const updatedSummary = await Summary.findOne({ url: mockReq.body.url });
    expect(updatedSummary.shortSummary).toBe("Generated Summary");
    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });
  });

  it("should delete the least accessed summary if limit exceeds 100", async () => {
    const summaries = Array.from({ length: 101 }, (_, i) => ({
      user: mockReq.user._id,
      url: `https://example.com/${i}`,
      domain: "example.com",
      title: `Example Title ${i}`,
      text: "Test content",
      lastAccessed: new Date(Date.now() - i * 1000),
    }));
    await Summary.insertMany(summaries);

    await summarise(mockReq, mockRes);

    const totalSummaries = await Summary.countDocuments({
      user: mockReq.user._id,
    });
    expect(totalSummaries).toBe(100);
    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });
  });

  it("should not save the summary when 'save' is false", async () => {
    mockReq.body.save = false;

    const mockSummarySave = jest.spyOn(Summary.prototype, "save");
    await summarise(mockReq, mockRes);

    expect(mockSummarySave).not.toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });

    mockSummarySave.mockRestore();
  });

  it("should fallback to Gemini if AI provider is invalid", async () => {
    mockReq.body.aiProvider = "invalid";

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with invalid. Falling back to Gemini.",
      fallback: true,
    });
  });

  it("should return 403 for file summaries if user is on free subscription", async () => {
    mockReq.body.url = "file-summary-test";
    mockReq.user.subscription = "free";

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Upgrade to Premium for file summaries",
      redirectTo: "payment",
    });
  });

  it("should handle file summaries for premium users", async () => {
    mockReq.body.url = "file-summary-test";
    mockReq.user.subscription = "premium";

    await summarise(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      response: "Generated Summary",
    });
  });

  it("should handle errors during summary generation", async () => {
    jest.spyOn(Summary.prototype, "save").mockImplementation(() => {
      throw new Error("Database error");
    });

    await summarise(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Error saving summary" });
  });
});
