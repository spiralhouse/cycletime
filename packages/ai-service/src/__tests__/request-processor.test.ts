import { RequestProcessor } from '../request-processor';
import { QueueManager } from '../queue/queue-manager';
import { ClaudeProvider } from '../providers/claude-provider';
import { QueuePriority } from '../queue/redis-queue';

// Mock dependencies
jest.mock('../queue/queue-manager');
jest.mock('../providers/claude-provider');

describe('RequestProcessor', () => {
  let requestProcessor: RequestProcessor;
  let mockQueueManager: jest.Mocked<QueueManager>;
  let mockClaudeProvider: jest.Mocked<ClaudeProvider>;

  const defaultConfig = {
    redisUrl: 'redis://localhost:6379',
    maxConcurrentRequests: 5,
    processingTimeout: 30000,
    providers: {
      claude: {
        apiKey: 'test-api-key',
        baseUrl: 'https://api.anthropic.com',
        defaultModel: 'claude-3-sonnet-20240229',
      },
    },
  };

  beforeEach(() => {
    // Create mock QueueManager
    mockQueueManager = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(true),
      getHealthStatus: jest.fn().mockResolvedValue({
        isRunning: true,
        isHealthy: true,
        redisConnected: true,
        backgroundTasksActive: true,
        queueMetrics: {
          queueDepth: { high: 0, normal: 0, low: 0 },
          totalDepth: 0,
        },
        lastCleanupRun: Date.now(),
        lastRetryProcessRun: Date.now(),
      }),
      getQueueMetrics: jest.fn().mockResolvedValue({
        queueDepth: { high: 0, normal: 0, low: 0 },
        totalDepth: 0,
      }),
    } as unknown as jest.Mocked<QueueManager>;

    // Create mock ClaudeProvider
    mockClaudeProvider = {
      name: 'claude',
      models: ['claude-3-sonnet-20240229'],
      sendRequest: jest.fn().mockResolvedValue({
        id: 'resp_123',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        content: 'Test response',
        metadata: {
          tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        },
        performance: { responseTimeMs: 100, retryCount: 0 },
      }),
      calculateCost: jest.fn().mockReturnValue(0.05),
      validateConfig: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<ClaudeProvider>;

    // Mock constructors
    (QueueManager as jest.MockedClass<typeof QueueManager>).mockImplementation(() => mockQueueManager);
    (ClaudeProvider as jest.MockedClass<typeof ClaudeProvider>).mockImplementation(() => mockClaudeProvider);

    requestProcessor = new RequestProcessor(defaultConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create RequestProcessor with provided configuration', () => {
      expect(requestProcessor).toBeInstanceOf(RequestProcessor);
      expect(QueueManager).toHaveBeenCalledWith({
        redisUrl: defaultConfig.redisUrl,
      });
    });

    it('should initialize providers map correctly', () => {
      expect(ClaudeProvider).toHaveBeenCalledWith(defaultConfig.providers.claude.apiKey);
    });
  });

  describe('lifecycle management', () => {
    it('should start all required services', async () => {
      await requestProcessor.start();

      expect(mockQueueManager.start).toHaveBeenCalled();
      expect(requestProcessor.isRunning()).toBe(true);
    });

    it('should stop all services gracefully', async () => {
      await requestProcessor.start();
      await requestProcessor.stop();

      expect(mockQueueManager.stop).toHaveBeenCalled();
      expect(requestProcessor.isRunning()).toBe(false);
    });

    it('should handle startup failures correctly', async () => {
      mockQueueManager.start.mockRejectedValue(new Error('Queue startup failed'));

      await expect(requestProcessor.start()).rejects.toThrow('Queue startup failed');
      expect(requestProcessor.isRunning()).toBe(false);
    });
  });

  describe('request processing', () => {
    beforeEach(async () => {
      await requestProcessor.start();
    });

    it('should enqueue AI request with correct priority', async () => {
      const request = {
        prompt: 'Test prompt',
        model: 'claude-3-sonnet-20240229',
        provider: 'claude',
        priority: QueuePriority.HIGH,
        metadata: { userId: 'user123' },
      };

      const requestId = await requestProcessor.enqueueRequest(request);

      expect(requestId).toMatch(/^req_[a-zA-Z0-9_]+$/);
      expect(typeof requestId).toBe('string');
    });

    it('should process request with correct provider', async () => {
      const request = {
        prompt: 'Analyze this data',
        model: 'claude-3-sonnet-20240229',
        provider: 'claude',
        priority: QueuePriority.NORMAL,
      };

      const response = await requestProcessor.processRequest(request);

      expect(mockClaudeProvider.sendRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: request.prompt,
          model: request.model,
        })
      );
      expect(response).toEqual({
        id: 'resp_123',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        content: 'Test response',
        metadata: {
          tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        },
        performance: { responseTimeMs: 100, retryCount: 0 },
      });
    });

    it('should handle provider errors gracefully', async () => {
      const request = {
        prompt: 'Test prompt',
        model: 'claude-3-sonnet-20240229',
        provider: 'claude',
        priority: QueuePriority.NORMAL,
      };

      mockClaudeProvider.sendRequest.mockRejectedValue(new Error('Provider error'));

      await expect(requestProcessor.processRequest(request)).rejects.toThrow('Provider error');
    });

    it('should validate request format', async () => {
      const invalidRequest = {
        prompt: '', // Empty prompt
        model: 'invalid-model',
        provider: 'unknown-provider',
      };

      await expect(requestProcessor.enqueueRequest(invalidRequest as any)).rejects.toThrow();
    });
  });

  describe('status tracking', () => {
    it('should track request status through lifecycle', async () => {
      await requestProcessor.start();
      
      // Create a request first
      const request = {
        prompt: 'Test prompt for status tracking',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        priority: QueuePriority.NORMAL,
      };
      const requestId = await requestProcessor.enqueueRequest(request);

      // Should start with PENDING status
      const initialStatus = await requestProcessor.getRequestStatus(requestId);
      expect(initialStatus.status).toBe('PENDING');

      // Should update to PROCESSING when started
      await requestProcessor.updateRequestStatus(requestId, 'PROCESSING');
      const processingStatus = await requestProcessor.getRequestStatus(requestId);
      expect(processingStatus.status).toBe('PROCESSING');
    });

    it('should handle non-existent request status queries', async () => {
      await requestProcessor.start();

      await expect(requestProcessor.getRequestStatus('nonexistent')).rejects.toThrow('Request not found');
    });

    it('should provide request metadata in status', async () => {
      await requestProcessor.start();
      
      // Create a request first
      const request = {
        prompt: 'Test prompt for metadata',
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
      };
      const requestId = await requestProcessor.enqueueRequest(request);

      const status = await requestProcessor.getRequestStatus(requestId);
      expect(status).toMatchObject({
        requestId,
        status: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('health monitoring', () => {
    it('should provide comprehensive health status', async () => {
      await requestProcessor.start();

      const health = await requestProcessor.getHealthStatus();

      expect(health).toEqual({
        isRunning: true,
        isHealthy: true,
        services: {
          queueManager: {
            isRunning: true,
            isHealthy: true,
            redisConnected: true,
            backgroundTasksActive: true,
          },
          providers: {
            claude: { isHealthy: true },
          },
        },
        metrics: {
          queueDepth: { high: 0, normal: 0, low: 0 },
          totalDepth: 0,
        },
      });
    });

    it('should detect unhealthy services', async () => {
      await requestProcessor.start();
      mockQueueManager.getHealthStatus.mockResolvedValue({
        isRunning: true,
        isHealthy: false,
        redisConnected: false,
        backgroundTasksActive: true,
        queueMetrics: { queueDepth: { high: 0, normal: 0, low: 0 }, totalDepth: 0 },
        lastCleanupRun: Date.now(),
        lastRetryProcessRun: Date.now(),
      });

      const health = await requestProcessor.getHealthStatus();

      expect(health.isHealthy).toBe(false);
      expect(health.services.queueManager.isHealthy).toBe(false);
    });
  });

  describe('request cancellation', () => {
    it('should cancel pending requests successfully', async () => {
      await requestProcessor.start();
      
      // Create a request first
      const request = {
        prompt: 'Test prompt for cancellation',
        provider: 'claude',
      };
      const requestId = await requestProcessor.enqueueRequest(request);

      const result = await requestProcessor.cancelRequest(requestId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('CANCELLED');
    });

    it('should handle cancellation of processing requests', async () => {
      await requestProcessor.start();
      
      // Create a request first
      const request = {
        prompt: 'Test prompt for processing cancellation',
        provider: 'claude',
      };
      const requestId = await requestProcessor.enqueueRequest(request);
      
      // Set request to processing status
      await requestProcessor.updateRequestStatus(requestId, 'PROCESSING');

      const result = await requestProcessor.cancelRequest(requestId);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Request is currently being processed and cannot be cancelled');
    });
  });

  describe('error handling', () => {
    it('should handle queue manager failures gracefully', async () => {
      mockQueueManager.start.mockRejectedValue(new Error('Queue connection failed'));

      await expect(requestProcessor.start()).rejects.toThrow('Queue connection failed');
      expect(requestProcessor.isRunning()).toBe(false);
    });

    it('should handle provider initialization failures', async () => {
      (ClaudeProvider as jest.MockedClass<typeof ClaudeProvider>).mockImplementation(() => {
        throw new Error('Provider initialization failed');
      });

      expect(() => new RequestProcessor(defaultConfig)).toThrow('Provider initialization failed');
    });

    it('should provide meaningful error messages', async () => {
      await requestProcessor.start();
      
      const invalidRequest = { prompt: '' };

      await expect(requestProcessor.enqueueRequest(invalidRequest as any)).rejects.toThrow(
        /Invalid request: prompt cannot be empty/
      );
    });
  });

  describe('configuration validation', () => {
    it('should validate required configuration parameters', () => {
      const invalidConfig = {};

      expect(() => new RequestProcessor(invalidConfig as any)).toThrow(
        /Missing required configuration/
      );
    });

    it('should use default values for optional parameters', () => {
      const minimalConfig = {
        redisUrl: 'redis://localhost:6379',
        providers: {
          claude: {
            apiKey: 'test-key',
          },
        },
      };

      const processor = new RequestProcessor(minimalConfig);
      expect(processor).toBeInstanceOf(RequestProcessor);
    });
  });
});