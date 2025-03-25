const summarise = require("../../controllers/Summary");

const { Summary, Tag } = require("../../models/Summary");

const User = require("../../models/User");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const axios = require("axios");

jest.mock("../../models/Summary");

jest.mock("../../models/User");

jest.mock("@google/generative-ai");

jest.mock("axios");

describe("summarise controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        _id: "user123",

        subscription: "free",

        role: "user",

        summaryCount: 0,

        summaryHistory: [],
      },

      body: {
        text: "Sample text for summarization",

        type: "short",

        url: "http://example.com",

        domain: "example.com",

        title: "Sample Title",

        save: false,

        aiProvider: "gemini",
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),

      json: jest.fn(),
    };

    Summary.findOne.mockImplementation(() => ({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(null),
    }));

    Summary.prototype.save = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    req.user = null;

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(401);

    expect(res.json).toHaveBeenCalledWith({ error: "Not authenticated" });
  });

  it("should generate a summary with Gemini and return it", async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: { text: () => "Generated short summary" },
    });

    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    }));

    await summarise(req, res);

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining("Summarize the following content")
    );

    expect(res.json).toHaveBeenCalledWith({
      response: "Generated short summary",
    });
  });

  it("should generate a summary with Groq and return it", async () => {
    req.body.aiProvider = "gemma";

    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: "Groq generated summary" } }] },
    });

    await summarise(req, res);

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://api.groq.com/openai/v1/chat/completions"
      ),

      expect.objectContaining({
        model: "gemma2-9b-it",
      }),

      expect.any(Object)
    );

    expect(res.json).toHaveBeenCalledWith({
      response: "Groq generated summary",
    });
  });

  it("should handle Groq API errors and return a fallback message", async () => {
    req.body.aiProvider = "gemma";

    axios.post.mockRejectedValue(new Error("Groq API error"));

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with gemma. Falling back to Gemini.",

      fallback: true,
    });
  });

  it("should handle invalid AI provider", async () => {
    req.body.aiProvider = "invalid";

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({
      error: "Failed to generate summary with invalid. Falling back to Gemini.",

      fallback: true,
    });
  });

  it("should save the summary and update user data when save is true", async () => {
    req.body.save = true;
    req.body.response = "Existing summary";
    Summary.findOne.mockResolvedValue(null);
    Tag.findOne.mockResolvedValue(null);
    Tag.create.mockResolvedValue({ _id: "tag123" });
    Summary.prototype.save.mockResolvedValue({});
    User.findByIdAndUpdate.mockResolvedValue({});
    Summary.countDocuments.mockResolvedValue(1);
    await summarise(req, res);
    expect(Summary.prototype.save).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ response: "Existing summary" });
  });

  it("should update an existing summary if found when saving", async () => {
    req.body.save = true;

    req.body.response = "Updated summary";

    Summary.findOne.mockResolvedValue({
      _id: "summary123",

      save: jest.fn().mockResolvedValue({}),
    });

    Tag.findOne.mockResolvedValue(null);

    Tag.create.mockResolvedValue({ _id: "tag123" });

    User.findByIdAndUpdate.mockResolvedValue({});

    Summary.countDocuments.mockResolvedValue(1);

    await summarise(req, res);

    expect(Summary.prototype.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({ response: "Updated summary" });
  });

  it("should handle summary saving errors", async () => {
    req.body.save = true;

    req.body.response = "Existing summary";

    Summary.findOne.mockRejectedValue(new Error("Database error"));

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(500);

    expect(res.json).toHaveBeenCalledWith({ error: "Error saving summary" });
  });

  it("should delete the least used summary if the total summaries exceed 100", async () => {
    req.body.save = true;

    req.body.response = "Existing summary";

    Summary.findOne
      .mockResolvedValueOnce(null) // First call for checking existing summary
      .mockImplementationOnce(() => ({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({ _id: "leastUsedSummary" }),
      }));
    Summary.countDocuments.mockResolvedValue(101);
    Summary.findByIdAndDelete.mockResolvedValue({});

    await summarise(req, res);

    expect(Summary.findByIdAndDelete).toHaveBeenCalledWith("leastUsedSummary");

    expect(res.json).toHaveBeenCalledWith({ response: "Existing summary" });
  });

  it("should return 403 for file summary with free subscription", async () => {
    req.body.url = "file-summary-123";

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      error: "Upgrade to Premium for file summaries",

      redirectTo: "payment",
    });
  });

  it("should return 403 for restricted web domains", async () => {
    req.body.url = "https://youtube.com/video";

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(403);

    expect(res.json).toHaveBeenCalledWith({
      error: "This extension doesn't work on streaming/video websites",

      isRestricted: true,
    });
  });

  it("should handle invalid URL", async () => {
    req.body.url = "invalid-url";

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({ error: "Invalid URL" });
  });

  it("should handle errors during tag generation", async () => {
    req.body.save = true;

    req.body.response = "Existing summary";

    Summary.findOne.mockResolvedValue(null);

    Tag.findOne.mockRejectedValue(new Error("Tag error"));

    Summary.prototype.save.mockResolvedValue({});

    await summarise(req, res);

    expect(Summary.prototype.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ response: "Existing summary" });
  });

  it("should save summary with empty tags when tag generation fails", async () => {
    req.body.save = true;
    req.body.response = "Existing summary";

    Summary.findOne.mockResolvedValue(null);
    Tag.findOne.mockRejectedValue(new Error("Tag error"));
    Summary.prototype.save.mockResolvedValue({});

    await summarise(req, res);

    const savedSummary = Summary.prototype.save.mock.calls[0][0] || {};
    expect(savedSummary.tags).toEqual([]);
  });
});
