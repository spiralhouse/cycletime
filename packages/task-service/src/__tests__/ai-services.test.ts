import { TaskAnalysisService } from '../services/task-analysis-service';
import { TaskEstimationService } from '../services/task-estimation-service';
import { TaskTemplateService } from '../services/task-template-service';
import { TaskRiskService } from '../services/task-risk-service';
import { MockDataService } from '../services/mock-data-service';
import { EventService } from '../services/event-service';

// Mock external dependencies
jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    publish: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    off: jest.fn()
  })
}));

describe('AI Services Integration', () => {
  let mockDataService: MockDataService;
  let eventService: EventService;
  let analysisService: TaskAnalysisService;
  let estimationService: TaskEstimationService;
  let templateService: TaskTemplateService;
  let riskService: TaskRiskService;

  beforeAll(async () => {
    // Initialize services
    mockDataService = new MockDataService();
    eventService = new EventService({
      enabled: true,
      redis: { host: 'localhost', port: 6379, db: 0 },
      publisher: { maxRetries: 3, retryDelay: 1000 }
    });
    
    await eventService.start();
    
    analysisService = new TaskAnalysisService(mockDataService, eventService);
    estimationService = new TaskEstimationService(mockDataService, eventService);
    templateService = new TaskTemplateService(mockDataService, eventService);
    riskService = new TaskRiskService(mockDataService, eventService);
  });

  afterAll(async () => {
    await eventService.stop();
  });

  describe('TaskAnalysisService', () => {
    it('should analyze a task and return comprehensive results', async () => {
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
      expect(result.analysis.complexity).toBeDefined();
      expect(result.analysis.complexity.level).toMatch(/low|medium|high|very_high/);
      expect(result.analysis.risks).toBeInstanceOf(Array);
      expect(result.analysis.estimate).toBeDefined();
      expect(result.analysis.breakdown).toBeDefined();
      expect(result.analysis.insights).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });

    it('should create task breakdown with proper structure', async () => {
      // Create a test task first
      const task = await mockDataService.createTask({
        title: 'Test Feature Implementation',
        description: 'Test feature for breakdown analysis',
        type: 'feature',
        estimatedHours: 32
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
      expect(result.breakdown.dependencies).toBeInstanceOf(Array);
      expect(result.breakdown.summary.totalSubtasks).toEqual(result.breakdown.subtasks.length);
      expect(result.metadata.confidence).toBeGreaterThan(0);
    });
  });

  describe('TaskEstimationService', () => {
    it('should estimate task effort with confidence scoring', async () => {
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
      expect(result.estimate.hours).toBeGreaterThan(0);
      expect(result.estimate.storyPoints).toBeGreaterThan(0);
      expect(result.estimate.confidence).toBeGreaterThan(0);
      expect(result.estimate.range.min).toBeLessThanOrEqual(result.estimate.range.mostLikely);
      expect(result.estimate.range.mostLikely).toBeLessThanOrEqual(result.estimate.range.max);
      expect(result.estimate.breakdown).toBeDefined();
      expect(result.estimate.factors).toBeInstanceOf(Array);
    });

    it('should handle batch estimation correctly', async () => {
      // Create test tasks
      const task1 = await mockDataService.createTask({
        title: 'Feature A',
        description: 'First test feature',
        type: 'feature'
      }, 'test-user');

      const task2 = await mockDataService.createTask({
        title: 'Bug Fix B',
        description: 'Critical bug fix',
        type: 'bug'
      }, 'test-user');

      const request = {
        taskIds: [task1.id, task2.id],
        context: {
          teamExperience: 'intermediate' as const,
          projectType: 'brownfield' as const,
          methodology: 'agile' as const
        },
        options: {
          unit: 'hours' as const,
          includeBuffer: true,
          includeBreakdown: false
        }
      };

      const result = await estimationService.createBatchEstimates(request);

      expect(result).toBeDefined();
      expect(result.estimates).toHaveLength(2);
      expect(result.summary.totalTasks).toBe(2);
      expect(result.summary.successfulEstimates).toBeGreaterThan(0);
      expect(result.summary.totalHours).toBeGreaterThan(0);
    });
  });

  describe('TaskTemplateService', () => {
    it('should create and apply templates correctly', async () => {
      // Create a template
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
            },
            {
              title: 'Implement {{feature_name}}',
              description: 'Code the feature',
              type: 'feature' as const,
              priority: 'medium' as const,
              estimatedHours: 16
            }
          ],
          dependencies: [],
          metadata: { complexity: 'medium' }
        },
        variables: [
          {
            name: 'feature_name',
            type: 'string',
            required: true,
            description: 'Name of the feature to implement'
          }
        ]
      };

      const template = await templateService.createTemplate(templateRequest);
      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.name).toBe(templateRequest.name);

      // Apply the template
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
      expect(result.summary.totalTasks).toBe(result.createdTasks.length);
      expect(result.createdTasks[0].title).toContain('User Profile Management');
    });

    it('should list templates with filtering', async () => {
      const result = await templateService.listTemplates({
        category: 'feature',
        limit: 10,
        page: 1
      });

      expect(result).toBeDefined();
      expect(result.templates).toBeInstanceOf(Array);
      expect(result.pagination).toBeDefined();
      expect(result.facets).toBeDefined();
    });
  });

  describe('TaskRiskService', () => {
    it('should add and manage task risks', async () => {
      // Create a test task
      const task = await mockDataService.createTask({
        title: 'Complex Integration Task',
        description: 'Integrate multiple external APIs with legacy system',
        type: 'feature',
        estimatedHours: 40
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
        },
        autoAnalyze: false
      };

      const risk = await riskService.addTaskRisk(task.id, riskRequest);
      expect(risk).toBeDefined();
      expect(risk.id).toBeDefined();
      expect(risk.type).toBe(riskRequest.type);
      expect(risk.severity).toBe(riskRequest.severity);

      // Get task risks
      const risksResponse = await riskService.getTaskRisks(task.id);
      expect(risksResponse).toBeDefined();
      expect(risksResponse.risks).toBeInstanceOf(Array);
      expect(risksResponse.risks.length).toBeGreaterThan(0);
      expect(risksResponse.summary.totalRisks).toBeGreaterThan(0);
    });

    it('should perform AI risk analysis', async () => {
      // Create a complex task
      const task = await mockDataService.createTask({
        title: 'Migration Project',
        description: 'Migrate legacy system to new platform with tight deadline',
        type: 'feature',
        estimatedHours: 80,
        schedule: {
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
          scheduledAt: null,
          recurringPattern: null
        }
      }, 'test-user');

      const identifiedRisks = await riskService.analyzeTaskRisks(task.id);
      expect(identifiedRisks).toBeInstanceOf(Array);
      expect(identifiedRisks.length).toBeGreaterThan(0);

      // Verify risk types are appropriate
      const riskTypes = identifiedRisks.map(r => r.type);
      expect(riskTypes).toContain('timeline'); // Should identify tight deadline risk
    });

    it('should assess risk impact correctly', async () => {
      // Create task with risk
      const task = await mockDataService.createTask({
        title: 'Performance Optimization',
        description: 'Optimize database queries for better performance',
        type: 'feature',
        estimatedHours: 24
      }, 'test-user');

      const risk = await riskService.addTaskRisk(task.id, {
        type: 'technical',
        severity: 'medium',
        probability: 0.6,
        impact: 'high',
        title: 'Performance Impact Risk',
        description: 'Optimization changes may affect system performance'
      });

      const impact = await riskService.assessRiskImpact(task.id, risk.id);
      expect(impact).toBeDefined();
      
      // Check if impact has appropriate properties based on risk type
      if (impact.schedule) {
        expect(impact.schedule.delayDays).toBeGreaterThanOrEqual(0);
        expect(impact.schedule.confidence).toBeGreaterThan(0);
      }
      
      if (impact.cost) {
        expect(impact.cost.additionalHours).toBeGreaterThanOrEqual(0);
        expect(impact.cost.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Service Integration', () => {
    it('should work together in a complete workflow', async () => {
      // 1. Create a complex task
      const task = await mockDataService.createTask({
        title: 'E-commerce Checkout System',
        description: 'Build complete checkout flow with payment processing',
        type: 'feature',
        estimatedHours: 60
      }, 'test-user');

      // 2. Analyze the task
      const analysis = await analysisService.analyzeTask({
        taskId: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        options: {
          includeBreakdown: true,
          includeRisks: true,
          includeEstimate: true
        }
      });

      expect(analysis.analysis.complexity).toBeDefined();
      expect(analysis.analysis.risks.length).toBeGreaterThan(0);

      // 3. Get detailed estimation
      const estimation = await estimationService.estimateTask({
        tasks: [{ id: task.id, title: task.title, description: task.description, type: task.type }],
        context: { teamExperience: 'senior', projectType: 'greenfield' },
        options: { includeBreakdown: true }
      });

      expect(estimation.estimate.hours).toBeGreaterThan(0);
      expect(estimation.estimate.breakdown).toBeDefined();

      // 4. Identify and add risks
      const identifiedRisks = await riskService.analyzeTaskRisks(task.id);
      expect(identifiedRisks.length).toBeGreaterThan(0);

      // 5. Find suitable templates
      const suitableTemplates = await templateService.findSuitableTemplates(
        task.title,
        task.type,
        { tags: ['ecommerce', 'payment'] }
      );

      expect(suitableTemplates).toBeInstanceOf(Array);

      // 6. Verify events were published
      const eventCount = eventService.getEventCount();
      expect(eventCount).toBeGreaterThan(0);
    });
  });
});