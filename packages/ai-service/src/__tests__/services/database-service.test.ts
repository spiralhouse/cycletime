import { DatabaseService } from '../../services/database-service';
import { AIRequest, AIResponse, AiRequestType, AiRequestStatus } from '../../interfaces/ai-types';
import { PrismaClient } from '../../lib/prisma';

// Mock Prisma Client
const mockPrismaClient = {
  aiRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aiResponse: {
    create: jest.fn(),
  },
  usageTracking: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeEach(() => {
    databaseService = new DatabaseService(mockPrismaClient);
    jest.clearAllMocks();
  });

  describe('createAIRequest', () => {
    it('should create AI request in database', async () => {
      const mockDbRequest = {
        id: 'db-req-123',
        project_id: 'proj-456',
        user_id: 'user-789',
        type: 'PLANNING',
        status: 'PENDING',
        prompt: 'Test prompt',
        context: {},
        model: 'claude-4-sonnet',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPrismaClient.aiRequest.create as jest.Mock).mockResolvedValue(mockDbRequest);

      const request: AIRequest = {
        id: 'req-123',
        type: AiRequestType.PRD_ANALYSIS,
        prompt: 'Test prompt',
        model: 'claude-4-sonnet',
      };

      const result = await databaseService.createAIRequest(
        request,
        'user-789',
        'proj-456'
      );

      expect(mockPrismaClient.aiRequest.create).toHaveBeenCalledWith({
        data: {
          id: 'req-123',
          project_id: 'proj-456',
          user_id: 'user-789',
          type: 'PLANNING', // Mapped from PRD_ANALYSIS
          status: 'PENDING',
          prompt: 'Test prompt',
          context: {},
          model: 'claude-4-sonnet',
        },
      });

      expect(result.id).toBe('db-req-123');
    });

    it('should handle optional project_id', async () => {
      const mockDbRequest = {
        id: 'db-req-123',
        project_id: null,
        user_id: 'user-789',
        type: 'GENERAL',
        status: 'PENDING',
        prompt: 'Test prompt',
        context: {},
        model: 'claude-4-sonnet',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPrismaClient.aiRequest.create as jest.Mock).mockResolvedValue(mockDbRequest);

      const request: AIRequest = {
        id: 'req-123',
        type: AiRequestType.GENERAL_QUERY,
        prompt: 'Test prompt',
      };

      await databaseService.createAIRequest(request, 'user-789');

      expect(mockPrismaClient.aiRequest.create).toHaveBeenCalledWith({
        data: {
          id: 'req-123',
          project_id: null,
          user_id: 'user-789',
          type: 'GENERAL',
          status: 'PENDING',
          prompt: 'Test prompt',
          context: {},
          model: 'claude-4-sonnet',
        },
      });
    });
  });

  describe('updateAIRequestStatus', () => {
    it('should update request status', async () => {
      const mockUpdatedRequest = {
        id: 'req-123',
        status: 'PROCESSING',
        updated_at: new Date(),
      };

      (mockPrismaClient.aiRequest.update as jest.Mock).mockResolvedValue(mockUpdatedRequest);

      await databaseService.updateAIRequestStatus('req-123', AiRequestStatus.PROCESSING);

      expect(mockPrismaClient.aiRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: { status: 'PROCESSING' },
      });
    });
  });

  describe('storeAIResponse', () => {
    it('should store AI response in database', async () => {
      const mockDbResponse = {
        id: 'resp-456',
        request_id: 'req-123',
        content: 'AI response content',
        tokens_used: 150,
        model: 'claude-4-sonnet',
        finish_reason: 'end_turn',
        metadata: {},
        created_at: new Date(),
      };

      (mockPrismaClient.aiResponse.create as jest.Mock).mockResolvedValue(mockDbResponse);

      const aiResponse: AIResponse = {
        id: 'ai-resp-123',
        provider: 'claude',
        model: 'claude-4-sonnet',
        content: 'AI response content',
        metadata: {
          stopReason: 'end_turn',
          tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
          providerId: 'msg-abc123',
        },
        performance: {
          responseTimeMs: 2000,
          retryCount: 0,
        },
      };

      const result = await databaseService.storeAIResponse('req-123', aiResponse);

      expect(mockPrismaClient.aiResponse.create).toHaveBeenCalledWith({
        data: {
          id: 'ai-resp-123',
          request_id: 'req-123',
          content: 'AI response content',
          tokens_used: 150,
          model: 'claude-4-sonnet',
          finish_reason: 'end_turn',
          metadata: {
            provider: 'claude',
            providerId: 'msg-abc123',
            performance: {
              responseTimeMs: 2000,
              retryCount: 0,
            },
          },
        },
      });

      expect(result.id).toBe('resp-456');
    });
  });

  describe('trackUsage', () => {
    it('should track usage with cost calculation', async () => {
      const mockUsageTracking = {
        id: 'usage-789',
        request_id: 'req-123',
        model: 'claude-4-sonnet',
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        cost_estimate: 0.0045,
        created_at: new Date(),
      };

      (mockPrismaClient.usageTracking.create as jest.Mock).mockResolvedValue(mockUsageTracking);

      const result = await databaseService.trackUsage(
        'req-123',
        {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        'claude-4-sonnet',
        0.0045
      );

      expect(mockPrismaClient.usageTracking.create).toHaveBeenCalledWith({
        data: {
          request_id: 'req-123',
          model: 'claude-4-sonnet',
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
          cost_estimate: 0.0045,
        },
      });

      expect(result.id).toBe('usage-789');
    });
  });

  describe('getAIRequest', () => {
    it('should retrieve AI request by id', async () => {
      const mockDbRequest = {
        id: 'req-123',
        project_id: 'proj-456',
        user_id: 'user-789',
        type: 'PLANNING',
        status: 'COMPLETED',
        prompt: 'Test prompt',
        context: { feature: 'auth' },
        model: 'claude-4-sonnet',
        created_at: new Date(),
        updated_at: new Date(),
      };

      (mockPrismaClient.aiRequest.findUnique as jest.Mock).mockResolvedValue(mockDbRequest);

      const result = await databaseService.getAIRequest('req-123');

      expect(mockPrismaClient.aiRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        include: {
          responses: true,
          usage: true,
          project: true,
          user: true,
        },
      });

      expect(result?.id).toBe('req-123');
      expect(result?.type).toBe('PLANNING');
    });

    it('should return null for non-existent request', async () => {
      (mockPrismaClient.aiRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await databaseService.getAIRequest('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('mapAiRequestType', () => {
    it('should map AIRequest types to database enum values', () => {
      expect(databaseService.mapAiRequestType(AiRequestType.PRD_ANALYSIS)).toBe('PLANNING');
      expect(databaseService.mapAiRequestType(AiRequestType.PROJECT_PLAN_GENERATION)).toBe('PLANNING');
      expect(databaseService.mapAiRequestType(AiRequestType.TASK_BREAKDOWN)).toBe('TASK_ANALYSIS');
      expect(databaseService.mapAiRequestType(AiRequestType.DOCUMENT_GENERATION)).toBe('DOCUMENTATION');
      expect(databaseService.mapAiRequestType(AiRequestType.CODE_REVIEW)).toBe('CODE_REVIEW');
      expect(databaseService.mapAiRequestType(AiRequestType.GENERAL_QUERY)).toBe('GENERAL');
    });
  });
});