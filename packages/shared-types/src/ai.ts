/**
 * AI service types and interfaces
 */

import { BaseEntity } from './common';

/**
 * AI request types
 */
export enum AiRequestType {
  PRD_ANALYSIS = 'PRD_ANALYSIS',
  PROJECT_PLAN_GENERATION = 'PROJECT_PLAN_GENERATION', 
  TASK_BREAKDOWN = 'TASK_BREAKDOWN',
  DOCUMENT_GENERATION = 'DOCUMENT_GENERATION',
  CODE_REVIEW = 'CODE_REVIEW',
  GENERAL_QUERY = 'GENERAL_QUERY'
}

/**
 * AI request status
 */
export enum AiRequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * AI provider names
 */
export enum AiProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  GROK = 'grok'
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * AI request parameters
 */
export interface AIParameters {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

/**
 * AI request entity
 */
export interface AIRequest extends BaseEntity {
  userId: string;
  provider: AiProvider;
  model: string;
  type: AiRequestType;
  prompt: string;
  context?: Record<string, unknown>;
  parameters?: AIParameters;
  status: AiRequestStatus;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * AI response entity
 */
export interface AIResponse extends BaseEntity {
  requestId: string;
  provider: AiProvider;
  model: string;
  content: string;
  status: AiRequestStatus;
  metadata: {
    stopReason?: string;
    tokenUsage: TokenUsage;
    providerId?: string;
    finishReason?: string;
  };
  performance: {
    responseTimeMs: number;
    retryCount: number;
    queueTimeMs?: number;
    processingTimeMs?: number;
  };
  cost?: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  };
}

/**
 * AI provider interface
 */
export interface IAIProvider {
  name: AiProvider;
  models: string[];
  sendRequest(request: Omit<AIRequest, 'id' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Omit<AIResponse, 'id' | 'createdAt' | 'updatedAt' | 'requestId'>>;
  calculateCost(usage: TokenUsage, model?: string): number;
  validateConfig(): boolean;
  isModelSupported(model: string): boolean;
  getDefaultModel(): string;
}

/**
 * AI service configuration
 */
export interface AIServiceConfig {
  providers: {
    [key in AiProvider]?: {
      apiKey: string;
      baseUrl?: string;
      defaultModel?: string;
      timeout?: number;
      maxRetries?: number;
    };
  };
  defaultProvider: AiProvider;
  queueConfig?: {
    redisUrl: string;
    keyPrefix?: string;
    maxRetries?: number;
    retryDelay?: number;
  };
}

/**
 * Queue priority levels
 */
export enum QueuePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

/**
 * Queue item structure
 */
export interface QueueItem {
  id: string;
  data: Record<string, unknown>;
  priority: QueuePriority;
  attempts?: number;
  timestamp?: number;
}

/**
 * Queue metrics
 */
export interface QueueMetrics {
  queueDepth: Record<QueuePriority, number>;
  totalDepth: number;
  processedCount?: number;
  failedCount?: number;
  avgProcessingTime?: number;
}