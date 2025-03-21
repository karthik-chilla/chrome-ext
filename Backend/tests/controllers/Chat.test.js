const request = require("supertest");
const chatWithPage = require("../../controllers/Chat.js");

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: jest.fn().mockResolvedValue("AI response") },
      }),
    }),
  })),
}));

describe("Chat Controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {
        message: "Hello",
        pageContent: "Sample page content",
        url: "https://example.com",
      },
      user: { _id: "123456" },
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it("should return AI-generated response", async () => {
    const mockGenerateContent = {
      response: { text: jest.fn().mockResolvedValue("AI response") },
    };

    require("@google/generative-ai").GoogleGenerativeAI.mockImplementation(
      () => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockResolvedValue(mockGenerateContent),
        }),
      })
    );

    await chatWithPage(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      response: "<p>AI response</p>\n", // Adjusted to match Markdown-to-HTML conversion
    });
  });

  it("should handle errors", async () => {
    require("@google/generative-ai").GoogleGenerativeAI.mockImplementation(
      () => ({
        getGenerativeModel: () => ({
          generateContent: jest.fn().mockRejectedValue(new Error("API Error")),
        }),
      })
    );

    await chatWithPage(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledTimes(1); // Ensure status is called
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Error processing chat request",
    });
  });
});
