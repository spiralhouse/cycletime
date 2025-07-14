import { AIProvider, AIRequest, AIResponse } from '../interfaces/ai-types';

/**
 * Manages multiple AI providers and routes requests to appropriate providers
 */
export class AIProviderManager {
  private providers = new Map<string, AIProvider>();
  private defaultProvider?: string;

  /**
   * Register a new AI provider
   */
  registerProvider(provider: AIProvider): void {
    if (this.providers.has(provider.name)) {
      throw new Error(`Provider ${provider.name} is already registered`);
    }
    
    this.providers.set(provider.name, provider);
  }

  /**
   * Get provider by name, or default provider if no name specified
   */
  getProvider(name?: string): AIProvider {
    const providerName = name || this.defaultProvider;
    
    if (!providerName) {
      throw new Error('No provider specified and no default provider set');
    }
    
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return provider;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} not found`);
    }
    
    this.defaultProvider = name;
  }

  /**
   * Get the name of the default provider
   */
  getDefaultProviderName(): string | undefined {
    return this.defaultProvider;
  }

  /**
   * Get list of all available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Send request to appropriate provider
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    const provider = this.getProvider(request.provider);
    return provider.sendRequest(request);
  }

  /**
   * Get all available models grouped by provider
   */
  getAvailableModels(): Record<string, string[]> {
    const models: Record<string, string[]> = {};
    
    for (const [name, provider] of this.providers) {
      models[name] = provider.models;
    }
    
    return models;
  }

  /**
   * Validate configurations of all registered providers
   */
  validateProviders(): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    
    for (const [name, provider] of this.providers) {
      results[name] = provider.validateConfig();
    }
    
    return results;
  }
}