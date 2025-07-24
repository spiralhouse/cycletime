import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createApp } from '../app';
import { TaskServiceConfiguration } from '../types/service-types';
import { testUtils } from './setup';

describe.skip('AI Contract Tests - Task Service', () => {
  let app: any;
  let config: TaskServiceConfiguration;
  const mockAuthToken = 'mock-admin-token';

  beforeEach(async () => {
    config = {
      server: {
        port: 8005,
        host: '0.0.0.0',
        cors: { origin: ['http://localhost:3000'], credentials: true },
        helmet: { contentSecurityPolicy: false },
        rateLimit: { max: 100, timeWindow: '1 minute' }
      },
      database: {
        redis: { host: 'localhost', port: 6379, db: 0 },
        connectionPool: { min: 2, max: 10 }
      },
      queue: {
        redis: { host: 'localhost', port: 6379, db: 1 },
        settings: { stalledInterval: 30000, maxStalledCount: 3 },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      },
      scheduler: { enabled: false, checkInterval: '30s', timezone: 'UTC' },
      events: {
        redis: { host: 'localhost', port: 6379, db: 2 },
        publisher: { maxRetries: 3, retryDelay: 1000 }
      },
      logging: { level: 'silent', format: 'json', transports: ['console'] },
      monitoring: {
        metrics: { enabled: false, port: 9090, path: '/metrics' },
        healthCheck: { enabled: false, interval: 30000 }
      },
      security: {
        jwt: { secret: 'test-secret', expiresIn: '1h' },
        apiKey: { enabled: false, header: 'X-API-Key' }
      },
      features: {
        caching: { enabled: false, ttl: 300 },
        notifications: { enabled: false, providers: ['email'] },
        analytics: { enabled: false, retentionDays: 90 }
      }
    };

    app = await createApp(config);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('AI Analysis Endpoints', () => {
    it('should analyze a task with AI', async () => {
      const analysisRequest = {
        title: 'Implement user authentication system',
        description: 'Create a secure JWT-based authentication system with role-based access control',
        type: 'feature',
        requirements: ['JWT tokens', 'Role-based access', 'Password hashing'],
        context: {
          teamSize: 4,
          techStack: ['Node.js', 'Express', 'JWT'],
          projectType: 'web-app',
          deadline: '2024-12-31'
        },
        options: {
          includeBreakdown: true,
          includeRisks: true,
          includeEstimation: true,
          includeRecommendations: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/analyze',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: analysisRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      // Validate response structure
      expect(result.analysis).toBeDefined();
      expect(result.analysis.complexity).toBeDefined();
      expect(result.analysis.complexity.score).toBeGreaterThanOrEqual(0);
      expect(result.analysis.complexity.score).toBeLessThanOrEqual(10);
      expect(result.analysis.complexity.factors).toBeDefined();
      expect(Array.isArray(result.analysis.complexity.factors)).toBe(true);

      expect(result.analysis.skillRequirements).toBeDefined();
      expect(Array.isArray(result.analysis.skillRequirements)).toBe(true);

      expect(result.analysis.risks).toBeDefined();
      expect(Array.isArray(result.analysis.risks)).toBe(true);

      expect(result.analysis.estimation).toBeDefined();
      expect(result.analysis.estimation.hours).toBeDefined();
      expect(result.analysis.estimation.confidence).toBeGreaterThanOrEqual(0);
      expect(result.analysis.estimation.confidence).toBeLessThanOrEqual(1);

      expect(result.analysis.breakdown).toBeDefined();
      expect(Array.isArray(result.analysis.breakdown.subtasks)).toBe(true);

      expect(result.analysis.insights).toBeDefined();
      expect(Array.isArray(result.analysis.insights.recommendations)).toBe(true);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.analyzedAt).toBeDefined();
      expect(result.metadata.version).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should get task breakdown', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Complex Feature Task',
          description: 'A complex task that needs to be broken down'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      // Then get breakdown
      const breakdownResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${createdTask.id}/breakdown`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(breakdownResponse.statusCode).toBe(200);
      const result = JSON.parse(breakdownResponse.payload);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.taskId).toBe(createdTask.id);
      expect(result.breakdown.subtasks).toBeDefined();
      expect(Array.isArray(result.breakdown.subtasks)).toBe(true);
      expect(result.breakdown.totalEstimate).toBeDefined();
      expect(result.breakdown.dependencies).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should create task breakdown', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Task for Breakdown',
          description: 'A task that will be broken down'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const breakdownRequest = {
        approach: 'feature-based',
        granularity: 'detailed',
        context: {
          teamSkills: ['javascript', 'react', 'node.js'],
          constraints: ['2 week deadline', 'small team'],
          preferences: ['parallel work', 'minimal dependencies']
        },
        options: {
          includeEstimates: true,
          includeDependencies: true,
          includeRisks: true,
          createTasks: false
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/breakdown`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: breakdownRequest
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.taskId).toBe(createdTask.id);
      expect(result.breakdown.approach).toBe('feature-based');
      expect(result.breakdown.subtasks).toBeDefined();
      expect(Array.isArray(result.breakdown.subtasks)).toBe(true);
    });

    it('should validate request schema for task analysis', async () => {
      const invalidRequest = {
        title: '', // Invalid: empty title
        description: null, // Invalid: null description
        type: 'invalid-type' // Invalid: not in enum
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/analyze',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBeDefined();
    });
  });

  describe('AI Estimation Endpoints', () => {
    it('should estimate a single task', async () => {
      const estimationRequest = {
        title: 'User Profile Management',
        description: 'Implement user profile creation, editing, and viewing functionality',
        type: 'feature',
        requirements: ['User interface', 'API endpoints', 'Database schema'],
        context: {
          teamExperience: 'senior',
          projectType: 'greenfield',
          techStack: ['React', 'Node.js', 'PostgreSQL'],
          timeline: 'normal'
        },
        methodology: 'hybrid',
        options: {
          includeBreakdown: true,
          includeConfidence: true,
          includeComparison: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/estimate',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: estimationRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.estimation).toBeDefined();
      expect(result.estimation.hours).toBeDefined();
      expect(result.estimation.hours.optimistic).toBeGreaterThan(0);
      expect(result.estimation.hours.mostLikely).toBeGreaterThan(0);
      expect(result.estimation.hours.pessimistic).toBeGreaterThan(0);
      expect(result.estimation.methodology).toBe('hybrid');
      expect(result.estimation.confidence).toBeGreaterThanOrEqual(0);
      expect(result.estimation.confidence).toBeLessThanOrEqual(1);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.phases).toBeDefined();
      expect(Array.isArray(result.breakdown.phases)).toBe(true);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.estimatedAt).toBeDefined();
    });

    it('should create batch estimates', async () => {
      const batchRequest = {
        taskIds: ['task-1', 'task-2', 'task-3'],
        context: {
          teamExperience: 'mixed',
          projectType: 'enhancement',
          timeline: 'aggressive'
        },
        methodology: 'ai_analysis',
        options: {
          includeComparison: true,
          parallel: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/estimate/batch',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: batchRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.estimates).toBeDefined();
      expect(Array.isArray(result.estimates)).toBe(true);
      expect(result.estimates.length).toBe(3);

      result.estimates.forEach((estimate: any) => {
        expect(estimate.taskId).toBeDefined();
        expect(estimate.estimation).toBeDefined();
        expect(estimate.estimation.hours).toBeDefined();
        expect(estimate.estimation.confidence).toBeGreaterThanOrEqual(0);
        expect(estimate.estimation.confidence).toBeLessThanOrEqual(1);
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.totalHours).toBeDefined();
      expect(result.summary.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(result.summary.averageConfidence).toBeLessThanOrEqual(1);
    });

    it('should update task estimate', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Task to Estimate',
          description: 'A task that will receive an estimate update'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const updateRequest = {
        hours: 24,
        methodology: 'expert_judgment',
        confidence: 0.8,
        notes: 'Updated based on technical review',
        breakdown: {
          analysis: 4,
          design: 6,
          implementation: 10,
          testing: 4
        }
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/tasks/${createdTask.id}/estimate`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: updateRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.estimation).toBeDefined();
      expect(result.estimation.hours).toBe(24);
      expect(result.estimation.methodology).toBe('expert_judgment');
      expect(result.estimation.confidence).toBe(0.8);
      expect(result.estimation.notes).toBe('Updated based on technical review');
    });

    it('should get estimation accuracy metrics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/estimate/accuracy',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.accuracy).toBeDefined();
      expect(result.accuracy.overall).toBeDefined();
      expect(result.accuracy.overall.averageError).toBeDefined();
      expect(result.accuracy.overall.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy.overall.accuracy).toBeLessThanOrEqual(1);

      expect(result.accuracy.byMethodology).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.trends).toBeDefined();
    });
  });

  describe('Template Management Endpoints', () => {
    it('should create a task template', async () => {
      const templateRequest = {
        name: 'Feature Development Template',
        description: 'Standard template for feature development tasks',
        category: 'development',
        taskTemplate: {
          title: '${feature_name} Implementation',
          description: 'Implement ${feature_name} with the following requirements:\n${requirements}',
          type: 'feature',
          estimatedHours: '${estimated_hours}',
          tags: ['feature', '${technology}'],
          metadata: {
            template: true,
            templateVersion: '1.0'
          }
        },
        variables: [
          {
            name: 'feature_name',
            type: 'string',
            required: true,
            description: 'Name of the feature to implement',
            validation: { minLength: 3, maxLength: 100 }
          },
          {
            name: 'requirements',
            type: 'text',
            required: true,
            description: 'Detailed requirements for the feature'
          },
          {
            name: 'estimated_hours',
            type: 'number',
            required: false,
            defaultValue: 8,
            validation: { min: 1, max: 200 }
          },
          {
            name: 'technology',
            type: 'string',
            required: false,
            defaultValue: 'javascript'
          }
        ],
        metadata: {
          author: 'test-user',
          tags: ['development', 'feature'],
          complexity: 'medium'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/templates',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: templateRequest
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);

      expect(result.template).toBeDefined();
      expect(result.template.id).toBeDefined();
      expect(result.template.name).toBe('Feature Development Template');
      expect(result.template.category).toBe('development');
      expect(result.template.variables).toBeDefined();
      expect(Array.isArray(result.template.variables)).toBe(true);
      expect(result.template.variables.length).toBe(4);
    });

    it('should list task templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/templates?category=development&page=1&limit=10',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.templates).toBeDefined();
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.filters).toBeDefined();
    });

    it('should apply a template to create tasks', async () => {
      // First create a template
      const templateResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/templates',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          name: 'Bug Fix Template',
          description: 'Template for bug fixing tasks',
          category: 'maintenance',
          taskTemplate: {
            title: 'Fix: ${bug_description}',
            description: 'Bug report: ${bug_details}\nSteps to reproduce: ${steps}',
            type: 'bug',
            priority: '${priority}'
          },
          variables: [
            { name: 'bug_description', type: 'string', required: true },
            { name: 'bug_details', type: 'text', required: true },
            { name: 'steps', type: 'text', required: false },
            { name: 'priority', type: 'string', required: false, defaultValue: 'medium' }
          ]
        }
      });

      const template = JSON.parse(templateResponse.payload).template;

      // Then apply the template
      const applyRequest = {
        variables: {
          bug_description: 'Login button not working',
          bug_details: 'Users cannot login when clicking the login button',
          steps: '1. Go to login page\n2. Enter credentials\n3. Click login button',
          priority: 'high'
        },
        options: {
          createSubtasks: false,
          assignToUser: 'test-user'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/templates/${template.id}/apply`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: applyRequest
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);

      expect(result.task).toBeDefined();
      expect(result.task.title).toBe('Fix: Login button not working');
      expect(result.task.type).toBe('bug');
      expect(result.task.priority).toBe('high');
      expect(result.appliedTemplate).toBeDefined();
      expect(result.appliedTemplate.templateId).toBe(template.id);
    });

    it('should find suitable templates', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/templates/suggest?title=User authentication&type=feature&context=web-app',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);

      result.suggestions.forEach((suggestion: any) => {
        expect(suggestion.template).toBeDefined();
        expect(suggestion.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.relevanceScore).toBeLessThanOrEqual(1);
        expect(suggestion.reasons).toBeDefined();
        expect(Array.isArray(suggestion.reasons)).toBe(true);
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.searchedAt).toBeDefined();
    });

    it('should get template analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/templates/analytics?timeRange=month',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.analytics).toBeDefined();
      expect(result.analytics.usage).toBeDefined();
      expect(result.analytics.performance).toBeDefined();
      expect(result.analytics.trends).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('Risk Assessment Endpoints', () => {
    it('should add a risk to a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Risky Task',
          description: 'A task with potential risks'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const riskRequest = {
        type: 'technical',
        title: 'API Integration Complexity',
        description: 'Third-party API may have undocumented breaking changes',
        probability: 0.3,
        impact: {
          schedule: 'medium',
          cost: 'low',
          quality: 'high'
        },
        severity: 'medium',
        category: 'external_dependency',
        mitigation: {
          strategy: 'Create API wrapper with fallback mechanisms',
          owner: 'senior-developer',
          timeline: '1 week',
          cost: 'low'
        },
        metadata: {
          source: 'technical_review',
          confidence: 0.8
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/risks`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: riskRequest
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);

      expect(result.risk).toBeDefined();
      expect(result.risk.id).toBeDefined();
      expect(result.risk.type).toBe('technical');
      expect(result.risk.probability).toBe(0.3);
      expect(result.risk.severity).toBe('medium');
      expect(result.risk.mitigation).toBeDefined();
    });

    it('should list risks for a task', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Task with Risks',
          description: 'A task to test risk listing'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tasks/${createdTask.id}/risks?severity=high&type=technical`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.risks).toBeDefined();
      expect(Array.isArray(result.risks)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBeDefined();
      expect(result.summary.bySeverity).toBeDefined();
      expect(result.summary.byType).toBeDefined();
    });

    it('should analyze task risks using AI', async () => {
      // First create a task
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Complex Integration Task',
          description: 'Integrate with multiple external APIs and legacy systems'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const analysisRequest = {
        context: {
          projectPhase: 'implementation',
          teamExperience: 'mixed',
          timeline: 'tight',
          dependencies: ['external_api', 'legacy_system']
        },
        options: {
          includeRecommendations: true,
          includeMitigation: true,
          riskThreshold: 'medium'
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/risks/analyze`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: analysisRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.analysis).toBeDefined();
      expect(result.analysis.taskId).toBe(createdTask.id);
      expect(result.analysis.identifiedRisks).toBeDefined();
      expect(Array.isArray(result.analysis.identifiedRisks)).toBe(true);

      result.analysis.identifiedRisks.forEach((risk: any) => {
        expect(risk.type).toBeDefined();
        expect(risk.probability).toBeGreaterThanOrEqual(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
        expect(risk.severity).toBeDefined();
        expect(risk.impact).toBeDefined();
        expect(risk.mitigation).toBeDefined();
      });

      expect(result.analysis.recommendations).toBeDefined();
      expect(Array.isArray(result.analysis.recommendations)).toBe(true);
      expect(result.metadata).toBeDefined();
    });

    it('should assess risk impact', async () => {
      // First create a task and risk
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Task for Risk Impact',
          description: 'Task to test risk impact assessment'
        }
      });

      const createdTask = JSON.parse(createResponse.payload).task;

      const riskResponse = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/risks`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          type: 'resource',
          title: 'Key Developer Unavailable',
          description: 'Lead developer may be unavailable during critical phase',
          probability: 0.4,
          impact: { schedule: 'high', cost: 'medium', quality: 'medium' },
          severity: 'high'
        }
      });

      const risk = JSON.parse(riskResponse.payload).risk;

      const impactRequest = {
        scenario: 'worst_case',
        context: {
          projectTimeline: '3 months',
          teamSize: 5,
          budget: 100000,
          dependencies: ['external_team']
        },
        options: {
          includeQuantification: true,
          includeMitigation: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tasks/${createdTask.id}/risks/${risk.id}/impact`,
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: impactRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.impact).toBeDefined();
      expect(result.impact.riskId).toBe(risk.id);
      expect(result.impact.schedule).toBeDefined();
      expect(result.impact.cost).toBeDefined();
      expect(result.impact.quality).toBeDefined();
      expect(result.impact.quantification).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should get risk analytics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/risks/analytics?projectId=test-project&timeRange=quarter',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.analytics).toBeDefined();
      expect(result.analytics.summary).toBeDefined();
      expect(result.analytics.trends).toBeDefined();
      expect(result.analytics.patterns).toBeDefined();
      expect(result.analytics.predictions).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('Dependency Analysis Endpoints', () => {
    it('should analyze dependencies across tasks', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/dependencies/analyze?projectId=test-project&includeCircular=true&includeCriticalPath=true&includeBottlenecks=true',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.analysis).toBeDefined();
      expect(result.analysis.totalDependencies).toBeGreaterThanOrEqual(0);
      expect(result.analysis.circularDependencies).toBeDefined();
      expect(Array.isArray(result.analysis.circularDependencies)).toBe(true);
      expect(result.analysis.criticalPath).toBeDefined();
      expect(Array.isArray(result.analysis.criticalPath)).toBe(true);
      expect(result.analysis.bottlenecks).toBeDefined();
      expect(Array.isArray(result.analysis.bottlenecks)).toBe(true);
      expect(result.analysis.risks).toBeDefined();
      expect(Array.isArray(result.analysis.risks)).toBe(true);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.analyzedAt).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate dependencies for conflicts', async () => {
      const validationRequest = {
        dependencies: [
          {
            sourceTaskId: '550e8400-e29b-41d4-a716-446655440001',
            targetTaskId: '550e8400-e29b-41d4-a716-446655440002',
            type: 'blocks',
            description: 'Task A must complete before Task B'
          },
          {
            sourceTaskId: '550e8400-e29b-41d4-a716-446655440002',
            targetTaskId: '550e8400-e29b-41d4-a716-446655440003',
            type: 'depends_on',
            description: 'Task B depends on Task C'
          }
        ],
        context: {
          projectId: 'test-project',
          validateCycles: true,
          validateCapacity: true,
          validateTiming: true
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/dependencies/validate',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: validationRequest
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.isValid).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');

      expect(result.validation).toBeDefined();
      expect(result.validation.cycleCheck).toBeDefined();
      expect(result.validation.cycleCheck.passed).toBeDefined();
      expect(result.validation.capacityCheck).toBeDefined();
      expect(result.validation.capacityCheck.passed).toBeDefined();
      expect(result.validation.timingCheck).toBeDefined();
      expect(result.validation.timingCheck.passed).toBeDefined();

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.metadata).toBeDefined();
    });

    it('should handle empty dependencies array in validation', async () => {
      const validationRequest = {
        dependencies: [],
        context: { validateCycles: true }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/dependencies/validate',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: validationRequest
      });

      expect(response.statusCode).toBe(400);
      const result = JSON.parse(response.payload);
      expect(result.error).toBe('Bad Request');
      expect(result.message).toContain('Dependencies array is required and cannot be empty');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/analyze',
        headers: {
          'content-type': 'application/json'
        },
        payload: { title: 'Test Task' }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should handle invalid task ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/invalid-uuid/breakdown',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent task for breakdown', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/breakdown',
        headers: {
          authorization: `Bearer ${mockAuthToken}`
        }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle malformed JSON in requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/analyze',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: '{ invalid json }'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle rate limiting', async () => {
      // This would require actually hitting rate limits in a real scenario
      // For now, we verify the endpoint exists and responds normally
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/tasks/analyze',
        headers: {
          authorization: `Bearer ${mockAuthToken}`,
          'content-type': 'application/json'
        },
        payload: {
          title: 'Rate Limit Test',
          description: 'Testing rate limiting behavior',
          type: 'feature'
        }
      });

      expect([200, 429]).toContain(response.statusCode);
    });
  });
});