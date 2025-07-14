import { AIProvider, AIRequest, AIResponse, TokenUsage } from '../interfaces/ai-types';

/**
 * Abstract base class for AI providers
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  abstract models: string[];
  abstract sendRequest(request: AIRequest): Promise<AIResponse>;
  abstract calculateCost(usage: TokenUsage, model?: string): number;
  abstract validateConfig(): boolean;

  /**
   * Common functionality for normalizing requests across providers
   */
  protected normalizeRequest(request: AIRequest): any {
    // Normalize common parameters and validate structure
    return {
      id: request.id,
      type: request.type,
      prompt: request.prompt,
      context: request.context || {},
      parameters: {
        maxTokens: request.parameters?.maxTokens || 4000,
        temperature: request.parameters?.temperature || 0.1,
        topP: request.parameters?.topP || 0.99,
        ...request.parameters
      }
    };
  }

  /**
   * Common functionality for normalizing responses across providers
   */
  protected normalizeResponse(response: any, requestId: string, model: string): AIResponse {
    // Normalize provider-specific response format to common interface
    return {
      id: requestId,
      provider: this.name,
      model: model,
      content: response.content || '',
      metadata: {
        stopReason: response.stopReason || 'unknown',
        tokenUsage: response.tokenUsage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        providerId: response.id || response.providerId
      },
      performance: {
        responseTimeMs: response.responseTime || 0,
        retryCount: response.retryCount || 0
      }
    };
  }

  /**
   * Common error handling across providers
   */
  protected handleError(error: any): never {
    // Standardize error handling and throw normalized errors
    const normalizedError = new Error(`AI Provider Error: ${error.message || 'Unknown error'}`);
    normalizedError.name = 'AIProviderError';
    throw normalizedError;
  }
}