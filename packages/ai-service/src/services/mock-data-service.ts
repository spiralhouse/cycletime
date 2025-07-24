import { logger } from '@cycletime/shared-utils';

export interface MockProvider {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'configuring';
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastHealthCheck: string;
  capabilities: string[];
  models: string[];
  configuration: {
    configured: boolean;
    lastConfigured?: string;
    apiKey?: string;
    baseUrl?: string;
    organization?: string;
    region?: string;
  };
  metrics: {
    requestCount: number;
    errorRate: number;
    averageResponseTime: number;
    uptime: number;
    lastError?: string;
  };
}

export interface MockRequest {
  id: string;
  type: 'chat_completion' | 'chat_completion_stream' | 'embedding' | 'context_analysis' | 'project_analysis';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  model: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  processingTime?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userId: string;
  sessionId?: string | undefined;
  projectId?: string | undefined;
  requestData: any;
  responseData?: any;
  error?: {
    type: string;
    message: string;
    code: string;
    retryable: boolean;
  };
}

export interface MockModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: string[];
  contextWindow: number;
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  status: 'available' | 'deprecated' | 'beta' | 'experimental';
}

export interface MockProjectInsight {
  id: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  impact: string;
  trend: string;
  actionable: boolean;
  generatedAt: string;
}

export interface MockProjectRecommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  effort: string;
  impact: string;
  confidence: number;
  reasoning: string;
  actionItems: string[];
  generatedAt: string;
}

