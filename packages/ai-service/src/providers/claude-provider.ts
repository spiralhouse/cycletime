import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base-ai-provider';
import { AIRequest, AIResponse, TokenUsage, AiRequestType } from '../interfaces/ai-types';

interface ClaudeModelSpec {
  apiId: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  isLegacy?: boolean;
}

export class ClaudeProvider extends BaseAIProvider {
  public readonly name = 'claude';
  private client: Anthropic;

  private readonly modelSpecs: Record<string, ClaudeModelSpec> = {
    'claude-4-opus': {
      apiId: 'claude-opus-4-20250514',
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      inputCostPer1M: 15.00,
      outputCostPer1M: 75.00,
    },
    'claude-4-sonnet': {
      apiId: 'claude-sonnet-4-20250514',
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      inputCostPer1M: 3.00,
      outputCostPer1M: 15.00,
    },
    'claude-3-7-sonnet': {
      apiId: 'claude-3-7-sonnet-20240329',
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      inputCostPer1M: 3.00,
      outputCostPer1M: 15.00,
      isLegacy: true,
    },
    'claude-3-haiku': {
      apiId: 'claude-3-haiku-20240307',
      contextWindow: 200_000,
      maxOutputTokens: 4_096,
      inputCostPer1M: 0.25,
      outputCostPer1M: 1.25,
      isLegacy: true,
    },
  };

  public get models(): string[] {
    return Object.keys(this.modelSpecs);
  }

  constructor(apiKey?: string) {
    super();
    
    if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async sendRequest(request: AIRequest): Promise<AIResponse> {
    try {
      const normalizedRequest = this.normalizeRequest(request);
      const modelSpec = this.getModelSpec(request.model || 'claude-4-sonnet');
      
      this.validateRequest(normalizedRequest, modelSpec);

      const response = await this.client.messages.create({
        model: modelSpec.apiId,
        max_tokens: normalizedRequest.parameters?.maxTokens || Math.min(4096, modelSpec.maxOutputTokens),
        messages: [
          {
            role: 'user',
            content: normalizedRequest.prompt,
          },
        ],
        temperature: normalizedRequest.parameters?.temperature || 0.7,
      });

      return this.normalizeResponse(response, normalizedRequest.id, request.model || 'claude-4-sonnet');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  calculateCost(usage: TokenUsage, model?: string): number {
    const modelKey = model || 'claude-4-sonnet';
    const spec = this.modelSpecs[modelKey];
    
    if (!spec) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    const inputCost = (usage.inputTokens / 1_000_000) * spec.inputCostPer1M;
    const outputCost = (usage.outputTokens / 1_000_000) * spec.outputCostPer1M;
    
    return inputCost + outputCost;
  }

  validateConfig(): boolean {
    try {
      return !!this.client.apiKey;
    } catch {
      return false;
    }
  }

  getModelRecommendation(requestType: AiRequestType, complexity: 'low' | 'medium' | 'high' = 'medium'): string {
    const recommendations = {
      [AiRequestType.PRD_ANALYSIS]: {
        low: 'claude-3-haiku',
        medium: 'claude-4-sonnet',
        high: 'claude-4-opus',
      },
      [AiRequestType.PROJECT_PLAN_GENERATION]: {
        low: 'claude-3-7-sonnet',
        medium: 'claude-4-sonnet',
        high: 'claude-4-opus',
      },
      [AiRequestType.TASK_BREAKDOWN]: {
        low: 'claude-3-haiku',
        medium: 'claude-3-7-sonnet',
        high: 'claude-4-sonnet',
      },
      [AiRequestType.DOCUMENT_GENERATION]: {
        low: 'claude-3-haiku',
        medium: 'claude-3-7-sonnet',
        high: 'claude-4-sonnet',
      },
      [AiRequestType.CODE_REVIEW]: {
        low: 'claude-3-7-sonnet',
        medium: 'claude-4-sonnet',
        high: 'claude-4-opus',
      },
      [AiRequestType.GENERAL_QUERY]: {
        low: 'claude-3-haiku',
        medium: 'claude-3-7-sonnet',
        high: 'claude-4-sonnet',
      },
    };

    return recommendations[requestType]?.[complexity] || 'claude-4-sonnet';
  }

  private getModelSpec(model: string): ClaudeModelSpec {
    const spec = this.modelSpecs[model];
    if (!spec) {
      throw new Error(`Unsupported model: ${model}`);
    }
    return spec;
  }

  private validateRequest(request: AIRequest, modelSpec: ClaudeModelSpec): void {
    const promptTokens = this.estimateTokens(request.prompt);
    
    if (promptTokens > modelSpec.contextWindow) {
      throw new Error(
        `Request exceeds model context window. Prompt: ${promptTokens} tokens, Limit: ${modelSpec.contextWindow}`
      );
    }

    if (request.parameters?.maxTokens && request.parameters.maxTokens > modelSpec.maxOutputTokens) {
      throw new Error(
        `Max tokens exceeds model limit. Requested: ${request.parameters.maxTokens}, Limit: ${modelSpec.maxOutputTokens}`
      );
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  protected normalizeResponse(response: any, requestId: string, model: string): AIResponse {
    const content = response.content?.[0]?.text || '';
    const usage = response.usage || {};

    return {
      id: `claude-${Date.now()}`,
      provider: this.name,
      model,
      content,
      metadata: {
        stopReason: response.stop_reason || 'end_turn',
        tokenUsage: {
          inputTokens: usage.input_tokens || 0,
          outputTokens: usage.output_tokens || 0,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
        },
        providerId: response.id || `claude-${requestId}`,
      },
      performance: {
        responseTimeMs: 0, // Will be calculated by caller
        retryCount: 0,
      },
    };
  }
}