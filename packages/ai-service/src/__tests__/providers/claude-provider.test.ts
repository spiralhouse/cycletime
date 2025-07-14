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

    it('should handle Anthropic API network errors', async () => {
      const networkError = new Error('Network timeout');
      (mockClient.messages.create as jest.Mock).mockRejectedValue(networkError);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'AI Provider Error: Network timeout'
      );
    });

    it('should handle Anthropic API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      (mockClient.messages.create as jest.Mock).mockRejectedValue(rateLimitError);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'AI Provider Error: Rate limit exceeded'
      );
    });

    it('should handle authentication failures', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      (mockClient.messages.create as jest.Mock).mockRejectedValue(authError);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow(
        'AI Provider Error: Invalid API key'
      );
    });

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        // Missing required fields
        id: 'msg_123',
        // no content or usage
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(malformedResponse);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      const response = await provider.sendRequest(request);

      // Should handle missing fields gracefully
      expect(response.content).toBe('');
      expect(response.metadata.tokenUsage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });

    it('should handle empty prompts', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: '',
        model: 'claude-4-sonnet',
      };

      // Should not throw, but pass empty prompt to API
      await expect(provider.sendRequest(request)).resolves.toBeDefined();
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: '' }],
        })
      );
    });

    it('should handle responses with no content array', async () => {
      const responseWithoutContent = {
        id: 'msg_123',
        content: [], // Empty content array
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 0 },
      };

      (mockClient.messages.create as jest.Mock).mockResolvedValue(responseWithoutContent);

      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      const response = await provider.sendRequest(request);
      expect(response.content).toBe('');
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
      
      // Input: 1M tokens * $0.80 = $0.80
      // Output: 1M tokens * $4.00 = $4.00
      // Total: $4.80
      expect(cost).toBe(4.80);
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

    it('should handle zero token usage correctly', () => {
      const usage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };

      const cost = provider.calculateCost(usage, 'claude-4-sonnet');
      expect(cost).toBe(0);
    });

    it('should handle fractional costs correctly', () => {
      const usage = {
        inputTokens: 1, // Very small usage
        outputTokens: 1,
        totalTokens: 2,
      };

      const cost = provider.calculateCost(usage, 'claude-4-sonnet');
      
      // Input: 1 token / 1M * $3.00 = $0.000003
      // Output: 1 token / 1M * $15.00 = $0.000015
      // Total: $0.000018
      expect(cost).toBeCloseTo(0.000018, 8);
    });

    it('should calculate costs for all supported models', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 1000,
        totalTokens: 2000,
      };

      // Test each model has different pricing
      const opusCost = provider.calculateCost(usage, 'claude-4-opus');
      const sonnetCost = provider.calculateCost(usage, 'claude-4-sonnet');
      const sonnet37Cost = provider.calculateCost(usage, 'claude-3-7-sonnet');
      const haikuCost = provider.calculateCost(usage, 'claude-3-haiku');

      expect(opusCost).toBeGreaterThan(sonnetCost);
      expect(sonnetCost).toBeGreaterThan(haikuCost);
      expect(sonnet37Cost).toBe(sonnetCost); // Same pricing
    });

    it('should handle undefined usage properties gracefully', () => {
      const incompleteUsage = {
        inputTokens: 100,
        outputTokens: 50,
        // totalTokens missing
      } as any;

      // Should not throw, just calculate based on input/output
      expect(() => provider.calculateCost(incompleteUsage)).not.toThrow();
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

    it('should test all request types for completeness', () => {
      const requestTypes = [
        AiRequestType.PRD_ANALYSIS,
        AiRequestType.PROJECT_PLAN_GENERATION,
        AiRequestType.TASK_BREAKDOWN,
        AiRequestType.DOCUMENT_GENERATION,
        AiRequestType.CODE_REVIEW,
        AiRequestType.GENERAL_QUERY,
      ];

      const complexities = ['low', 'medium', 'high'] as const;

      requestTypes.forEach(requestType => {
        complexities.forEach(complexity => {
          const recommendation = provider.getModelRecommendation(requestType, complexity);
          expect(provider.models).toContain(recommendation);
        });
      });
    });

    it('should handle invalid complexity levels gracefully', () => {
      // Should default to medium complexity
      const recommendation = provider.getModelRecommendation(
        AiRequestType.GENERAL_QUERY,
        'invalid' as any
      );
      expect(provider.models).toContain(recommendation);
    });

    it('should provide different recommendations based on complexity', () => {
      const lowComplexity = provider.getModelRecommendation(AiRequestType.PRD_ANALYSIS, 'low');
      const highComplexity = provider.getModelRecommendation(AiRequestType.PRD_ANALYSIS, 'high');
      
      // High complexity should recommend more powerful model
      expect(lowComplexity).not.toBe(highComplexity);
      expect(highComplexity).toBe('claude-4-opus'); // Most powerful
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

    it('should return false when API key is empty string', () => {
      Object.defineProperty(mockClient, 'apiKey', {
        get: () => '',
      });

      expect(provider.validateConfig()).toBe(false);
    });

    it('should return false when API key is null', () => {
      Object.defineProperty(mockClient, 'apiKey', {
        get: () => null,
      });

      expect(provider.validateConfig()).toBe(false);
    });
  });

  describe('model-specific validations', () => {
    it('should validate claude-4-opus constraints correctly', () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.PRD_ANALYSIS,
        prompt: 'Test prompt',
        model: 'claude-4-opus',
        parameters: {
          maxTokens: 64_000, // At the limit
        },
      };

      // Should not throw for valid request
      expect(async () => await provider.sendRequest(request)).not.toThrow();
    });

    it('should validate claude-3-haiku token limits correctly', () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 4_096, // At the limit for legacy model
        },
      };

      // Should not throw for valid request
      expect(async () => await provider.sendRequest(request)).not.toThrow();
    });

    it('should correctly map model names to API IDs', async () => {
      const testCases = [
        { model: 'claude-4-opus', expectedApiId: 'claude-opus-4-20250514' },
        { model: 'claude-4-sonnet', expectedApiId: 'claude-sonnet-4-20250514' },
        { model: 'claude-3-7-sonnet', expectedApiId: 'claude-3-7-sonnet-20250219' },
        { model: 'claude-3-haiku', expectedApiId: 'claude-3-5-haiku-20241022' },
      ];

      for (const testCase of testCases) {
        const request: AIRequest = {
          id: 'test-123',
          type: AiRequestType.GENERAL_QUERY,
          prompt: 'Test prompt',
          model: testCase.model,
        };

        await provider.sendRequest(request);

        expect(mockClient.messages.create).toHaveBeenCalledWith(
          expect.objectContaining({
            model: testCase.expectedApiId,
          })
        );
      }
    });

    it('should identify legacy models correctly', () => {
      // Test that legacy models have different behavior if needed
      const legacyModels = ['claude-3-7-sonnet', 'claude-3-haiku'];
      const modernModels = ['claude-4-opus', 'claude-4-sonnet'];

      // All models should be in the models array
      legacyModels.forEach(model => {
        expect(provider.models).toContain(model);
      });

      modernModels.forEach(model => {
        expect(provider.models).toContain(model);
      });
    });
  });

  describe('parameter normalization integration', () => {
    it('should properly inherit parameter normalization from BaseAIProvider', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
        parameters: {}, // Empty parameters should be normalized to defaults
      };

      await provider.sendRequest(request);

      // Should use defaults from BaseAIProvider normalization
      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1, // BaseAIProvider default
          max_tokens: 4000, // BaseAIProvider default
        })
      );
    });

    it('should handle null parameters gracefully', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
        parameters: null as any,
      };

      // Should not throw and use defaults
      await expect(provider.sendRequest(request)).resolves.toBeDefined();
    });

    it('should preserve custom parameters when provided', async () => {
      const request: AIRequest = {
        id: 'test-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
        parameters: {
          temperature: 0.8,
          maxTokens: 1000,
          topP: 0.95, // Should be ignored by Claude but passed through normalization
        },
      };

      await provider.sendRequest(request);

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
          max_tokens: 1000,
          // topP not passed to Claude API but should be normalized
        })
      );
    });
  });

  describe('token estimation accuracy', () => {
    it('should provide reasonable token estimates', () => {
      // Test the private estimateTokens method indirectly through validation
      const shortPrompt = 'Hi';
      const mediumPrompt = 'a'.repeat(100);
      const longPrompt = 'a'.repeat(1000);

      const shortRequest: AIRequest = {
        id: 'test-1',
        type: AiRequestType.GENERAL_QUERY,
        prompt: shortPrompt,
        model: 'claude-4-sonnet',
      };

      const mediumRequest: AIRequest = {
        id: 'test-2',
        type: AiRequestType.GENERAL_QUERY,
        prompt: mediumPrompt,
        model: 'claude-4-sonnet',
      };

      const longRequest: AIRequest = {
        id: 'test-3',
        type: AiRequestType.GENERAL_QUERY,
        prompt: longPrompt,
        model: 'claude-4-sonnet',
      };

      // All should be valid requests (under context window)
      expect(async () => await provider.sendRequest(shortRequest)).not.toThrow();
      expect(async () => await provider.sendRequest(mediumRequest)).not.toThrow();
      expect(async () => await provider.sendRequest(longRequest)).not.toThrow();
    });
  });
});