import { BaseAIProvider } from '../../providers/base-ai-provider';
import { AIRequest, AIResponse, AiRequestType, TokenUsage } from '../../interfaces/ai-types';

// Test implementation of BaseAIProvider for testing purposes
class TestAIProvider extends BaseAIProvider {
  name = 'test-provider';
  models = ['test-model-1', 'test-model-2'];

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    return {
      id: request.id,
      provider: this.name,
      model: request.model || 'test-model-1',
      content: 'Test response content',
      metadata: {
        stopReason: 'end_turn',
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        providerId: 'test-msg-123'
      },
      performance: {
        responseTimeMs: 1000,
        retryCount: 0
      }
    };
  }

  calculateCost(usage: TokenUsage, _model?: string): number {
    // Simple test calculation: $0.01 per 1000 tokens
    return (usage.totalTokens / 1000) * 0.01;
  }

  validateConfig(): boolean {
    return true;
  }
}

describe('BaseAIProvider', () => {
  let provider: TestAIProvider;

  beforeEach(() => {
    provider = new TestAIProvider();
  });

  describe('abstract class implementation', () => {
    it('should require name property', () => {
      expect(provider.name).toBe('test-provider');
    });

    it('should require models array', () => {
      expect(provider.models).toEqual(['test-model-1', 'test-model-2']);
      expect(Array.isArray(provider.models)).toBe(true);
    });

    it('should implement sendRequest method', async () => {
      const request: AIRequest = {
        id: 'test-req-1',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt'
      };

      const response = await provider.sendRequest(request);
      
      expect(response.id).toBe(request.id);
      expect(response.provider).toBe('test-provider');
      expect(response.content).toBeTruthy();
      expect(response.metadata.tokenUsage.totalTokens).toBeGreaterThan(0);
    });

    it('should implement calculateCost method', () => {
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500
      };

      const cost = provider.calculateCost(usage);
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });

    it('should implement validateConfig method', () => {
      const isValid = provider.validateConfig();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('normalizeRequest', () => {
    it('should provide protected normalizeRequest method', () => {
      // This tests that the protected method exists and can be used by subclasses
      expect(typeof (provider as any).normalizeRequest).toBe('function');
    });
  });

  describe('normalizeResponse', () => {
    it('should provide protected normalizeResponse method', () => {
      // This tests that the protected method exists and can be used by subclasses
      expect(typeof (provider as any).normalizeResponse).toBe('function');
    });
  });

  describe('handleError', () => {
    it('should provide protected handleError method', () => {
      // This tests that the protected method exists and can be used by subclasses
      expect(typeof (provider as any).handleError).toBe('function');
    });
  });
});