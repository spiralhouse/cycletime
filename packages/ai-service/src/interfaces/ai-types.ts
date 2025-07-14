/**
 * Core AI types and interfaces for the provider abstraction layer
 */

export enum AiRequestType {
  PRD_ANALYSIS = 'PRD_ANALYSIS',
  PROJECT_PLAN_GENERATION = 'PROJECT_PLAN_GENERATION', 
  TASK_BREAKDOWN = 'TASK_BREAKDOWN',
  DOCUMENT_GENERATION = 'DOCUMENT_GENERATION',
  CODE_REVIEW = 'CODE_REVIEW',
  GENERAL_QUERY = 'GENERAL_QUERY'
}

export enum AiRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AIParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export interface AIRequest {
  id: string;
  provider?: string; // "claude", "openai", "gemini", "grok"
  model?: string;    // Provider-specific model identifier
  type: AiRequestType;
  prompt: string;
  context?: Record<string, unknown>;
  parameters?: AIParameters;
}

export interface AIResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  metadata: {
    stopReason?: string;
    tokenUsage: TokenUsage;
    providerId?: string;
  };
  performance: {
    responseTimeMs: number;
    retryCount: number;
  };
}

export interface AIProvider {
  name: string;
  models: string[];
  sendRequest(request: AIRequest): Promise<AIResponse>;
  calculateCost(usage: TokenUsage, model?: string): number;
  validateConfig(): boolean;
}