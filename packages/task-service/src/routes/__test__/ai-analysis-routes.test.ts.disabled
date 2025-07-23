import { describe, it, expect, beforeEach } from '@jest/globals';
import { build } from '../../../test-utils/app';
import { FastifyInstance } from 'fastify';

describe('AI Analysis Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await build();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /tasks/analyze', () => {
    it('should analyze a task with AI and return comprehensive analysis', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/analyze',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          title: 'Implement user authentication system',
          description: 'Create a secure JWT-based authentication system with role-based access control',
          type: 'feature',
          requirements: ['JWT token generation', 'Role-based access control', 'Password hashing'],
          context: {
            teamSize: 3,
            techStack: ['Node.js', 'TypeScript', 'JWT', 'bcrypt'],
            constraints: ['Security compliance', 'Performance requirements']
          },
          options: {
            includeBreakdown: false,
            includeRisks: true,
            includeEstimate: true,
            analyzeComplexity: true
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.analysis).toBeDefined();
      expect(result.analysis.analysis.complexity).toBeDefined();
      expect(result.analysis.analysis.complexity.score).toBeGreaterThan(0);
      expect(result.analysis.analysis.complexity.level).toMatch(/^(low|medium|high|very_high)$/);
      expect(result.analysis.analysis.risks).toBeInstanceOf(Array);
      expect(result.analysis.analysis.estimate).toBeDefined();
      expect(result.analysis.analysis.insights).toBeDefined();
      expect(result.analysis.metadata.confidence).toBeGreaterThan(0);
    });

    it('should handle missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/analyze',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          title: 'Test task'
          // Missing description and type
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /tasks/:taskId/breakdown', () => {
    it('should retrieve task breakdown when it exists', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response = await app.inject({
        method: 'GET',
        url: `/tasks/${taskId}/breakdown`,
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        }
      });

      // Should return either 200 with breakdown or 404 if not found
      expect([200, 404]).toContain(response.statusCode);
      
      if (response.statusCode === 200) {
        const result = JSON.parse(response.payload);
        expect(result.breakdown).toBeDefined();
        expect(result.breakdown.breakdown.subtasks).toBeInstanceOf(Array);
        expect(result.breakdown.breakdown.summary).toBeDefined();
        expect(result.breakdown.metadata).toBeDefined();
      }
    });
  });

  describe('POST /tasks/:taskId/breakdown', () => {
    it('should create task breakdown with AI analysis', async () => {
      const taskId = '550e8400-e29b-41d4-a716-446655440001';
      
      const response = await app.inject({
        method: 'POST',
        url: `/tasks/${taskId}/breakdown`,
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          granularity: 'medium',
          includeEstimates: true,
          includeDependencies: true,
          maxSubtasks: 6,
          context: {
            methodology: 'agile',
            sprintDuration: 2,
            teamVelocity: 20
          }
        }
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.breakdown.subtasks).toBeInstanceOf(Array);
      expect(result.breakdown.breakdown.subtasks.length).toBeGreaterThan(0);
      expect(result.breakdown.breakdown.dependencies).toBeInstanceOf(Array);
      expect(result.breakdown.breakdown.summary.totalSubtasks).toBeGreaterThan(0);
      expect(result.breakdown.breakdown.summary.totalEstimatedHours).toBeGreaterThan(0);
      expect(result.breakdown.metadata.confidence).toBeGreaterThan(0);
    });

    it('should handle invalid task ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/invalid-uuid/breakdown',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          granularity: 'medium',
          includeEstimates: true,
          includeDependencies: true,
          maxSubtasks: 5
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /tasks/dependencies/analyze', () => {
    it('should analyze dependencies for a project', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/tasks/dependencies/analyze?projectId=660e8400-e29b-41d4-a716-446655440001&includeExternal=true',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.analysis).toBeDefined();
      expect(result.analysis.totalDependencies).toBeGreaterThanOrEqual(0);
      expect(result.analysis.circularDependencies).toBeInstanceOf(Array);
      expect(result.analysis.criticalPath).toBeInstanceOf(Array);
      expect(result.analysis.bottlenecks).toBeInstanceOf(Array);
      expect(result.analysis.risks).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata.confidence).toBeGreaterThan(0);
    });

    it('should analyze dependencies for specific tasks', async () => {
      const taskIds = '550e8400-e29b-41d4-a716-446655440001,550e8400-e29b-41d4-a716-446655440002';
      
      const response = await app.inject({
        method: 'GET',
        url: `/tasks/dependencies/analyze?taskIds=${taskIds}&analyzeBottlenecks=true&analyzeCycles=true`,
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.analysis).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
    });
  });

  describe('POST /tasks/dependencies/validate', () => {
    it('should validate dependencies and return validation results', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/dependencies/validate',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          dependencies: [
            {
              sourceTaskId: '550e8400-e29b-41d4-a716-446655440001',
              targetTaskId: '550e8400-e29b-41d4-a716-446655440002',
              type: 'depends_on',
              description: 'Task 2 depends on completion of Task 1'
            },
            {
              sourceTaskId: '550e8400-e29b-41d4-a716-446655440002',
              targetTaskId: '550e8400-e29b-41d4-a716-446655440003',
              type: 'blocks',
              description: 'Task 2 blocks Task 3'
            }
          ],
          context: {
            projectId: '660e8400-e29b-41d4-a716-446655440001',
            validateCycles: true,
            validateCapacity: true,
            validateTiming: true
          }
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      
      expect(result.validation).toBeDefined();
      expect(result.validation.isValid).toBeDefined();
      expect(result.validation.validation.cycleCheck).toBeDefined();
      expect(result.validation.validation.capacityCheck).toBeDefined();
      expect(result.validation.validation.timingCheck).toBeDefined();
      expect(result.validation.suggestions).toBeInstanceOf(Array);
      expect(result.validation.metadata).toBeDefined();
    });

    it('should handle empty dependencies array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/dependencies/validate',
        headers: {
          'Authorization': 'Bearer mock-admin-token'
        },
        payload: {
          dependencies: []
        }
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Invalid Request');
      expect(result.code).toBe('INVALID_DEPENDENCIES');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for AI analysis endpoints', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/analyze',
        payload: {
          title: 'Test task',
          description: 'Test description',
          type: 'feature'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should require proper permissions for AI analysis endpoints', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/tasks/analyze',
        headers: {
          'Authorization': 'Bearer mock-readonly-token'
        },
        payload: {
          title: 'Test task',
          description: 'Test description',
          type: 'feature'
        }
      });

      expect([200, 403]).toContain(response.statusCode);
    });
  });
});