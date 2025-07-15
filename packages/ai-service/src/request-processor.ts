import { QueueManager } from './queue/queue-manager';
import { ClaudeProvider } from './providers/claude-provider';
import { QueuePriority } from './queue/redis-queue';
import { AIRequest, AIResponse, AiRequestType, AiRequestStatus } from './interfaces/ai-types';
import { BaseAIProvider } from './providers/base-ai-provider';

export interface RequestProcessorConfig {
  redisUrl: string;
  maxConcurrentRequests?: number;
  processingTimeout?: number;
  providers: {
    claude: {
      apiKey: string;
      baseUrl?: string;
      defaultModel?: string;
    };
  };
}

export interface RequestStatus {
  requestId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  provider?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface CancellationResult {
  success: boolean;
  status?: string;
  reason?: string;
}

export interface HealthStatus {
  isRunning: boolean;
  isHealthy: boolean;
  services: {
    queueManager: {
      isRunning: boolean;
      isHealthy: boolean;
      redisConnected: boolean;
      backgroundTasksActive: boolean;
    };
    providers: Record<string, { isHealthy: boolean }>;
  };
  metrics: {
    queueDepth: Record<string, number>;
    totalDepth: number;
  };
}

export class RequestProcessor {
  private queueManager: QueueManager;
  private providers: Map<string, BaseAIProvider>;
  private running: boolean = false;
  private config: Required<Omit<RequestProcessorConfig, 'providers'>> & { providers: RequestProcessorConfig['providers'] };
  private requestStore: Map<string, RequestStatus> = new Map();

  constructor(config: RequestProcessorConfig) {
    if (!config.redisUrl || !config.providers?.claude?.apiKey) {
      throw new Error('Missing required configuration: redisUrl and providers.claude.apiKey are required');
    }

    this.config = {
      redisUrl: config.redisUrl,
      maxConcurrentRequests: config.maxConcurrentRequests ?? 5,
      processingTimeout: config.processingTimeout ?? 30000,
      providers: config.providers,
    };

    // Initialize queue manager
    this.queueManager = new QueueManager({
      redisUrl: this.config.redisUrl,
    });

    // Initialize providers
    this.providers = new Map();
    try {
      const claudeProvider = new ClaudeProvider(this.config.providers.claude.apiKey);
      this.providers.set('claude', claudeProvider);
    } catch (error) {
      throw new Error(`Provider initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      await this.queueManager.start();
      this.running = true;
    } catch (error) {
      this.running = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    await this.queueManager.stop();
  }

  isRunning(): boolean {
    return this.running;
  }

  async enqueueRequest(request: Partial<AIRequest> & { prompt: string; provider?: string; model?: string; priority?: QueuePriority }): Promise<string> {
    this.validateRequest(request);

    const requestId = this.generateRequestId();
    const aiRequest = this.buildAIRequest(requestId, request);

    this.storeRequestStatus(requestId, {
      requestId,
      status: AiRequestStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: aiRequest.provider,
      model: aiRequest.model,
      metadata: { originalRequest: aiRequest },
    });

    // TODO: Enqueue to Redis queue (will be implemented in later phases)
    
    return requestId;
  }

  async processRequest(request: Partial<AIRequest> & { prompt: string; provider?: string; model?: string }): Promise<AIResponse> {
    this.validateRequest(request);

    const provider = request.provider || 'claude';
    const aiProvider = this.getProviderOrThrow(provider);

    const requestId = this.generateRequestId();
    const aiRequest = this.buildAIRequest(requestId, request);

    const response = await aiProvider.sendRequest(aiRequest);
    return response;
  }

  async getRequestStatus(requestId: string): Promise<RequestStatus> {
    const status = this.requestStore.get(requestId);
    if (!status) {
      throw new Error('Request not found');
    }
    return status;
  }

  async updateRequestStatus(requestId: string, status: string, metadata?: Record<string, any>): Promise<void> {
    const existingStatus = this.requestStore.get(requestId);
    if (!existingStatus) {
      // Create new status if it doesn't exist
      this.requestStore.set(requestId, {
        requestId,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: metadata || {},
      });
    } else {
      // Update existing status
      existingStatus.status = status;
      existingStatus.updatedAt = new Date();
      if (metadata) {
        existingStatus.metadata = { ...existingStatus.metadata, ...metadata };
      }
    }
  }

  async cancelRequest(requestId: string): Promise<CancellationResult> {
    const status = this.requestStore.get(requestId);
    
    if (!status) {
      return {
        success: false,
        reason: 'Request not found',
      };
    }

    if (status.status === AiRequestStatus.PROCESSING) {
      return {
        success: false,
        reason: 'Request is currently being processed and cannot be cancelled',
      };
    }

    // Update status to cancelled
    await this.updateRequestStatus(requestId, AiRequestStatus.CANCELLED);

    return {
      success: true,
      status: AiRequestStatus.CANCELLED,
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const queueHealth = await this.queueManager.getHealthStatus();
    const queueMetrics = await this.queueManager.getQueueMetrics();

    // Check provider health
    const providerHealth: Record<string, { isHealthy: boolean }> = {};
    for (const [name, provider] of this.providers.entries()) {
      providerHealth[name] = {
        isHealthy: provider.validateConfig(),
      };
    }

    const allProvidersHealthy = Object.values(providerHealth).every(p => p.isHealthy);

    return {
      isRunning: this.running,
      isHealthy: this.running && queueHealth.isHealthy && allProvidersHealthy,
      services: {
        queueManager: {
          isRunning: queueHealth.isRunning,
          isHealthy: queueHealth.isHealthy,
          redisConnected: queueHealth.redisConnected,
          backgroundTasksActive: queueHealth.backgroundTasksActive,
        },
        providers: providerHealth,
      },
      metrics: {
        queueDepth: queueMetrics.queueDepth,
        totalDepth: queueMetrics.totalDepth,
      },
    };
  }

  private validateRequest(request: Partial<AIRequest> & { prompt: string; provider?: string }): void {
    if (!request.prompt || request.prompt.trim() === '') {
      throw new Error('Invalid request: prompt cannot be empty');
    }

    const provider = request.provider || 'claude';
    if (!this.providers.has(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildAIRequest(requestId: string, request: Partial<AIRequest> & { prompt: string; provider?: string; model?: string }): AIRequest & { provider: string; model: string } {
    const provider = request.provider || 'claude';
    const model = request.model || 'claude-3-sonnet-20240229';

    return {
      id: requestId,
      provider,
      model,
      type: AiRequestType.GENERAL_QUERY,
      prompt: request.prompt,
      ...(request.context && { context: request.context }),
      ...(request.parameters && { parameters: request.parameters }),
    };
  }

  private storeRequestStatus(requestId: string, status: RequestStatus): void {
    this.requestStore.set(requestId, status);
  }

  private getProviderOrThrow(providerName: string): BaseAIProvider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
    return provider;
  }
}