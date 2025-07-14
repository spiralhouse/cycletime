import { AIProvider, AiRequestType } from '../interfaces/ai-types';
import { AIProviderManager } from './ai-provider-manager';

export interface ProviderDiscoveryResult {
  valid: AIProvider[];
  invalid: Array<{ provider: string; error: string }>;
}

export interface ProviderCapability {
  name: string;
  models: string[];
  isValid: boolean;
  modelCount: number;
}

export interface ProviderHealthResult {
  healthy: boolean;
  latency: number;
  error?: string;
}

/**
 * Registry for discovering, validating, and managing AI providers
 */
export class ProviderRegistry {
  private discoveredProviders: AIProvider[] = [];

  /**
   * Discover and validate providers
   */
  discoverProviders(providers: AIProvider[]): ProviderDiscoveryResult {
    const valid: AIProvider[] = [];
    const invalid: Array<{ provider: string; error: string }> = [];

    for (const provider of providers) {
      try {
        if (provider.validateConfig()) {
          valid.push(provider);
        } else {
          invalid.push({
            provider: provider.name,
            error: 'Configuration validation failed'
          });
        }
      } catch (error) {
        invalid.push({
          provider: provider.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.discoveredProviders = valid;
    return { valid, invalid };
  }

  /**
   * Get all discovered providers
   */
  getDiscoveredProviders(): AIProvider[] {
    return [...this.discoveredProviders];
  }

  /**
   * Get provider capabilities summary
   */
  getProviderCapabilities(): Record<string, ProviderCapability> {
    const capabilities: Record<string, ProviderCapability> = {};

    for (const provider of this.discoveredProviders) {
      capabilities[provider.name] = {
        name: provider.name,
        models: provider.models,
        isValid: provider.validateConfig(),
        modelCount: provider.models.length
      };
    }

    return capabilities;
  }

  /**
   * Find providers that support a specific model
   */
  findProvidersWithModel(model: string): AIProvider[] {
    return this.discoveredProviders.filter(provider =>
      provider.models.includes(model)
    );
  }

  /**
   * Recommend provider for request type
   */
  recommendProvider(requestType: AiRequestType): AIProvider | null {
    if (this.discoveredProviders.length === 0) {
      return null;
    }

    // Simple recommendation logic - prefer Claude for complex tasks
    const preferredProviders = {
      [AiRequestType.PRD_ANALYSIS]: ['claude', 'openai'],
      [AiRequestType.PROJECT_PLAN_GENERATION]: ['claude', 'openai'],
      [AiRequestType.TASK_BREAKDOWN]: ['claude', 'openai'],
      [AiRequestType.DOCUMENT_GENERATION]: ['claude', 'openai'],
      [AiRequestType.CODE_REVIEW]: ['openai', 'claude'],
      [AiRequestType.GENERAL_QUERY]: ['claude', 'openai']
    };

    const preferences = preferredProviders[requestType];
    
    for (const preferredName of preferences) {
      const provider = this.discoveredProviders.find(p => p.name === preferredName);
      if (provider) {
        return provider;
      }
    }

    // Fallback to first available provider
    return this.discoveredProviders[0];
  }

  /**
   * Recommend provider based on complexity
   */
  recommendProviderForComplexity(complexity: 'low' | 'medium' | 'high'): AIProvider | null {
    if (this.discoveredProviders.length === 0) {
      return null;
    }

    // Complexity-based recommendations
    const complexityPreferences = {
      low: ['openai', 'claude'],      // Faster/cheaper models first
      medium: ['claude', 'openai'],   // Balanced
      high: ['claude', 'openai']      // Most capable models first
    };

    const preferences = complexityPreferences[complexity];
    
    for (const preferredName of preferences) {
      const provider = this.discoveredProviders.find(p => p.name === preferredName);
      if (provider) {
        return provider;
      }
    }

    return this.discoveredProviders[0];
  }

  /**
   * Check health of all providers
   */
  async checkProviderHealth(): Promise<Record<string, ProviderHealthResult>> {
    const results: Record<string, ProviderHealthResult> = {};

    for (const provider of this.discoveredProviders) {
      const startTime = Date.now();
      
      try {
        // Simple health check - validate configuration
        const isHealthy = provider.validateConfig();
        const latency = Date.now() - startTime;
        
        results[provider.name] = {
          healthy: isHealthy,
          latency
        };
      } catch (error) {
        const latency = Date.now() - startTime;
        
        results[provider.name] = {
          healthy: false,
          latency,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return results;
  }

  /**
   * Create and configure AIProviderManager with discovered providers
   */
  createProviderManager(): AIProviderManager {
    const manager = new AIProviderManager();

    // Register all discovered providers
    for (const provider of this.discoveredProviders) {
      manager.registerProvider(provider);
    }

    // Set recommended default provider
    const defaultProvider = this.recommendProvider(AiRequestType.GENERAL_QUERY);
    if (defaultProvider) {
      manager.setDefaultProvider(defaultProvider.name);
    }

    return manager;
  }
}