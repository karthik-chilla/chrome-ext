const summarise = require('../../controllers/Summary');
const { Summary, Tag } = require('../../models/Summary');
const User = require('../../models/User');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

jest.mock('../../models/Summary');
jest.mock('../../models/User');
jest.mock('axios');
jest.mock('@google/generative-ai');

describe('summarise', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        _id: 'userId',
        subscription: 'premium',
        role: 'user',
      },
      body: {
        text: 'This is a test text.',
        type: 'short',
        url: 'http://example.com',
        domain: 'example.com',
        title: 'Test Title',
        save: true,
        aiProvider: 'gemini',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    process.env.GEMINI_API_KEY = 'test-gemini-api-key';
    process.env.GROQ_API_KEY = 'test-groq-api-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    req.user = null;

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
  });

  it('should return 403 if user is on free subscription and tries to summarize a file', async () => {
    req.user.subscription = 'free';
    req.body.url = 'file-summary-test';

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Upgrade to Premium for file summaries',
      redirectTo: 'payment',
    });
  });

  it('should return 403 if URL is from a restricted domain', async () => {
    req.body.url = 'http://youtube.com';

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "This extension doesn't work on streaming/video websites",
      isRestricted: true,
    });
  });

  it('should return 400 if URL is invalid', async () => {
    req.body.url = 'invalid-url';

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid URL' });
  });

  it('should generate summary with Gemini and save it', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: { text: jest.fn().mockResolvedValue('Generated summary') },
    });

    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));

    Summary.findOne.mockResolvedValue(null);
    Tag.findOne.mockResolvedValue(null);
    Tag.create.mockResolvedValue({ _id: 'tagId' });
    Summary.countDocuments.mockResolvedValue(50);

    await summarise(req, res);

    expect(mockGenerateContent).toHaveBeenCalled();
    expect(Summary.findOne).toHaveBeenCalled();
    expect(Summary.countDocuments).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ response: 'Generated summary' });
  });

  it('should handle errors during summary generation', async () => {
    const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API Error'));

    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));

    await summarise(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Failed to generate summary with gemini. Falling back to Gemini.',
      fallback: true,
    });
  });
});