export class MockDataService {
  private providers: MockProvider[] = [];
  private models: MockModel[] = [];
  private projectInsights: Map<string, MockProjectInsight[]> = new Map();
  private projectRecommendations: Map<string, MockProjectRecommendation[]> = new Map();
  private contextStore: Map<string, any> = new Map();
  private requestQueue: Map<string, MockRequest> = new Map();
  private analysisQueue: Map<string, any> = new Map();
  private healthSimulationInterval: NodeJS.Timeout | null = null;
  private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeMockData();
    this.startHealthSimulation();
  }

  private initializeMockData(): void {
    // Initialize providers
    this.providers = [
      {
        id: 'openai',
        name: 'OpenAI',
        status: 'active',
        health: 'healthy',
        lastHealthCheck: new Date().toISOString(),
        capabilities: ['text-generation', 'code-generation', 'embedding', 'vision'],
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-3-large'],
        configuration: {
          configured: true,
          lastConfigured: new Date(Date.now() - 86400000).toISOString(),
          baseUrl: 'https://api.openai.com/v1',
          organization: 'cycletime-org',
        },
        metrics: {
          requestCount: 1247,
          errorRate: 0.02,
          averageResponseTime: 850,
          uptime: 0.998,
        },
      },
      {
        id: 'anthropic',
        name: 'Anthropic',
        status: 'active',
        health: 'healthy',
        lastHealthCheck: new Date().toISOString(),
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        configuration: {
          configured: true,
          lastConfigured: new Date(Date.now() - 172800000).toISOString(),
          baseUrl: 'https://api.anthropic.com',
          region: 'us-east-1',
        },
        metrics: {
          requestCount: 892,
          errorRate: 0.015,
          averageResponseTime: 1200,
          uptime: 0.995,
        },
      },
      {
        id: 'google',
        name: 'Google AI',
        status: 'active',
        health: 'degraded',
        lastHealthCheck: new Date().toISOString(),
        capabilities: ['text-generation', 'embedding', 'vision'],
        models: ['gemini-pro', 'gemini-pro-vision', 'text-embedding-004'],
        configuration: {
          configured: true,
          lastConfigured: new Date(Date.now() - 259200000).toISOString(),
          baseUrl: 'https://generativelanguage.googleapis.com/v1',
          region: 'us-central1',
        },
        metrics: {
          requestCount: 456,
          errorRate: 0.08,
          averageResponseTime: 1800,
          uptime: 0.985,
          lastError: 'Rate limit exceeded',
        },
      },
      {
        id: 'azure',
        name: 'Azure OpenAI',
        status: 'configuring',
        health: 'unhealthy',
        lastHealthCheck: new Date().toISOString(),
        capabilities: ['text-generation', 'code-generation', 'embedding'],
        models: ['gpt-4', 'gpt-35-turbo', 'text-embedding-ada-002'],
        configuration: {
          configured: false,
          baseUrl: 'https://cycletime.openai.azure.com',
          region: 'eastus',
        },
        metrics: {
          requestCount: 0,
          errorRate: 0,
          averageResponseTime: 0,
          uptime: 0,
          lastError: 'Authentication failed',
        },
      },
    ];

    // Initialize models
    this.models = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable GPT-4 model, great for complex tasks',
        provider: 'openai',
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        contextWindow: 128000,
        maxTokens: 4096,
        costPerInputToken: 0.00003,
        costPerOutputToken: 0.00006,
        status: 'available',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Faster and more cost-effective than GPT-4',
        provider: 'openai',
        capabilities: ['text-generation', 'code-generation', 'function-calling', 'vision'],
        contextWindow: 128000,
        maxTokens: 4096,
        costPerInputToken: 0.00001,
        costPerOutputToken: 0.00003,
        status: 'available',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and efficient model for most tasks',
        provider: 'openai',
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        contextWindow: 16384,
        maxTokens: 4096,
        costPerInputToken: 0.0000005,
        costPerOutputToken: 0.0000015,
        status: 'available',
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most powerful model in the Claude 3 family',
        provider: 'anthropic',
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        contextWindow: 200000,
        maxTokens: 4096,
        costPerInputToken: 0.000015,
        costPerOutputToken: 0.000075,
        status: 'available',
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and speed',
        provider: 'anthropic',
        capabilities: ['text-generation', 'code-generation', 'function-calling'],
        contextWindow: 200000,
        maxTokens: 4096,
        costPerInputToken: 0.000003,
        costPerOutputToken: 0.000015,
        status: 'available',
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fastest model in the Claude 3 family',
        provider: 'anthropic',
        capabilities: ['text-generation', 'code-generation'],
        contextWindow: 200000,
        maxTokens: 4096,
        costPerInputToken: 0.00000025,
        costPerOutputToken: 0.00000125,
        status: 'available',
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Google\'s most capable model',
        provider: 'google',
        capabilities: ['text-generation', 'code-generation'],
        contextWindow: 32000,
        maxTokens: 2048,
        costPerInputToken: 0.000001,
        costPerOutputToken: 0.000002,
        status: 'available',
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        description: 'Most powerful embedding model',
        provider: 'openai',
        capabilities: ['embedding'],
        contextWindow: 8192,
        maxTokens: 8192,
        costPerInputToken: 0.00000013,
        costPerOutputToken: 0,
        status: 'available',
      },
    ];

    logger.info('Mock data service initialized with sample data');
  }

  private startHealthSimulation(): void {
    // Simulate dynamic health status changes every 30 seconds
    this.healthSimulationInterval = setInterval(() => {
      this.simulateProviderHealthChanges();
    }, 30000);
  }

  private simulateProviderHealthChanges(): void {
    this.providers.forEach(provider => {
      // Skip unconfigured providers
      if (!provider.configuration.configured) return;

      const random = Math.random();
      
      // Simulate health changes based on current health
      switch (provider.health) {
        case 'healthy':
          if (random < 0.05) { // 5% chance to degrade
            provider.health = 'degraded';
            provider.metrics.errorRate = Math.min(provider.metrics.errorRate + 0.02, 0.1);
            logger.debug(`Provider ${provider.id} health degraded`);
          }
          break;
        case 'degraded':
          if (random < 0.3) { // 30% chance to recover
            provider.health = 'healthy';
            provider.metrics.errorRate = Math.max(provider.metrics.errorRate - 0.01, 0.01);
            logger.debug(`Provider ${provider.id} health recovered`);
          } else if (random < 0.1) { // 10% chance to become unhealthy
            provider.health = 'unhealthy';
            provider.metrics.errorRate = Math.min(provider.metrics.errorRate + 0.05, 0.2);
            provider.metrics.lastError = 'Service unavailable';
            logger.debug(`Provider ${provider.id} health became unhealthy`);
          }
          break;
        case 'unhealthy':
          if (random < 0.2) { // 20% chance to improve to degraded
            provider.health = 'degraded';
            provider.metrics.errorRate = Math.max(provider.metrics.errorRate - 0.03, 0.05);
            delete provider.metrics.lastError;
            logger.debug(`Provider ${provider.id} health improved to degraded`);
          }
          break;
      }

      provider.lastHealthCheck = new Date().toISOString();
    });
  }

  public cleanup(): void {
    if (this.healthSimulationInterval) {
      clearInterval(this.healthSimulationInterval);
      this.healthSimulationInterval = null;
    }
    
    // Clear any pending processing timeouts
    this.processingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.processingTimeouts.clear();
  }

  // Provider methods
  getProviders(): MockProvider[] {
    return this.providers;
  }

  getProvider(id: string): MockProvider | undefined {
    return this.providers.find(p => p.id === id);
  }

  updateProviderStatus(id: string, status: MockProvider['status']): void {
    const provider = this.getProvider(id);
    if (provider) {
      provider.status = status;
      provider.lastHealthCheck = new Date().toISOString();
    }
  }

  updateProviderHealth(id: string, health: MockProvider['health']): void {
    const provider = this.getProvider(id);
    if (provider) {
      provider.health = health;
      provider.lastHealthCheck = new Date().toISOString();
    }
  }

  configureProvider(id: string, _configuration: any): boolean {
    const provider = this.getProvider(id);
    if (provider) {
      provider.configuration.configured = true;
      provider.configuration.lastConfigured = new Date().toISOString();
      provider.status = 'active';
      provider.health = 'healthy';
      return true;
    }
    return false;
  }

  testProvider(id: string): { success: boolean; responseTime: number; error?: string } {
    const provider = this.getProvider(id);
    if (!provider) {
      return { success: false, responseTime: 0, error: 'Provider not found' };
    }

    if (!provider.configuration.configured) {
      return { success: false, responseTime: 0, error: 'Provider not configured' };
    }

    // Simulate different test results based on provider health
    switch (provider.health) {
      case 'healthy':
        return { success: true, responseTime: Math.random() * 500 + 200 };
      case 'degraded':
        return { success: Math.random() > 0.3, responseTime: Math.random() * 2000 + 1000 };
      case 'unhealthy':
        return { success: false, responseTime: 0, error: 'Provider unavailable' };
      default:
        return { success: false, responseTime: 0, error: 'Unknown health status' };
    }
  }

  // Model methods
  getModels(providerFilter?: string, capabilityFilter?: string): MockModel[] {
    let filteredModels = this.models;

    if (providerFilter) {
      filteredModels = filteredModels.filter(m => m.provider === providerFilter);
    }

    if (capabilityFilter) {
      filteredModels = filteredModels.filter(m => m.capabilities.includes(capabilityFilter));
    }

    return filteredModels;
  }

  getModel(id: string): MockModel | undefined {
    return this.models.find(m => m.id === id);
  }

  // Context methods
  createContext(projectId: string, documents: any[]): { contextId: string; status: string } {
    const contextId = crypto.randomUUID();
    const context = {
      contextId,
      projectId,
      documents,
      status: 'processing',
      createdAt: new Date().toISOString(),
      documentsCount: documents.length,
      estimatedChunks: Math.ceil(documents.length * 5),
    };

    this.contextStore.set(contextId, context);

    // Simulate processing completion after a delay
    setTimeout(() => {
      const ctx = this.contextStore.get(contextId);
      if (ctx) {
        ctx.status = 'completed';
        ctx.completedAt = new Date().toISOString();
        ctx.chunksGenerated = Math.floor(ctx.estimatedChunks * (0.8 + Math.random() * 0.4));
        ctx.totalTokens = ctx.chunksGenerated * (800 + Math.random() * 400);
      }
    }, 2000 + Math.random() * 5000);

    return { contextId, status: 'processing' };
  }

  getContext(contextId: string): any {
    return this.contextStore.get(contextId);
  }

  optimizeContext(contextId: string, _options: any): any {
    const context = this.contextStore.get(contextId);
    if (!context) {
      return null;
    }

    const originalTokens = context.totalTokens || 10000;
    const compressionRatio = 0.6 + Math.random() * 0.3; // 60-90% compression
    const optimizedTokens = Math.floor(originalTokens * compressionRatio);

    return {
      contextId,
      optimizedAt: new Date().toISOString(),
      optimization: {
        originalTokens,
        optimizedTokens,
        compressionRatio: 1 - compressionRatio,
        chunksReduced: Math.floor(context.chunksGenerated * (1 - compressionRatio)),
        relevancePreserved: 0.85 + Math.random() * 0.1,
      },
    };
  }

  getContextChunks(contextId: string, maxTokens: number = 8000): any {
    const context = this.contextStore.get(contextId);
    if (!context) {
      return null;
    }

    const chunkCount = Math.min(Math.floor(maxTokens / 800), context.chunksGenerated || 10);
    const chunks = [];

    for (let i = 0; i < chunkCount; i++) {
      chunks.push({
        id: crypto.randomUUID(),
        content: `This is mock content for chunk ${i + 1}. It contains relevant information extracted from the project documents and optimized for AI consumption.`,
        tokens: 600 + Math.floor(Math.random() * 400),
        relevanceScore: 0.5 + Math.random() * 0.5,
        priority: 0.3 + Math.random() * 0.7,
        documentId: `doc-${Math.floor(Math.random() * 10)}`,
        documentTitle: `Document ${Math.floor(Math.random() * 10)}`,
        documentType: 'code',
        chunkIndex: i,
        metadata: {
          keywords: ['function', 'variable', 'class', 'import'],
          entities: ['UserService', 'DatabaseManager', 'APIController'],
          concepts: ['authentication', 'data-processing', 'error-handling'],
          complexity: Math.random(),
        },
      });
    }

    return {
      contextId,
      chunks,
      totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokens, 0),
      totalChunks: chunks.length,
      generatedAt: new Date().toISOString(),
    };
  }

  // Project analysis methods
  startProjectAnalysis(projectId: string, _options: any): { analysisId: string; status: string } {
    const analysisId = crypto.randomUUID();
    const analysis = {
      analysisId,
      projectId,
      status: 'processing',
      analysisType: _options.analysisType || 'full',
      scope: _options.scope || ['code', 'documentation', 'issues', 'metrics'],
      createdAt: new Date().toISOString(),
      progress: {
        stage: 'scanning',
        percentage: 0,
        currentTask: 'Scanning project files',
      },
    };

    this.analysisQueue.set(analysisId, analysis);

    // Simulate analysis completion
    setTimeout(() => {
      const anal = this.analysisQueue.get(analysisId);
      if (anal) {
        anal.status = 'completed';
        anal.completedAt = new Date().toISOString();
        anal.progress.stage = 'completed';
        anal.progress.percentage = 100;
        anal.progress.currentTask = 'Analysis completed';
      }
    }, 5000 + Math.random() * 10000);

    return { analysisId, status: 'processing' };
  }

  getProjectAnalysis(analysisId: string): any {
    return this.analysisQueue.get(analysisId);
  }

  getProjectInsights(projectId: string, _timeframe: string = 'month'): MockProjectInsight[] {
    if (!this.projectInsights.has(projectId)) {
      this.generateProjectInsights(projectId);
    }
    return this.projectInsights.get(projectId) || [];
  }

  getProjectRecommendations(projectId: string): MockProjectRecommendation[] {
    if (!this.projectRecommendations.has(projectId)) {
      this.generateProjectRecommendations(projectId);
    }
    return this.projectRecommendations.get(projectId) || [];
  }

  private generateProjectInsights(projectId: string): void {
    const insights: MockProjectInsight[] = [
      {
        id: crypto.randomUUID(),
        category: 'performance',
        title: 'API Response Time Improving',
        description: 'Average API response time has decreased by 23% over the past month',
        confidence: 0.92,
        impact: 'high',
        trend: 'improving',
        actionable: true,
        generatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        category: 'quality',
        title: 'Test Coverage Increase',
        description: 'Test coverage has increased from 78% to 85% in the last sprint',
        confidence: 0.98,
        impact: 'medium',
        trend: 'improving',
        actionable: false,
        generatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        category: 'complexity',
        title: 'Code Complexity Rising',
        description: 'Cyclomatic complexity has increased in 3 core modules',
        confidence: 0.85,
        impact: 'medium',
        trend: 'declining',
        actionable: true,
        generatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        category: 'trends',
        title: 'Deployment Frequency Stable',
        description: 'Deployment frequency has remained consistent at 2.3 deployments per week',
        confidence: 0.95,
        impact: 'low',
        trend: 'stable',
        actionable: false,
        generatedAt: new Date().toISOString(),
      },
    ];

    this.projectInsights.set(projectId, insights);
  }

  private generateProjectRecommendations(projectId: string): void {
    const recommendations: MockProjectRecommendation[] = [
      {
        id: crypto.randomUUID(),
        title: 'Implement Database Connection Pooling',
        description: 'Add connection pooling to reduce database connection overhead and improve performance',
        category: 'performance',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        confidence: 0.88,
        reasoning: 'Analysis shows frequent database connection creation/destruction causing performance bottlenecks',
        actionItems: [
          'Install database connection pooling library',
          'Configure pool size based on concurrent user load',
          'Update database configuration',
          'Test performance improvements',
        ],
        generatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Add Input Validation Middleware',
        description: 'Implement comprehensive input validation to improve security and data integrity',
        category: 'security',
        priority: 'critical',
        effort: 'high',
        impact: 'high',
        confidence: 0.95,
        reasoning: 'Multiple endpoints lack proper input validation, creating security vulnerabilities',
        actionItems: [
          'Audit all API endpoints for input validation',
          'Implement validation middleware',
          'Add schema validation for request bodies',
          'Write security tests',
        ],
        generatedAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        title: 'Refactor Large Components',
        description: 'Break down large components into smaller, more maintainable pieces',
        category: 'maintainability',
        priority: 'medium',
        effort: 'high',
        impact: 'medium',
        confidence: 0.82,
        reasoning: 'Several components exceed 500 lines of code, making them difficult to maintain and test',
        actionItems: [
          'Identify components over 500 lines',
          'Extract reusable sub-components',
          'Implement proper separation of concerns',
          'Update tests for new component structure',
        ],
        generatedAt: new Date().toISOString(),
      },
    ];

    this.projectRecommendations.set(projectId, recommendations);
  }

  // Request management methods
  createAIRequest(type: MockRequest['type'], provider: string, model: string, requestData: any, userId: string, priority: MockRequest['priority'] = 'medium', sessionId?: string, projectId?: string): MockRequest {
    const requestId = crypto.randomUUID();
    const request: MockRequest = {
      id: requestId,
      type,
      status: 'pending',
      provider,
      model,
      createdAt: new Date().toISOString(),
      priority,
      userId,
      sessionId,
      projectId,
      requestData,
    };

    this.requestQueue.set(requestId, request);
    
    // Start processing simulation
    this.simulateRequestProcessing(requestId);
    
    return request;
  }

  getAIRequest(requestId: string): MockRequest | undefined {
    return this.requestQueue.get(requestId);
  }

  cancelAIRequest(requestId: string): boolean {
    const request = this.requestQueue.get(requestId);
    if (request && request.status === 'pending') {
      request.status = 'cancelled';
      request.completedAt = new Date().toISOString();
      
      // Clear any pending timeout
      const timeout = this.processingTimeouts.get(requestId);
      if (timeout) {
        clearTimeout(timeout);
        this.processingTimeouts.delete(requestId);
      }
      
      return true;
    }
    return false;
  }

  private simulateRequestProcessing(requestId: string): void {
    const request = this.requestQueue.get(requestId);
    if (!request) return;

    const provider = this.getProvider(request.provider);
    if (!provider) {
      this.failRequest(requestId, 'Provider not found', 'PROVIDER_NOT_FOUND');
      return;
    }

    if (!provider.configuration.configured) {
      this.failRequest(requestId, 'Provider not configured', 'PROVIDER_NOT_CONFIGURED');
      return;
    }

    // Calculate processing time based on request type and provider health
    let baseProcessingTime = this.getBaseProcessingTime(request.type);
    
    // Adjust based on provider health
    switch (provider.health) {
      case 'healthy':
        baseProcessingTime *= 0.8 + Math.random() * 0.4; // 80-120% of base time
        break;
      case 'degraded':
        baseProcessingTime *= 1.5 + Math.random() * 1.0; // 150-250% of base time
        break;
      case 'unhealthy':
        // High chance of failure
        if (Math.random() < 0.7) {
          this.failRequest(requestId, 'Provider unhealthy', 'PROVIDER_UNHEALTHY');
          return;
        }
        baseProcessingTime *= 3.0 + Math.random() * 2.0; // 300-500% of base time
        break;
    }

    // Adjust based on priority
    switch (request.priority) {
      case 'urgent':
        baseProcessingTime *= 0.5;
        break;
      case 'high':
        baseProcessingTime *= 0.7;
        break;
      case 'low':
        baseProcessingTime *= 1.5;
        break;
    }

    // Start processing after a small delay
    setTimeout(() => {
      const req = this.requestQueue.get(requestId);
      if (req && req.status === 'pending') {
        req.status = 'processing';
        req.startedAt = new Date().toISOString();
      }
    }, 100 + Math.random() * 200);

    // Complete processing after calculated time
    const timeout = setTimeout(() => {
      this.completeRequest(requestId, baseProcessingTime);
      this.processingTimeouts.delete(requestId);
    }, baseProcessingTime);

    this.processingTimeouts.set(requestId, timeout);
  }

  private getBaseProcessingTime(requestType: MockRequest['type']): number {
    const times = {
      chat_completion: 2000 + Math.random() * 8000, // 2-10 seconds
      chat_completion_stream: 3000 + Math.random() * 12000, // 3-15 seconds
      embedding: 500 + Math.random() * 1500, // 0.5-2 seconds
      context_analysis: 10000 + Math.random() * 20000, // 10-30 seconds
      project_analysis: 15000 + Math.random() * 45000, // 15-60 seconds
    };
    return times[requestType] || 5000;
  }

  private completeRequest(requestId: string, processingTime: number): void {
    const request = this.requestQueue.get(requestId);
    if (!request || request.status !== 'processing') return;

    // Simulate occasional failures
    if (Math.random() < 0.05) { // 5% failure rate
      this.failRequest(requestId, 'Processing failed', 'PROCESSING_ERROR');
      return;
    }

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.processingTime = processingTime;

    // Generate appropriate response data
    switch (request.type) {
      case 'chat_completion':
      case 'chat_completion_stream':
        request.responseData = this.generateChatCompletion(request.requestData);
        break;
      case 'embedding':
        request.responseData = this.generateEmbeddings(request.requestData);
        break;
      case 'context_analysis':
        request.responseData = this.generateContextAnalysis(request.requestData);
        break;
      case 'project_analysis':
        request.responseData = this.generateProjectAnalysisResponse(request.requestData);
        break;
    }

    // Update provider metrics
    const provider = this.getProvider(request.provider);
    if (provider) {
      provider.metrics.requestCount++;
      provider.metrics.averageResponseTime = 
        (provider.metrics.averageResponseTime * 0.9) + (processingTime * 0.1);
    }
  }

  private failRequest(requestId: string, message: string, code: string): void {
    const request = this.requestQueue.get(requestId);
    if (!request) return;

    request.status = 'failed';
    request.completedAt = new Date().toISOString();
    request.error = {
      type: this.getErrorType(code),
      message,
      code,
      retryable: this.isRetryableError(code),
    };

    // Update provider error metrics
    const provider = this.getProvider(request.provider);
    if (provider) {
      provider.metrics.errorRate = Math.min(provider.metrics.errorRate + 0.001, 1.0);
      provider.metrics.lastError = message;
    }
  }

  private getErrorType(code: string): string {
    const errorTypeMap: { [key: string]: string } = {
      'PROVIDER_NOT_FOUND': 'validation_error',
      'PROVIDER_NOT_CONFIGURED': 'authentication',
      'PROVIDER_UNHEALTHY': 'provider_error',
      'PROCESSING_ERROR': 'internal_error',
      'RATE_LIMIT_EXCEEDED': 'rate_limit',
    };
    return errorTypeMap[code] || 'internal_error';
  }

  private isRetryableError(code: string): boolean {
    const retryableErrors = ['PROVIDER_UNHEALTHY', 'PROCESSING_ERROR', 'RATE_LIMIT_EXCEEDED'];
    return retryableErrors.includes(code);
  }

  private generateContextAnalysis(requestData: any): any {
    return {
      contextId: crypto.randomUUID(),
      analysisType: requestData.analysisType || 'full',
      documentsAnalyzed: requestData.documents?.length || 0,
      totalTokens: Math.floor(Math.random() * 50000) + 10000,
      optimizedTokens: Math.floor(Math.random() * 30000) + 5000,
      compressionRatio: 0.3 + Math.random() * 0.4,
      insights: [
        'High code complexity in authentication module',
        'Inconsistent error handling patterns detected',
        'Opportunities for performance optimization identified',
      ],
    };
  }

  private generateProjectAnalysisResponse(requestData: any): any {
    return {
      analysisId: crypto.randomUUID(),
      projectId: requestData.projectId,
      scope: requestData.scope || ['code', 'documentation'],
      metrics: {
        codeQuality: 0.7 + Math.random() * 0.3,
        testCoverage: 0.6 + Math.random() * 0.4,
        documentation: 0.5 + Math.random() * 0.4,
        performance: 0.8 + Math.random() * 0.2,
      },
      recommendations: this.getProjectRecommendations(requestData.projectId),
      insights: this.getProjectInsights(requestData.projectId),
    };
  }

  // Chat completion methods
  generateChatCompletion(request: any): any {
    const model = this.getModel(request.model || 'gpt-4') || this.models[0];
    const responseId = crypto.randomUUID();
    
    const promptTokens = Math.floor(Math.random() * 1000) + 100;
    const completionTokens = Math.floor(Math.random() * 500) + 50;
    
    const mockResponse = {
      id: responseId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model.id,
      provider: model.provider,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: this.generateMockChatResponse(request.messages),
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost: (promptTokens * model.costPerInputToken) + (completionTokens * model.costPerOutputToken),
      },
      metadata: {
        processingTime: Math.random() * 2000 + 500,
        contextOptimizationUsed: request.contextOptimization?.enabled || false,
        originalContextTokens: promptTokens,
        optimizedContextTokens: request.contextOptimization?.enabled ? Math.floor(promptTokens * 0.8) : promptTokens,
        providerResponseTime: Math.random() * 1500 + 300,
      },
    };

    return mockResponse;
  }

  private generateMockChatResponse(messages: any[]): string {
    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || '';

    if (userMessage.toLowerCase().includes('code')) {
      return `Here's a code example that addresses your question:\n\n\`\`\`typescript\nfunction handleRequest(request: any): Promise<Response> {\n  // Implementation here\n  return new Promise((resolve) => {\n    resolve({ status: 200, data: 'Success' });\n  });\n}\n\`\`\`\n\nThis function demonstrates the pattern you're looking for. Let me know if you need any clarification!`;
    }

    if (userMessage.toLowerCase().includes('explain')) {
      return `I'll explain this concept step by step:\n\n1. **First principle**: The fundamental concept is based on...\n2. **Key components**: The main elements include...\n3. **How it works**: The process follows these steps...\n4. **Best practices**: Consider these recommendations...\n\nThis should give you a comprehensive understanding of the topic. Would you like me to elaborate on any specific aspect?`;
    }

    return `I understand your question about "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}". Here's a comprehensive response:\n\nBased on the context provided, I can see that you're looking for guidance on this topic. The key points to consider are:\n\n- **Primary consideration**: This is the most important aspect to focus on\n- **Secondary factors**: These additional elements should also be taken into account\n- **Implementation details**: Here's how you can approach this practically\n\nLet me know if you'd like me to dive deeper into any of these areas or if you have follow-up questions!`;
  }

  // Embedding methods
  generateEmbeddings(request: any): any {
    const model = this.getModel(request.model || 'text-embedding-3-large') || this.models.find(m => m.capabilities.includes('embedding'));
    
    const embeddings = request.input.map((_text: string, index: number) => ({
      object: 'embedding',
      embedding: Array.from({ length: 1536 }, () => Math.random() * 2 - 1), // Mock embedding vector
      index,
    }));

    const totalTokens = request.input.reduce((sum: number, text: string) => sum + Math.floor(text.length / 4), 0);

    return {
      object: 'list',
      data: embeddings,
      model: model?.id || 'text-embedding-3-large',
      provider: model?.provider || 'openai',
      usage: {
        promptTokens: totalTokens,
        totalTokens,
        estimatedCost: totalTokens * (model?.costPerInputToken || 0.00000013),
      },
      processingTime: Math.random() * 1000 + 200,
    };
  }

  // Analytics methods
  getAnalytics(timeframe: string): any {
    const now = new Date();
    const totalRequests = Math.floor(Math.random() * 10000) + 5000;
    const totalTokens = Math.floor(Math.random() * 1000000) + 500000;
    const totalCost = totalTokens * 0.00002;

    return {
      timeframe,
      overview: {
        totalRequests,
        totalTokens,
        totalCost,
        successRate: 0.95 + Math.random() * 0.04,
        averageResponseTime: Math.random() * 1000 + 500,
      },
      providers: this.providers.map(provider => ({
        provider: provider.id,
        requests: Math.floor(Math.random() * 3000) + 1000,
        tokens: Math.floor(Math.random() * 300000) + 100000,
        cost: Math.random() * 50 + 20,
        successRate: 0.9 + Math.random() * 0.09,
        averageResponseTime: provider.metrics.averageResponseTime,
      })),
      models: this.models.slice(0, 5).map(model => ({
        model: model.id,
        provider: model.provider,
        requests: Math.floor(Math.random() * 1000) + 200,
        tokens: Math.floor(Math.random() * 100000) + 20000,
        cost: Math.random() * 20 + 5,
        successRate: 0.92 + Math.random() * 0.07,
        averageResponseTime: Math.random() * 1200 + 400,
      })),
      usage: {
        peakHours: [9, 10, 11, 14, 15, 16], // Common peak hours
        usageByDay: {
          Monday: Math.floor(Math.random() * 2000) + 1000,
          Tuesday: Math.floor(Math.random() * 2000) + 1000,
          Wednesday: Math.floor(Math.random() * 2000) + 1000,
          Thursday: Math.floor(Math.random() * 2000) + 1000,
          Friday: Math.floor(Math.random() * 2000) + 1000,
          Saturday: Math.floor(Math.random() * 1000) + 500,
          Sunday: Math.floor(Math.random() * 1000) + 500,
        },
        topUsers: [
          { userId: 'user-1', requests: 450, tokens: 45000 },
          { userId: 'user-2', requests: 320, tokens: 32000 },
          { userId: 'user-3', requests: 280, tokens: 28000 },
        ],
      },
      errors: {
        totalErrors: Math.floor(Math.random() * 200) + 50,
        errorRate: 0.02 + Math.random() * 0.03,
        errorsByType: {
          'rate_limit': Math.floor(Math.random() * 50) + 10,
          'authentication': Math.floor(Math.random() * 30) + 5,
          'model_error': Math.floor(Math.random() * 40) + 8,
          'network_error': Math.floor(Math.random() * 25) + 3,
        },
        errorsByProvider: {
          'openai': Math.floor(Math.random() * 30) + 5,
          'anthropic': Math.floor(Math.random() * 20) + 3,
          'google': Math.floor(Math.random() * 40) + 8,
          'azure': Math.floor(Math.random() * 15) + 2,
        },
      },
      generatedAt: now.toISOString(),
    };
  }

  // Utility methods
  getHealthStatus(): any {
    const healthyProviders = this.providers.filter(p => p.health === 'healthy').length;
    const totalProviders = this.providers.length;
    
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (healthyProviders < totalProviders * 0.5) {
      overallHealth = 'unhealthy';
    } else if (healthyProviders < totalProviders * 0.8) {
      overallHealth = 'degraded';
    }

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        redis: 'healthy',
        providers: Object.fromEntries(
          this.providers.map(p => [p.id, p.health])
        ),
        contextService: 'healthy',
      },
    };
  }
}