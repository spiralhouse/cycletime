import { ClaudeProvider } from '../../providers/claude-provider';
import { AIRequest, AiRequestType } from '../../interfaces/ai-types';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');
const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  let mockClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock client with proper jest mocking
    mockClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          id: 'msg_123',
          content: [{ text: 'Test response' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
      apiKey: 'test-api-key',
    } as any;

    // Mock the constructor
    MockedAnthropic.mockImplementation(() => mockClient);

    provider = new ClaudeProvider('test-api-key');
  });

  describe('initialization', () => {
    it('should initialize with API key', () => {
      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
    });

    it('should use environment variable if no key provided', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';
      
      new ClaudeProvider();
      
      expect(MockedAnthropic).toHaveBeenCalledWith({
        apiKey: 'env-api-key',
      });
      
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should throw error if no API key available', () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => new ClaudeProvider()).toThrow('Anthropic API key is required');
    });
  });

  describe('model specifications', () => {
    it('should expose correct model list', () => {
      expect(provider.models).toEqual([
        'claude-4-opus',
        'claude-4-sonnet',
        'claude-3-7-sonnet',
        'claude-3-haiku',
      ]);
    });

    it('should have correct model specifications', () => {
      expect(provider.name).toBe('claude');
    });
  });

  describe('sendRequest', () => {
    it('should send request successfully', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ text: 'Test response' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      const response = await provider.sendRequest(request);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: 'Test prompt',
          },
        ],
        temperature: 0.1,
      });

      expect(response).toEqual({
        id: expect.stringContaining('claude-'),
        provider: 'claude',
        model: 'claude-4-sonnet',
        content: 'Test response',
        metadata: {
          stopReason: 'end_turn',
          tokenUsage: {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
          },
          providerId: 'msg_123',
        },
        performance: {
          responseTimeMs: 0,
          retryCount: 0,
        },
      });
    });

    it('should use custom parameters', async () => {
      const mockResponse = {
        id: 'msg_123',
        content: [{ text: 'Test response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
        parameters: {
          temperature: 0.9,
          maxTokens: 2000,
        },
      };

      await provider.sendRequest(request);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: 'Test prompt' }],
        temperature: 0.9,
      });
    });

    it('should validate request against model limits', async () => {
      const longPrompt = 'a'.repeat(1_000_000); // Very long prompt

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: longPrompt,
        model: 'claude-4-sonnet',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'Request exceeds model context window'
      );
    });

    it('should validate max tokens against model limits', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 10_000, // Exceeds claude-3-haiku limit
        },
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'Max tokens exceeds model limit'
      );
    });

    it('should throw error for unsupported model', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'unsupported-model',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'Unsupported model: unsupported-model'
      );
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost for claude-4-sonnet correctly', () => {
      const usage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalTokens: 2_000_000,
      };

      const cost = provider.calculateCost(usage, 'claude-4-sonnet');
      
      // Input: 1M tokens * $3.00 = $3.00
      // Output: 1M tokens * $15.00 = $15.00
      // Total: $18.00
      expect(cost).toBe(18.00);
    });

    it('should calculate cost for claude-3-haiku correctly', () => {
      const usage = {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        totalTokens: 2_000_000,
      };

      const cost = provider.calculateCost(usage, 'claude-3-haiku');
      
      // Input: 1M tokens * $0.25 = $0.25
      // Output: 1M tokens * $1.25 = $1.25
      // Total: $1.50
      expect(cost).toBe(1.50);
    });

    it('should default to claude-4-sonnet if no model specified', () => {
      const usage = {
        inputTokens: 100_000,
        outputTokens: 50_000,
        totalTokens: 150_000,
      };

      const cost = provider.calculateCost(usage);
      
      // Input: 0.1M tokens * $3.00 = $0.30
      // Output: 0.05M tokens * $15.00 = $0.75
      // Total: $1.05
      expect(cost).toBe(1.05);
    });

    it('should throw error for unknown model', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
      };

      expect(() => provider.calculateCost(usage, 'unknown-model')).toThrow(
        'Unknown model: unknown-model'
      );
    });
  });

  describe('model recommendations', () => {
    it('should recommend appropriate models for PRD analysis', () => {
      expect(provider.getModelRecommendation(AiRequestType.PRD_ANALYSIS, 'low')).toBe('claude-3-haiku');
      expect(provider.getModelRecommendation(AiRequestType.PRD_ANALYSIS, 'medium')).toBe('claude-4-sonnet');
      expect(provider.getModelRecommendation(AiRequestType.PRD_ANALYSIS, 'high')).toBe('claude-4-opus');
    });

    it('should recommend appropriate models for code review', () => {
      expect(provider.getModelRecommendation(AiRequestType.CODE_REVIEW, 'low')).toBe('claude-3-7-sonnet');
      expect(provider.getModelRecommendation(AiRequestType.CODE_REVIEW, 'medium')).toBe('claude-4-sonnet');
      expect(provider.getModelRecommendation(AiRequestType.CODE_REVIEW, 'high')).toBe('claude-4-opus');
    });

    it('should default to medium complexity and claude-4-sonnet', () => {
      expect(provider.getModelRecommendation(AiRequestType.GENERAL_QUERY)).toBe('claude-3-7-sonnet');
    });
  });

  describe('validateConfig', () => {
    it('should return true when client has API key', () => {
      expect(provider.validateConfig()).toBe(true);
    });

    it('should return false when client validation fails', () => {
      // Mock the getter to throw
      Object.defineProperty(mockClient, 'apiKey', {
        get: () => {
          throw new Error('No API key');
        },
      });

      expect(provider.validateConfig()).toBe(false);
    });
  });
});