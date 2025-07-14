import { AIProviderManager } from '../../services/ai-provider-manager';
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

describe('AIProviderManager', () => {
  let manager: AIProviderManager;
  let claudeProvider: MockAIProvider;
  let openaiProvider: MockAIProvider;

  beforeEach(() => {
    manager = new AIProviderManager();
    claudeProvider = new MockAIProvider('claude', ['claude-4-sonnet', 'claude-3-haiku']);
    openaiProvider = new MockAIProvider('openai', ['gpt-4o', 'gpt-4o-mini']);
  });

  describe('provider registration', () => {
    it('should register a new provider', () => {
      manager.registerProvider(claudeProvider);
      
      const availableProviders = manager.getAvailableProviders();
      expect(availableProviders).toContain('claude');
    });

    it('should register multiple providers', () => {
      manager.registerProvider(claudeProvider);
      manager.registerProvider(openaiProvider);
      
      const availableProviders = manager.getAvailableProviders();
      expect(availableProviders).toEqual(['claude', 'openai']);
    });

    it('should throw error when registering provider with duplicate name', () => {
      manager.registerProvider(claudeProvider);
      
      expect(() => {
        manager.registerProvider(new MockAIProvider('claude', ['different-model']));
      }).toThrow('Provider claude is already registered');
    });
  });

  describe('provider retrieval', () => {
    beforeEach(() => {
      manager.registerProvider(claudeProvider);
      manager.registerProvider(openaiProvider);
    });

    it('should retrieve provider by name', () => {
      const provider = manager.getProvider('claude');
      expect(provider).toBe(claudeProvider);
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        manager.getProvider('unknown-provider');
      }).toThrow('Provider unknown-provider not found');
    });

    it('should return default provider when none specified', () => {
      manager.setDefaultProvider('claude');
      const provider = manager.getProvider();
      expect(provider).toBe(claudeProvider);
    });
  });

  describe('default provider management', () => {
    beforeEach(() => {
      manager.registerProvider(claudeProvider);
    });

    it('should set default provider', () => {
      manager.setDefaultProvider('claude');
      expect(manager.getDefaultProviderName()).toBe('claude');
    });

    it('should throw error when setting unknown provider as default', () => {
      expect(() => {
        manager.setDefaultProvider('unknown-provider');
      }).toThrow('Provider unknown-provider not found');
    });
  });

  describe('request routing', () => {
    beforeEach(() => {
      manager.registerProvider(claudeProvider);
      manager.registerProvider(openaiProvider);
      manager.setDefaultProvider('claude');
    });

    it('should route request to specified provider', async () => {
      const request: AIRequest = {
        id: 'test-req-1',
        provider: 'openai',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt'
      };

      const response = await manager.sendRequest(request);
      
      expect(response.provider).toBe('openai');
      expect(response.content).toBe('Mock response from openai');
    });

    it('should route request to default provider when none specified', async () => {
      const request: AIRequest = {
        id: 'test-req-2',
        type: AiRequestType.PRD_ANALYSIS,
        prompt: 'Analyze this PRD'
      };

      const response = await manager.sendRequest(request);
      
      expect(response.provider).toBe('claude');
      expect(response.content).toBe('Mock response from claude');
    });

    it('should throw error when routing to unknown provider', async () => {
      const request: AIRequest = {
        id: 'test-req-3',
        provider: 'unknown-provider',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt'
      };

      await expect(manager.sendRequest(request)).rejects.toThrow('Provider unknown-provider not found');
    });
  });

  describe('model discovery', () => {
    beforeEach(() => {
      manager.registerProvider(claudeProvider);
      manager.registerProvider(openaiProvider);
    });

    it('should return all available models grouped by provider', () => {
      const models = manager.getAvailableModels();
      
      expect(models).toEqual({
        claude: ['claude-4-sonnet', 'claude-3-haiku'],
        openai: ['gpt-4o', 'gpt-4o-mini']
      });
    });

    it('should return empty object when no providers registered', () => {
      const emptyManager = new AIProviderManager();
      const models = emptyManager.getAvailableModels();
      
      expect(models).toEqual({});
    });
  });

  describe('provider validation', () => {
    it('should validate all registered providers', () => {
      manager.registerProvider(claudeProvider);
      manager.registerProvider(openaiProvider);
      
      const validationResults = manager.validateProviders();
      
      expect(validationResults.claude).toBe(true);
      expect(validationResults.openai).toBe(true);
    });

    it('should return false for invalid provider configurations', () => {
      const invalidProvider = new MockAIProvider('invalid', []);
      invalidProvider.validateConfig = () => false;
      
      manager.registerProvider(invalidProvider);
      
      const validationResults = manager.validateProviders();
      expect(validationResults.invalid).toBe(false);
    });
  });
});