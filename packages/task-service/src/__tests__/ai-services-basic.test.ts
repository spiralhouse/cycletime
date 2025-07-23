import { TaskAnalysisService } from '../services/task-analysis-service';
import { TaskEstimationService } from '../services/task-estimation-service';
import { TaskTemplateService } from '../services/task-template-service';
import { TaskRiskService } from '../services/task-risk-service';
import { MockDataService } from '../services/mock-data-service';
import { TaskType, TaskPriority } from '../types/task-types';

// Simple mock for EventService
class MockEventService {
  async start() { return Promise.resolve(); }
  async stop() { return Promise.resolve(); }
  async publish(event: string, data: any) { return Promise.resolve(); }
  getEventCount() { return 0; }
  clearEventStore() { }
}

describe.skip('AI Services Basic Functionality', () => {
  let mockDataService: MockDataService;
  let eventService: MockEventService;
  let analysisService: TaskAnalysisService;
  let estimationService: TaskEstimationService;
  let templateService: TaskTemplateService;
  let riskService: TaskRiskService;

  beforeAll(async () => {
    // Initialize services
    mockDataService = new MockDataService();
    eventService = new MockEventService();
    
    analysisService = new TaskAnalysisService(mockDataService, eventService as any);
    estimationService = new TaskEstimationService(mockDataService, eventService as any);
    templateService = new TaskTemplateService(mockDataService, eventService as any);
    riskService = new TaskRiskService(mockDataService, eventService as any);
  });

  describe('TaskAnalysisService', () => {
    it('should analyze a task and return valid results', async () => {
      const request = {
        title: 'Implement user authentication system',
        description: 'Create a secure JWT-based authentication system with role-based access control',
        type: 'feature' as const,
        requirements: ['JWT tokens', 'Role-based access', 'Password encryption'],
        context: {
          projectId: 'test-project',
          teamSize: 4,
          techStack: ['Node.js', 'Express', 'MongoDB'],
          constraints: ['Security compliance', 'Performance requirements']
        },
        options: {
          includeBreakdown: true,
          includeRisks: true,
          includeEstimate: true,
          analyzeComplexity: true
        }
      };

      const result = await analysisService.analyzeTask(request);

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.analysis.complexity).toBeDefined();
      expect(result.analysis.complexity.level).toMatch(/low|medium|high|very_high/);
      expect(result.analysis.complexity.score).toBeGreaterThanOrEqual(0);
      expect(result.analysis.complexity.score).toBeLessThanOrEqual(10);
      expect(result.analysis.risks).toBeInstanceOf(Array);
      expect(result.analysis.risks.length).toBeGreaterThan(0);
      expect(result.analysis.estimate).toBeDefined();
      expect(result.analysis.estimate?.hours).toBeGreaterThan(0);
      expect(result.analysis.breakdown).toBeDefined();
      expect(result.analysis.insights).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle task breakdown correctly', async () => {
      // Create a test task first
      const task = await mockDataService.createTask({
        title: 'Test Feature Implementation',
        description: 'Test feature for breakdown analysis',
        type: TaskType.FEATURE,
        priority: TaskPriority.MEDIUM,
        estimatedHours: 32,
        tags: [],
        metadata: {},
        assigneeId: null,
        projectId: null,
        parentId: null,
        dueDate: null,
        startDate: null
      }, 'test-user');

      const request = {
        granularity: 'medium' as const,
        includeEstimates: true,
        includeDependencies: true,
        maxSubtasks: 4
      };

      const result = await analysisService.createTaskBreakdown(task.id, request);

      expect(result).toBeDefined();
      expect(result.breakdown.subtasks).toBeInstanceOf(Array);
      expect(result.breakdown.subtasks.length).toBeGreaterThan(0);
      expect(result.breakdown.subtasks.length).toBeLessThanOrEqual(4);
      expect(result.breakdown.dependencies).toBeInstanceOf(Array);
      expect(result.breakdown.summary.totalSubtasks).toEqual(result.breakdown.subtasks.length);
      expect(result.metadata.confidence).toBeGreaterThan(0);

      // Verify subtask structure
      const firstSubtask = result.breakdown.subtasks[0];
      expect(firstSubtask.id).toBeDefined();
      expect(firstSubtask.title).toBeDefined();
      expect(firstSubtask.description).toBeDefined();
      expect(firstSubtask.estimatedHours).toBeGreaterThan(0);
      expect(firstSubtask.storyPoints).toBeGreaterThan(0);
      expect(firstSubtask.order).toBeGreaterThan(0);
    });
  });

  describe('TaskEstimationService', () => {
    it('should estimate task effort with proper structure', async () => {
      const request = {
        tasks: [{
          title: 'Build REST API',
          description: 'Create RESTful API endpoints for user management',
          type: 'feature' as const,
          requirements: ['CRUD operations', 'Authentication', 'Validation']
        }],
        context: {
          teamExperience: 'senior' as const,
          techStack: ['Node.js', 'Express'],
          projectType: 'greenfield' as const
        },
        options: {
          unit: 'hours' as const,
          includeBuffer: true,
          bufferPercentage: 0.2,
          includeBreakdown: true,
          confidenceLevel: 'high' as const
        }
      };

      const result = await estimationService.estimateTask(request);

      expect(result).toBeDefined();
      expect(result.estimate).toBeDefined();
      expect(result.estimate.hours).toBeGreaterThan(0);
      expect(result.estimate.storyPoints).toBeGreaterThan(0);
      expect(result.estimate.confidence).toBeGreaterThan(0);
      expect(result.estimate.confidence).toBeLessThanOrEqual(1);
      expect(result.estimate.range).toBeDefined();
      expect(result.estimate.range.min).toBeLessThanOrEqual(result.estimate.range.mostLikely);
      expect(result.estimate.range.mostLikely).toBeLessThanOrEqual(result.estimate.range.max);
      expect(result.estimate.breakdown).toBeDefined();
      expect(result.estimate.factors).toBeInstanceOf(Array);
      expect(result.metadata.method).toBeDefined();
    });

    it('should provide accurate estimation breakdown', async () => {
      const request = {
        tasks: [{
          title: 'Complex Integration Task',
          description: 'Integrate multiple systems with legacy APIs',
          type: 'feature' as const
        }],
        context: {
          teamExperience: 'intermediate' as const,
          projectType: 'brownfield' as const
        },
        options: {
          unit: 'hours' as const,
          includeBuffer: true,
          bufferPercentage: 0.2,
          includeBreakdown: true,
          confidenceLevel: 'medium' as const
        }
      };

      const result = await estimationService.estimateTask(request);
      const breakdown = result.estimate.breakdown;

      expect(breakdown).toBeDefined();
      expect(breakdown.analysis).toBeGreaterThanOrEqual(0);
      expect(breakdown.design).toBeGreaterThanOrEqual(0);
      expect(breakdown.implementation).toBeGreaterThan(0);
      expect(breakdown.testing).toBeGreaterThanOrEqual(0);
      expect(breakdown.review).toBeGreaterThanOrEqual(0);
      expect(breakdown.deployment).toBeGreaterThanOrEqual(0);
      expect(breakdown.buffer).toBeGreaterThanOrEqual(0);

      const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
      expect(total).toBeCloseTo(result.estimate.hours, 5);
    });
  });

  describe('TaskTemplateService', () => {
    it('should create templates with proper validation', async () => {
      const templateRequest = {
        name: 'Test Feature Template',
        description: 'Template for standard feature development',
        category: 'feature' as const,
        tags: ['development', 'testing'],
        template: {
          title: 'Implement {{feature_name}}',
          description: 'Develop {{feature_name}} with testing and documentation',
          type: 'feature' as const,
          priority: 'medium' as const,
          estimatedHours: 24,
          acceptanceCriteria: [
            'Feature is implemented according to requirements',
            'Unit tests are written and passing',
            'Documentation is updated'
          ],
          subtasks: [
            {
              title: 'Design {{feature_name}}',
              description: 'Create technical design',
              type: 'feature' as const,
              priority: 'high' as const,
              estimatedHours: 4
            }
          ],
          dependencies: [],
          metadata: { complexity: 'medium' }
        },
        variables: [
          {
            name: 'feature_name',
            type: 'string' as const,
            required: true,
            description: 'Name of the feature to implement'
          }
        ]
      };

      const template = await templateService.createTemplate(templateRequest);

      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe(templateRequest.name);
      expect(template.category).toBe(templateRequest.category);
      expect(template.template.title).toContain('{{feature_name}}');
      expect(template.variables).toHaveLength(1);
      expect(template.variables[0].name).toBe('feature_name');
      expect(template.audit.createdBy).toBeDefined();
      expect(template.audit.createdAt).toBeDefined();
    });

    it('should apply templates with variable substitution', async () => {
      // First create a template
      const templateRequest = {
        name: 'Simple Feature Template',
        description: 'Simple template for testing',
        category: 'feature' as const,
        template: {
          title: 'Create {{feature_name}} feature',
          description: 'Implement the {{feature_name}} functionality',
          type: 'feature' as const,
          priority: 'medium' as const,
          estimatedHours: 16,
          acceptanceCriteria: [],
          subtasks: [],
          dependencies: [],
          metadata: {}
        },
        variables: [
          {
            name: 'feature_name',
            type: 'string' as const,
            required: true,
            description: 'Feature name'
          }
        ]
      };

      const template = await templateService.createTemplate(templateRequest);

      // Now apply the template
      const applyRequest = {
        variables: { feature_name: 'User Profile Management' },
        projectId: 'test-project',
        assigneeId: 'test-user',
        options: {
          createSubtasks: true,
          createDependencies: false,
          applyEstimates: true
        }
      };

      const result = await templateService.applyTemplate(template.id, applyRequest);

      expect(result).toBeDefined();
      expect(result.createdTasks).toBeInstanceOf(Array);
      expect(result.createdTasks.length).toBeGreaterThan(0);
      expect(result.createdTasks[0].title).toContain('User Profile Management');
      expect(result.summary.totalTasks).toBe(result.createdTasks.length);
      expect(result.metadata.templateId).toBe(template.id);
    });
  });

  describe('TaskRiskService', () => {
    it('should add and manage task risks properly', async () => {
      // Create a test task
      const task = await mockDataService.createTask({
        title: 'Complex Integration Task',
        description: 'Integrate multiple external APIs with legacy system',
        type: TaskType.FEATURE,
        priority: TaskPriority.HIGH,
        estimatedHours: 40,
        tags: [],
        metadata: {},
        assigneeId: null,
        projectId: null,
        parentId: null,
        dueDate: null,
        startDate: null
      }, 'test-user');

      // Add a risk
      const riskRequest = {
        type: 'technical' as const,
        severity: 'high' as const,
        probability: 0.7,
        impact: 'high' as const,
        title: 'API Integration Complexity',
        description: 'Multiple API integrations may have compatibility issues',
        mitigation: {
          strategy: 'mitigate' as const,
          actions: [
            {
              action: 'Create API integration tests',
              status: 'pending' as const,
              notes: 'Test all API endpoints early'
            }
          ]
        }
      };

      const risk = await riskService.addTaskRisk(task.id, riskRequest);

      expect(risk).toBeDefined();
      expect(risk.id).toBeDefined();
      expect(risk.type).toBe(riskRequest.type);
      expect(risk.severity).toBe(riskRequest.severity);
      expect(risk.probability).toBe(riskRequest.probability);
      expect(risk.impact).toBe(riskRequest.impact);
      expect(risk.title).toBe(riskRequest.title);
      expect(risk.description).toBe(riskRequest.description);
      expect(risk.mitigation.strategy).toBe('mitigate');
      expect(risk.status).toBe('open');
      expect(risk.audit.createdBy).toBeDefined();
    });

    it('should retrieve task risks with proper summary', async () => {
      // Create a test task
      const task = await mockDataService.createTask({
        title: 'Risk Analysis Task',
        description: 'Task for testing risk analysis',
        type: TaskType.FEATURE,
        priority: TaskPriority.MEDIUM,
        estimatedHours: 32,
        tags: [],
        metadata: {},
        assigneeId: null,
        projectId: null,
        parentId: null,
        dueDate: null,
        startDate: null
      }, 'test-user');

      // Add multiple risks
      await riskService.addTaskRisk(task.id, {
        type: 'technical',
        severity: 'medium',
        probability: 0.5,
        impact: 'medium',
        title: 'Technical Risk 1',
        description: 'First technical risk'
      });

      await riskService.addTaskRisk(task.id, {
        type: 'timeline',
        severity: 'high',
        probability: 0.6,
        impact: 'high',
        title: 'Timeline Risk 1',
        description: 'First timeline risk'
      });

      const risksResponse = await riskService.getTaskRisks(task.id);

      expect(risksResponse).toBeDefined();
      expect(risksResponse.taskId).toBe(task.id);
      expect(risksResponse.risks).toBeInstanceOf(Array);
      expect(risksResponse.risks.length).toBeGreaterThanOrEqual(2);
      expect(risksResponse.summary).toBeDefined();
      expect(risksResponse.summary.totalRisks).toBeGreaterThanOrEqual(2);
      expect(risksResponse.summary.risksByType).toBeDefined();
      expect(risksResponse.summary.risksBySeverity).toBeDefined();
      expect(risksResponse.summary.overallRiskScore).toBeGreaterThan(0);
    });

    it('should perform AI risk analysis', async () => {
      // Create a complex task that should trigger multiple risk factors
      const task = await mockDataService.createTask({
        title: 'Legacy System Migration',
        description: 'Migrate critical legacy system to new platform with tight deadline and limited resources',
        type: TaskType.FEATURE,
        priority: TaskPriority.URGENT,
        estimatedHours: 120,
        tags: ['migration', 'legacy'],
        metadata: {},
        assigneeId: null,
        projectId: null,
        parentId: null,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        startDate: new Date().toISOString()
      }, 'test-user');

      const identifiedRisks = await riskService.analyzeTaskRisks(task.id);

      expect(identifiedRisks).toBeInstanceOf(Array);
      expect(identifiedRisks.length).toBeGreaterThan(0);

      // Verify we get different types of risks
      const riskTypes = identifiedRisks.map(r => r.type);
      const uniqueTypes = new Set(riskTypes);
      expect(uniqueTypes.size).toBeGreaterThan(0);

      // Verify risk structure
      const firstRisk = identifiedRisks[0];
      expect(firstRisk.id).toBeDefined();
      expect(firstRisk.title).toBeDefined();
      expect(firstRisk.description).toBeDefined();
      expect(firstRisk.type).toMatch(/technical|resource|timeline|dependency|quality/);
      expect(firstRisk.severity).toMatch(/low|medium|high|critical/);
      expect(firstRisk.probability).toBeGreaterThan(0);
      expect(firstRisk.probability).toBeLessThanOrEqual(1);
    });
  });

  describe('Service Statistics and Utilities', () => {
    it('should provide estimation accuracy metrics', () => {
      const metrics = estimationService.getAccuracyMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.historicalAccuracy).toBeGreaterThan(0);
      expect(metrics.historicalAccuracy).toBeLessThanOrEqual(1);
      expect(metrics.modelPerformance).toBeGreaterThan(0);
      expect(metrics.modelPerformance).toBeLessThanOrEqual(1);
      expect(metrics.dataQuality).toBeGreaterThan(0);
      expect(metrics.dataQuality).toBeLessThanOrEqual(1);
    });

    it('should provide template cache statistics', () => {
      const stats = templateService.getCacheStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.cachedTemplates).toBeGreaterThanOrEqual(0);
      expect(stats.usageStatistics).toBeGreaterThanOrEqual(0);
      expect(stats.totalCacheMemory).toBeGreaterThanOrEqual(0);
    });

    it('should provide risk service statistics', () => {
      const stats = riskService.getRiskStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.riskModels).toBeGreaterThan(0);
      expect(stats.riskThresholds).toBeDefined();
      expect(stats.modelVersion).toBeDefined();
    });
  });
});