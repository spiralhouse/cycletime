import { ProviderRegistry } from '../../services/provider-registry';
import { AIProvider, AIRequest, AIResponse, AiRequestType } from '../../interfaces/ai-types';

// Mock AI Provider for testing
class MockAIProvider implements AIProvider {
  name: string;
  models: string[];

  constructor(name: string, models: string[]) {
    this.name = name;
    this.models = models;
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    return {
      id: request.id,
      provider: this.name,
      model: request.model || this.models[0],
      content: `Mock response from ${this.name}`,
      metadata: {
        stopReason: 'end_turn',
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        providerId: `${this.name}-msg-123`
      },
      performance: {
        responseTimeMs: 500,
        retryCount: 0
      }
    };
  }

  calculateCost(): number {
    return 0.01;
  }

  validateConfig(): boolean {
    return true;
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;
  let claudeProvider: MockAIProvider;
  let openaiProvider: MockAIProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    claudeProvider = new MockAIProvider('claude', ['claude-4-sonnet', 'claude-3-haiku']);
    openaiProvider = new MockAIProvider('openai', ['gpt-4o', 'gpt-4o-mini']);
  });

  describe('provider discovery', () => {
    it('should discover and register providers automatically', () => {
      const providers = [claudeProvider, openaiProvider];
      
      registry.discoverProviders(providers);
      
      const discovered = registry.getDiscoveredProviders();
      expect(discovered).toHaveLength(2);
      expect(discovered.map(p => p.name)).toEqual(['claude', 'openai']);
    });

    it('should validate providers during discovery', () => {
      const invalidProvider = new MockAIProvider('invalid', []);
      invalidProvider.validateConfig = () => false;
      
      const providers = [claudeProvider, invalidProvider];
      
      const results = registry.discoverProviders(providers);
      
      expect(results.valid).toHaveLength(1);
      expect(results.invalid).toHaveLength(1);
      expect(results.valid[0].name).toBe('claude');
      expect(results.invalid[0].provider).toBe('invalid');
    });
  });

  describe('provider capabilities', () => {
    beforeEach(() => {
      registry.discoverProviders([claudeProvider, openaiProvider]);
    });

    it('should get provider capabilities summary', () => {
      const capabilities = registry.getProviderCapabilities();
      
      expect(capabilities).toEqual({
        claude: {
          name: 'claude',
          models: ['claude-4-sonnet', 'claude-3-haiku'],
          isValid: true,
          modelCount: 2
        },
        openai: {
          name: 'openai', 
          models: ['gpt-4o', 'gpt-4o-mini'],
          isValid: true,
          modelCount: 2
        }
      });
    });

    it('should find providers supporting specific models', () => {
      const claudeProviders = registry.findProvidersWithModel('claude-4-sonnet');
      const gptProviders = registry.findProvidersWithModel('gpt-4o');
      const noProviders = registry.findProvidersWithModel('nonexistent-model');
      
      expect(claudeProviders).toHaveLength(1);
      expect(claudeProviders[0].name).toBe('claude');
      
      expect(gptProviders).toHaveLength(1);
      expect(gptProviders[0].name).toBe('openai');
      
      expect(noProviders).toHaveLength(0);
    });
  });

  describe('provider recommendation', () => {
    beforeEach(() => {
      registry.discoverProviders([claudeProvider, openaiProvider]);
    });

    it('should recommend provider for request type', () => {
      const recommendation = registry.recommendProvider(AiRequestType.PRD_ANALYSIS);
      
      expect(recommendation).toBeDefined();
      expect(['claude', 'openai']).toContain(recommendation!.name);
    });

    it('should return null when no providers available', () => {
      const emptyRegistry = new ProviderRegistry();
      const recommendation = emptyRegistry.recommendProvider(AiRequestType.PRD_ANALYSIS);
      
      expect(recommendation).toBeNull();
    });

    it('should recommend provider based on complexity', () => {
      const simpleRecommendation = registry.recommendProviderForComplexity('low');
      const complexRecommendation = registry.recommendProviderForComplexity('high');
      
      expect(simpleRecommendation).toBeDefined();
      expect(complexRecommendation).toBeDefined();
      
      // Should return valid provider names
      expect(['claude', 'openai']).toContain(simpleRecommendation!.name);
      expect(['claude', 'openai']).toContain(complexRecommendation!.name);
    });
  });

  describe('provider health checking', () => {
    beforeEach(() => {
      registry.discoverProviders([claudeProvider, openaiProvider]);
    });

    it('should check health of all providers', async () => {
      const healthResults = await registry.checkProviderHealth();
      
      expect(healthResults).toEqual({
        claude: { healthy: true, latency: expect.any(Number) },
        openai: { healthy: true, latency: expect.any(Number) }
      });
    });

    it('should detect unhealthy providers', async () => {
      // Create a provider that validates during discovery but fails during health check
      const unhealthyProvider = new MockAIProvider('unhealthy', ['model']);
      let healthCheckCall = false;
      unhealthyProvider.validateConfig = () => {
        if (!healthCheckCall) {
          healthCheckCall = true;
          return true; // Pass initial discovery
        }
        throw new Error('Configuration error'); // Fail during health check
      };
      
      registry.discoverProviders([claudeProvider, unhealthyProvider]);
      
      const healthResults = await registry.checkProviderHealth();
      
      expect(healthResults.claude.healthy).toBe(true);
      expect(healthResults.unhealthy.healthy).toBe(false);
      expect(healthResults.unhealthy.error).toBe('Configuration error');
    });
  });

  describe('integration with AIProviderManager', () => {
    it('should integrate discovered providers with manager', () => {
      registry.discoverProviders([claudeProvider, openaiProvider]);
      
      const manager = registry.createProviderManager();
      
      expect(manager.getAvailableProviders()).toEqual(['claude', 'openai']);
    });

    it('should set recommended default provider', () => {
      registry.discoverProviders([claudeProvider, openaiProvider]);
      
      const manager = registry.createProviderManager();
      
      expect(manager.getDefaultProviderName()).toBeDefined();
      expect(['claude', 'openai']).toContain(manager.getDefaultProviderName()!);
    });
  });
});