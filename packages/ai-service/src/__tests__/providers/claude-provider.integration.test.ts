import { ClaudeProvider } from '../../providers/claude-provider';
import { AIRequest, AiRequestType } from '../../interfaces/ai-types';

describe('ClaudeProvider Integration Tests', () => {
  let provider: ClaudeProvider;
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    if (hasApiKey) {
      provider = new ClaudeProvider();
    }
  });

  describe('Real API Integration', () => {
    it('should validate API key configuration', () => {
      if (!hasApiKey) {
        console.log('Skipping API key validation test - no ANTHROPIC_API_KEY provided');
        return;
      }
      expect(provider.validateConfig()).toBe(true);
    });

    it('should successfully call Anthropic API', async () => {
      if (!hasApiKey) {
        console.log('Skipping API integration test - no ANTHROPIC_API_KEY provided');
        return;
      }
      const request: AIRequest = {
        id: 'integration-test-1',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Hello! Please respond with exactly "Integration test successful"',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 50,
          temperature: 0.1,
        },
      };

      const response = await provider.sendRequest(request);

      expect(response).toBeDefined();
      expect(response.id).toContain('claude-');
      expect(response.provider).toBe('claude');
      expect(response.model).toBe('claude-3-haiku');
      expect(response.content).toBeTruthy();
      expect(response.metadata.tokenUsage.inputTokens).toBeGreaterThan(0);
      expect(response.metadata.tokenUsage.outputTokens).toBeGreaterThan(0);
      expect(response.metadata.providerId).toBeTruthy();
    }, 30000); // 30 second timeout for API calls

    it('should handle all supported models', async () => {
      if (!hasApiKey) {
        console.log('Skipping model support test - no ANTHROPIC_API_KEY provided');
        return;
      }
      
      const models = provider.models;
      
      // Test at least one model to verify API connectivity
      const request: AIRequest = {
        id: 'integration-test-2',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Say "OK"',
        model: 'claude-3-haiku', // Use cheapest model for testing
        parameters: {
          maxTokens: 10,
          temperature: 0,
        },
      };

      const response = await provider.sendRequest(request);
      
      expect(response.content.toLowerCase()).toContain('ok');
      expect(models).toContain('claude-3-haiku');
      expect(models).toContain('claude-4-sonnet');
      expect(models).toContain('claude-4-opus');
      expect(models).toContain('claude-3-7-sonnet');
    }, 30000);

    it('should calculate accurate costs', async () => {
      if (!hasApiKey) {
        console.log('Skipping cost calculation test - no ANTHROPIC_API_KEY provided');
        return;
      }
      
      const request: AIRequest = {
        id: 'integration-test-3',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Count to 5',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 20,
          temperature: 0,
        },
      };

      const response = await provider.sendRequest(request);
      const cost = provider.calculateCost(response.metadata.tokenUsage, 'claude-3-haiku');
      
      // Cost should be positive and reasonable (under $0.01 for small request)
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01);
      
      // Verify cost calculation accuracy
      const expectedInputCost = (response.metadata.tokenUsage.inputTokens / 1_000_000) * 0.80;
      const expectedOutputCost = (response.metadata.tokenUsage.outputTokens / 1_000_000) * 4.00;
      const expectedTotal = expectedInputCost + expectedOutputCost;
      
      expect(cost).toBeCloseTo(expectedTotal, 8);
    }, 30000);

    it('should handle API errors gracefully', async () => {
      if (!hasApiKey) {
        console.log('Skipping API error handling test - no ANTHROPIC_API_KEY provided');
        return;
      }
      
      const request: AIRequest = {
        id: 'integration-test-4',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'a'.repeat(300_000), // Extremely long prompt to trigger error
        model: 'claude-3-haiku',
      };

      await expect(provider.sendRequest(request)).rejects.toThrow();
    }, 30000);

    it('should validate request constraints', async () => {
      if (!hasApiKey) {
        console.log('Skipping request constraint validation test - no ANTHROPIC_API_KEY provided');
        return;
      }
      
      // Test max tokens validation
      const request: AIRequest = {
        id: 'integration-test-5',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Hello',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 10_000, // Exceeds claude-3-haiku limit
        },
      };

      await expect(provider.sendRequest(request)).rejects.toThrow('Max tokens exceeds model limit');
    });
  });

  describe('Model Recommendations', () => {
    it('should provide appropriate model recommendations for different scenarios', () => {
      if (!hasApiKey) {
        // Create provider without API key for testing recommendations
        process.env.ANTHROPIC_API_KEY = 'test-key';
        provider = new ClaudeProvider();
        delete process.env.ANTHROPIC_API_KEY;
      }

      // Test all request types and complexities
      const testCases = [
        { type: AiRequestType.PRD_ANALYSIS, complexity: 'high' as const, expected: 'claude-4-opus' },
        { type: AiRequestType.PRD_ANALYSIS, complexity: 'medium' as const, expected: 'claude-4-sonnet' },
        { type: AiRequestType.PRD_ANALYSIS, complexity: 'low' as const, expected: 'claude-3-haiku' },
        { type: AiRequestType.CODE_REVIEW, complexity: 'high' as const, expected: 'claude-4-opus' },
        { type: AiRequestType.CODE_REVIEW, complexity: 'medium' as const, expected: 'claude-4-sonnet' },
        { type: AiRequestType.CODE_REVIEW, complexity: 'low' as const, expected: 'claude-3-7-sonnet' },
        { type: AiRequestType.GENERAL_QUERY, complexity: 'low' as const, expected: 'claude-3-haiku' },
      ];

      testCases.forEach(({ type, complexity, expected }) => {
        const recommendation = provider.getModelRecommendation(type, complexity);
        expect(recommendation).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key gracefully', () => {
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => new ClaudeProvider()).toThrow('Anthropic API key is required');
    });

    it('should validate unsupported models', () => {
      if (!hasApiKey) {
        process.env.ANTHROPIC_API_KEY = 'test-key';
        provider = new ClaudeProvider();
        delete process.env.ANTHROPIC_API_KEY;
      }

      const request: AIRequest = {
        id: 'test-invalid-model',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Hello',
        model: 'invalid-model',
      };

      expect(provider.sendRequest(request)).rejects.toThrow('Unsupported model: invalid-model');
    });
  });

  describe('Performance', () => {
    it('should respond within reasonable time limits', async () => {
      if (!hasApiKey) {
        console.log('Skipping performance test - no ANTHROPIC_API_KEY provided');
        return;
      }
      
      const startTime = Date.now();
      
      const request: AIRequest = {
        id: 'performance-test',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Hello',
        model: 'claude-3-haiku',
        parameters: {
          maxTokens: 10,
          temperature: 0,
        },
      };

      const response = await provider.sendRequest(request);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response).toBeDefined();
      expect(duration).toBeLessThan(15000); // Should respond within 15 seconds
    }, 20000);
  });
});