/**
 * Type validation tests
 */

import {
  APIResponse,
  APIError,
  HttpStatus,
  PaginatedResponse,
  BaseEntity,
  User,
  UserContext,
  JWTPayload,
  APIKey,
  ProjectRole,
  AiRequestType,
  AiRequestStatus,
  AiProvider,
  AIRequest,
  AIResponse,
  TokenUsage,
  Project,
  Document,
  DocumentType,
  Task,
  TaskStatus,
  VERSION
} from '../index';

describe('Shared Types', () => {
  describe('Common Types', () => {
    it('should validate APIResponse structure', () => {
      const response: APIResponse<string> = {
        success: true,
        data: 'test data',
        metadata: {
          requestId: 'req-123',
          timestamp: '2023-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('test data');
      expect(response.metadata?.requestId).toBe('req-123');
    });

    it('should validate APIError structure', () => {
      const error: APIError = {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input provided',
        details: { field: 'email' },
        field: 'email'
      };

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input provided');
    });

    it('should validate HttpStatus enum', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('should validate BaseEntity structure', () => {
      const entity: BaseEntity = {
        id: 'entity-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(entity.id).toBe('entity-123');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Auth Types', () => {
    it('should validate User structure', () => {
      const user: User = {
        id: 'user-123',
        email: 'test@example.com',
        githubUsername: 'testuser',
        name: 'Test User',
        avatarUrl: 'https://avatar.url',
        githubId: 12345,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(user.email).toBe('test@example.com');
      expect(user.githubId).toBe(12345);
    });

    it('should validate JWTPayload structure', () => {
      const payload: JWTPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        github_id: 12345,
        github_username: 'testuser',
        name: 'Test User',
        avatar_url: 'https://avatar.url',
        iat: Date.now(),
        exp: Date.now() + 3600000
      };

      expect(payload.sub).toBe('user-123');
      expect(payload.github_id).toBe(12345);
    });

    it('should validate ProjectRole enum', () => {
      expect(ProjectRole.OWNER).toBe('OWNER');
      expect(ProjectRole.ADMIN).toBe('ADMIN');
      expect(ProjectRole.MEMBER).toBe('MEMBER');
      expect(ProjectRole.VIEWER).toBe('VIEWER');
    });
  });

  describe('AI Types', () => {
    it('should validate AiRequestType enum', () => {
      expect(AiRequestType.PRD_ANALYSIS).toBe('PRD_ANALYSIS');
      expect(AiRequestType.CODE_REVIEW).toBe('CODE_REVIEW');
    });

    it('should validate AiProvider enum', () => {
      expect(AiProvider.CLAUDE).toBe('claude');
      expect(AiProvider.OPENAI).toBe('openai');
    });

    it('should validate TokenUsage structure', () => {
      const usage: TokenUsage = {
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300
      };

      expect(usage.totalTokens).toBe(300);
      expect(usage.inputTokens + usage.outputTokens).toBe(usage.totalTokens);
    });

    it('should validate AIRequest structure', () => {
      const request: AIRequest = {
        id: 'req-123',
        userId: 'user-123',
        provider: AiProvider.CLAUDE,
        model: 'claude-3-sonnet',
        type: AiRequestType.PRD_ANALYSIS,
        prompt: 'Analyze this PRD',
        status: AiRequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(request.provider).toBe(AiProvider.CLAUDE);
      expect(request.type).toBe(AiRequestType.PRD_ANALYSIS);
    });
  });

  describe('Project Types', () => {
    it('should validate DocumentType enum', () => {
      expect(DocumentType.PRD).toBe('PRD');
      expect(DocumentType.API_DOCS).toBe('API_DOCS');
    });

    it('should validate TaskStatus enum', () => {
      expect(TaskStatus.TODO).toBe('TODO');
      expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(TaskStatus.DONE).toBe('DONE');
    });

    it('should validate Project structure', () => {
      const project: Project = {
        id: 'project-123',
        name: 'Test Project',
        description: 'A test project',
        ownerId: 'user-123',
        settings: {
          enableGithubIntegration: true,
          enableLinearIntegration: true,
          enableDocumentGeneration: true,
          notifications: {
            email: true,
            slack: false,
            discord: false
          }
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };

      expect(project.name).toBe('Test Project');
      expect(project.settings.enableGithubIntegration).toBe(true);
    });
  });

  describe('Package Info', () => {
    it('should export version information', () => {
      expect(VERSION).toBe('0.1.0');
    });
  });
});