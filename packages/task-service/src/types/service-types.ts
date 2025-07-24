import { FastifyInstance } from 'fastify';
import { Job, Queue } from 'bull';
import { Task, TaskDependencyEntry, TaskScheduleEntry, TaskProgress, TaskComment } from './task-types';

// Service Interface Definitions
export interface TaskServiceInterface {
  // Task CRUD operations
  createTask(task: any): Promise<Task>;
  getTask(id: string): Promise<Task | null>;
  updateTask(id: string, updates: any): Promise<Task | null>;
  deleteTask(id: string, permanent?: boolean): Promise<boolean>;
  listTasks(query: any): Promise<{ tasks: Task[]; pagination: any; facets: any }>;

  // Task assignment
  assignTask(taskId: string, assigneeId: string, comment?: string): Promise<Task | null>;
  unassignTask(taskId: string): Promise<Task | null>;

  // Task dependencies
  getDependencies(taskId: string): Promise<TaskDependencyEntry[]>;
  addDependency(taskId: string, dependency: any): Promise<TaskDependencyEntry>;
  removeDependency(taskId: string, dependencyId: string): Promise<boolean>;

  // Task scheduling
  getSchedule(taskId: string): Promise<TaskScheduleEntry | null>;
  scheduleTask(taskId: string, schedule: any): Promise<TaskScheduleEntry>;
  updateSchedule(taskId: string, schedule: any): Promise<TaskScheduleEntry | null>;

  // Task progress
  getProgress(taskId: string): Promise<TaskProgress | null>;
  updateProgress(taskId: string, progress: any): Promise<TaskProgress | null>;

  // Task comments
  getComments(taskId: string, query: any): Promise<{ comments: TaskComment[]; pagination: any }>;
  addComment(taskId: string, comment: any): Promise<TaskComment>;
  updateComment(taskId: string, commentId: string, updates: any): Promise<TaskComment | null>;
  deleteComment(taskId: string, commentId: string): Promise<boolean>;

  // Search and analytics
  searchTasks(query: any): Promise<any>;
  getAnalytics(query: any): Promise<any>;
}

export interface TaskStorageInterface {
  // Task storage operations
  create(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findByIds(ids: string[]): Promise<Task[]>;
  update(id: string, updates: Partial<Task>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
  search(query: any): Promise<{ tasks: Task[]; total: number }>;
  list(query: any): Promise<{ tasks: Task[]; total: number }>;

  // Dependency storage
  createDependency(dependency: TaskDependencyEntry): Promise<TaskDependencyEntry>;
  findDependencies(taskId: string): Promise<TaskDependencyEntry[]>;
  deleteDependency(dependencyId: string): Promise<boolean>;

  // Schedule storage
  createSchedule(schedule: TaskScheduleEntry): Promise<TaskScheduleEntry>;
  findSchedule(taskId: string): Promise<TaskScheduleEntry | null>;
  updateSchedule(taskId: string, updates: Partial<TaskScheduleEntry>): Promise<TaskScheduleEntry | null>;

  // Progress storage
  createProgress(progress: TaskProgress): Promise<TaskProgress>;
  findProgress(taskId: string): Promise<TaskProgress | null>;
  updateProgress(taskId: string, updates: Partial<TaskProgress>): Promise<TaskProgress | null>;

  // Comment storage
  createComment(comment: TaskComment): Promise<TaskComment>;
  findComments(taskId: string, query: any): Promise<{ comments: TaskComment[]; total: number }>;
  findComment(commentId: string): Promise<TaskComment | null>;
  updateComment(commentId: string, updates: Partial<TaskComment>): Promise<TaskComment | null>;
  deleteComment(commentId: string): Promise<boolean>;
}

export interface TaskQueueInterface {
  // Job management
  addJob(name: string, data: any, options?: any): Promise<Job>;
  getJob(id: string): Promise<Job | null>;
  getJobs(types: string[]): Promise<Job[]>;
  removeJob(id: string): Promise<boolean>;

  // Queue management
  pause(): Promise<void>;
  resume(): Promise<void>;
  empty(): Promise<void>;
  clean(grace: number): Promise<void>;
  
  // Event handling
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

export interface TaskSchedulerInterface {
  // Scheduler operations
  start(): Promise<void>;
  stop(): Promise<void>;
  scheduleTask(taskId: string, schedule: any): Promise<boolean>;
  unscheduleTask(taskId: string): Promise<boolean>;
  rescheduleTask(taskId: string, schedule: any): Promise<boolean>;
  
  // Cron job management
  addCronJob(name: string, pattern: string, handler: Function): void;
  removeCronJob(name: string): void;
  listCronJobs(): string[];
}

export interface TaskEventPublisherInterface {
  // Event publishing
  publish(event: string, data: any): Promise<void>;
  publishTaskCreated(task: Task): Promise<void>;
  publishTaskUpdated(task: Task, changes: any[]): Promise<void>;
  publishTaskDeleted(taskId: string, title: string, permanent: boolean): Promise<void>;
  publishTaskAssigned(taskId: string, assignee: any, previousAssignee?: any): Promise<void>;
  publishTaskStatusChanged(taskId: string, oldStatus: string, newStatus: string): Promise<void>;
  publishTaskCompleted(task: Task, completionTime: number): Promise<void>;
  publishTaskFailed(taskId: string, reason: string, errorDetails?: any): Promise<void>;
}

export interface TaskValidationInterface {
  // Validation operations
  validateTask(task: any): Promise<{ valid: boolean; errors: string[] }>;
  validateDependency(dependency: any): Promise<{ valid: boolean; errors: string[] }>;
  validateSchedule(schedule: any): Promise<{ valid: boolean; errors: string[] }>;
  validateProgress(progress: any): Promise<{ valid: boolean; errors: string[] }>;
  validateComment(comment: any): Promise<{ valid: boolean; errors: string[] }>;
  
  // Business rule validation
  checkCircularDependencies(taskId: string, targetTaskId: string): Promise<boolean>;
  checkAssignmentPermissions(taskId: string, assigneeId: string): Promise<boolean>;
  checkTaskPermissions(taskId: string, userId: string, action: string): Promise<boolean>;
}

export interface TaskMetricsInterface {
  // Metrics collection
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
  recordGauge(name: string, value: number, labels?: Record<string, string>): void;
  
  // Task-specific metrics
  recordTaskCreated(task: Task): void;
  recordTaskCompleted(task: Task, completionTime: number): void;
  recordTaskFailed(taskId: string, reason: string): void;
  recordTaskAssigned(taskId: string, assigneeId: string): void;
  recordTaskStatusChange(taskId: string, oldStatus: string, newStatus: string): void;
}

export interface TaskCacheInterface {
  // Cache operations
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // Task-specific cache operations
  getCachedTask(taskId: string): Promise<Task | null>;
  setCachedTask(task: Task, ttl?: number): Promise<void>;
  invalidateTask(taskId: string): Promise<void>;
  invalidateTasksByProject(projectId: string): Promise<void>;
  invalidateTasksByAssignee(assigneeId: string): Promise<void>;
}

export interface TaskNotificationInterface {
  // Notification operations
  sendNotification(type: string, recipients: string[], data: any): Promise<void>;
  sendTaskAssignedNotification(taskId: string, assigneeId: string): Promise<void>;
  sendTaskDueNotification(taskId: string): Promise<void>;
  sendTaskOverdueNotification(taskId: string): Promise<void>;
  sendTaskCompletedNotification(taskId: string): Promise<void>;
  sendTaskCommentNotification(taskId: string, commentId: string): Promise<void>;
}

// Application Configuration
export interface TaskServiceConfiguration {
  server: {
    port: number;
    host: string;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    helmet: {
      contentSecurityPolicy: boolean;
    };
    rateLimit: {
      max: number;
      timeWindow: string;
    };
  };
  database: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    connectionPool: {
      min: number;
      max: number;
    };
  };
  queue: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    settings: {
      stalledInterval: number;
      maxStalledCount: number;
    };
    defaultJobOptions: {
      removeOnComplete: number;
      removeOnFail: number;
      attempts: number;
      backoff: {
        type: string;
        delay: number;
      };
    };
  };
  scheduler: {
    enabled: boolean;
    checkInterval: string;
    timezone: string;
  };
  events: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    publisher: {
      maxRetries: number;
      retryDelay: number;
    };
  };
  logging: {
    level: string;
    format: string;
    transports: string[];
  };
  monitoring: {
    metrics: {
      enabled: boolean;
      port: number;
      path: string;
    };
    healthCheck: {
      enabled: boolean;
      interval: number;
    };
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
    };
    apiKey: {
      enabled: boolean;
      header: string;
    };
  };
  features: {
    caching: {
      enabled: boolean;
      ttl: number;
    };
    notifications: {
      enabled: boolean;
      providers: string[];
    };
    analytics: {
      enabled: boolean;
      retentionDays: number;
    };
  };
}

// Fastify Plugin Types
export interface TaskServicePlugin {
  (fastify: FastifyInstance, options: any): Promise<void>;
}

export interface TaskServiceRouteOptions {
  prefix?: string;
  preHandler?: any[];
  preValidation?: any[];
  preParsing?: any[];
  preRequest?: any[];
}

// Request/Response Context
export interface TaskServiceContext {
  userId: string;
  userRole: string;
  organizationId: string;
  permissions: string[];
  correlationId: string;
  requestId: string;
  timestamp: Date;
}

// Plugin Registration
export interface TaskServicePluginOptions {
  config: TaskServiceConfiguration;
  services: {
    storage: TaskStorageInterface;
    queue: TaskQueueInterface;
    scheduler: TaskSchedulerInterface;
    eventPublisher: TaskEventPublisherInterface;
    validation: TaskValidationInterface;
    metrics: TaskMetricsInterface;
    cache: TaskCacheInterface;
    notification: TaskNotificationInterface;
  };
}

// Health Check Types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  responseTime: number;
  details?: any;
}

export interface ServiceHealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  timeout: number;
  critical: boolean;
}

// Monitoring and Metrics
export interface TaskMetrics {
  // Task counters
  tasksCreated: number;
  tasksCompleted: number;
  tasksFailed: number;
  tasksAssigned: number;
  tasksUnassigned: number;
  
  // Performance metrics
  averageCompletionTime: number;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  
  // Queue metrics
  queueSize: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  
  // System metrics
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  
  // Business metrics
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  tasksByType: Record<string, number>;
  tasksByAssignee: Record<string, number>;
  
  timestamp: Date;
}

// Error Types
export class TaskServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'TaskServiceError';
  }
}

export class TaskNotFoundError extends TaskServiceError {
  constructor(taskId: string) {
    super(`Task with ID ${taskId} not found`, 'TASK_NOT_FOUND', 404);
  }
}

export class TaskValidationError extends TaskServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class TaskPermissionError extends TaskServiceError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED', 403);
  }
}

export class TaskConflictError extends TaskServiceError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class TaskServiceUnavailableError extends TaskServiceError {
  constructor(message: string) {
    super(message, 'SERVICE_UNAVAILABLE', 503);
  }
}

// AI Analysis Types
export interface TaskAnalysisRequest {
  taskId?: string;
  title: string;
  description: string;
  type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
  requirements?: string[];
  context?: {
    projectId?: string;
    teamSize?: number;
    techStack?: string[];
    constraints?: string[];
  };
  options?: {
    includeBreakdown?: boolean;
    includeRisks?: boolean;
    includeEstimate?: boolean;
    analyzeComplexity?: boolean;
  };
}

export interface ComplexityAnalysis {
  score: number;
  level: 'low' | 'medium' | 'high' | 'very_high';
  factors: Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface RiskFactor {
  id: string;
  type: 'technical' | 'resource' | 'timeline' | 'dependency' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  description: string;
  mitigation: string;
  impact: string;
}

export interface SkillRequirement {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface TaskAnalysisResponse {
  taskId?: string;
  analysis: {
    complexity: ComplexityAnalysis;
    risks: RiskFactor[];
    estimate?: {
      hours: number;
      storyPoints: number;
      confidence: number;
      breakdown: {
        design: number;
        implementation: number;
        testing: number;
        review: number;
        deployment: number;
      };
    };
    breakdown?: {
      subtasks: Array<{
        title: string;
        description: string;
        type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
        priority: 'low' | 'medium' | 'high' | 'urgent';
        estimatedHours: number;
        dependencies: string[];
      }>;
      dependencies: Array<{
        type: 'blocks' | 'depends_on' | 'requires';
        description: string;
        external: boolean;
        critical: boolean;
      }>;
    };
    insights: {
      recommendations: string[];
      patterns: string[];
      concerns: string[];
      opportunities: string[];
    };
  };
  metadata: {
    analyzedAt: string;
    version: string;
    confidence: number;
    processingTime: number;
  };
}

export interface TaskBreakdownRequest {
  granularity: 'high' | 'medium' | 'low';
  includeEstimates: boolean;
  includeDependencies: boolean;
  maxSubtasks: number;
  context?: {
    methodology: 'agile' | 'waterfall' | 'kanban';
    sprintDuration?: number;
    teamVelocity?: number;
  };
}

export interface TaskBreakdownResponse {
  taskId: string;
  breakdown: {
    subtasks: Array<{
      id: string;
      title: string;
      description: string;
      type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours: number;
      storyPoints: number;
      order: number;
      dependencies: string[];
      acceptanceCriteria: string[];
      tags: string[];
    }>;
    dependencies: Array<{
      sourceId: string;
      targetId: string;
      type: 'blocks' | 'depends_on' | 'subtask';
      description: string;
    }>;
    summary: {
      totalSubtasks: number;
      totalEstimatedHours: number;
      totalStoryPoints: number;
      criticalPath: string[];
      estimatedDuration: number;
    };
  };
  metadata: {
    createdAt: string;
    version: string;
    confidence: number;
    methodology: string;
  };
}

export interface DependencyAnalysisResponse {
  analysis: {
    totalDependencies: number;
    circularDependencies: Array<{
      cycle: string[];
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
    criticalPath: string[];
    bottlenecks: Array<{
      taskId: string;
      dependentCount: number;
      impact: 'low' | 'medium' | 'high' | 'critical';
      description: string;
    }>;
    risks: Array<{
      type: 'circular' | 'bottleneck' | 'external' | 'timing' | 'resource';
      severity: 'low' | 'medium' | 'high' | 'critical';
      affectedTasks: string[];
      description: string;
    }>;
  };
  recommendations: Array<{
    type: 'optimization' | 'restructure' | 'parallel' | 'buffer';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    affectedTasks: string[];
    estimatedImpact: 'low' | 'medium' | 'high';
  }>;
  metadata: {
    analyzedAt: string;
    version: string;
    confidence: number;
  };
}

export interface DependencyValidationRequest {
  dependencies: Array<{
    sourceTaskId: string;
    targetTaskId: string;
    type: 'blocks' | 'depends_on' | 'subtask';
    description?: string;
  }>;
  context?: {
    projectId?: string;
    validateCycles?: boolean;
    validateCapacity?: boolean;
    validateTiming?: boolean;
  };
}

export interface DependencyValidationResponse {
  isValid: boolean;
  validation: {
    cycleCheck: {
      passed: boolean;
      cycles: Array<{
        cycle: string[];
        severity: 'warning' | 'error' | 'critical';
      }>;
    };
    capacityCheck: {
      passed: boolean;
      conflicts: Array<{
        taskId: string;
        issue: string;
        severity: 'warning' | 'error' | 'critical';
      }>;
    };
    timingCheck: {
      passed: boolean;
      conflicts: Array<{
        sourceTaskId: string;
        targetTaskId: string;
        issue: string;
        severity: 'warning' | 'error' | 'critical';
      }>;
    };
  };
  suggestions: Array<{
    type: 'remove' | 'modify' | 'reorder' | 'split';
    description: string;
    affectedDependencies: number[];
  }>;
  metadata: {
    validatedAt: string;
    version: string;
  };
}

// AI Estimation Types
export interface EstimationMethodology {
  method: 'ai_analysis' | 'historical_comparison' | 'expert_judgment' | 'hybrid';
  dataPoints: number;
  confidence: number;
}

export interface ConfidenceLevel {
  level: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
}

export interface AccuracyMetrics {
  historicalAccuracy?: number;
  modelPerformance?: number;
  dataQuality: number;
}

export interface TaskEstimationRequest {
  tasks: Array<{
    id?: string;
    title: string;
    description: string;
    type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
    requirements?: string[];
    complexity?: 'low' | 'medium' | 'high' | 'very_high';
  }>;
  context?: {
    teamExperience: 'junior' | 'intermediate' | 'senior' | 'expert';
    techStack?: string[];
    projectType: 'greenfield' | 'brownfield' | 'maintenance' | 'migration';
    constraints?: string[];
  };
  options?: {
    unit: 'hours' | 'story_points' | 'days';
    includeBuffer: boolean;
    bufferPercentage: number;
    includeBreakdown: boolean;
    confidenceLevel: 'low' | 'medium' | 'high';
  };
}

export interface TaskEstimationResponse {
  taskId?: string;
  estimate: {
    hours: number;
    storyPoints: number;
    confidence: number;
    range: {
      min: number;
      max: number;
      mostLikely: number;
    };
    breakdown: {
      analysis: number;
      design: number;
      implementation: number;
      testing: number;
      review: number;
      deployment: number;
      buffer: number;
    };
    factors: Array<{
      factor: string;
      impact: 'decreases' | 'neutral' | 'increases';
      multiplier: number;
      description: string;
    }>;
    comparisons: Array<{
      taskId: string;
      title: string;
      similarity: number;
      actualHours: number;
      variance: number;
    }>;
  };
  metadata: {
    estimatedAt: string;
    version: string;
    method: 'ai_analysis' | 'historical_comparison' | 'expert_judgment' | 'hybrid';
    confidence: number;
  };
}

export interface UpdateTaskEstimateRequest {
  hours?: number;
  storyPoints?: number;
  confidence?: number;
  notes?: string;
  version: number;
}

export interface BatchEstimationRequest {
  taskIds: string[];
  context?: {
    teamExperience: 'junior' | 'intermediate' | 'senior' | 'expert';
    projectType: 'greenfield' | 'brownfield' | 'maintenance' | 'migration';
    methodology: 'agile' | 'waterfall' | 'kanban';
  };
  options?: {
    unit: 'hours' | 'story_points' | 'days';
    includeBuffer: boolean;
    includeBreakdown: boolean;
  };
}

export interface BatchEstimationResponse {
  estimates: Array<{
    taskId: string;
    estimate: TaskEstimationResponse;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
  }>;
  summary: {
    totalTasks: number;
    successfulEstimates: number;
    failedEstimates: number;
    totalHours: number;
    totalStoryPoints: number;
    averageConfidence: number;
  };
  metadata: {
    estimatedAt: string;
    processingTime: number;
  };
}

// Template Types
export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
}

export interface TemplateUsageStats {
  timesUsed: number;
  lastUsed?: string;
  averageRating?: number;
  successRate?: number;
  averageCompletionTime?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
  tags: string[];
  template: {
    title: string;
    description: string;
    type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedHours: number;
    acceptanceCriteria: string[];
    subtasks: Array<{
      title: string;
      description: string;
      type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours: number;
    }>;
    dependencies: Array<{
      type: 'blocks' | 'depends_on' | 'external';
      description: string;
    }>;
    metadata: Record<string, any>;
  };
  variables: TemplateVariable[];
  usage: TemplateUsageStats;
  audit: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    version: number;
  };
}

export interface CreateTaskTemplateRequest {
  name: string;
  description: string;
  category: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
  tags?: string[];
  template: {
    title: string;
    description: string;
    type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    estimatedHours?: number;
    acceptanceCriteria?: string[];
    subtasks?: Array<{
      title: string;
      description: string;
      type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours?: number;
    }>;
    dependencies?: Array<{
      type: 'blocks' | 'depends_on' | 'external';
      description: string;
    }>;
    metadata?: Record<string, any>;
  };
  variables?: TemplateVariable[];
}

export interface UpdateTaskTemplateRequest {
  name?: string;
  description?: string;
  category?: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
  tags?: string[];
  template?: {
    title?: string;
    description?: string;
    type?: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    estimatedHours?: number;
    acceptanceCriteria?: string[];
    subtasks?: Array<{
      title: string;
      description: string;
      type: 'feature' | 'bug' | 'maintenance' | 'research' | 'documentation';
      priority: 'low' | 'medium' | 'high' | 'urgent';
      estimatedHours?: number;
    }>;
    dependencies?: Array<{
      type: 'blocks' | 'depends_on' | 'external';
      description: string;
    }>;
    metadata?: Record<string, any>;
  };
  variables?: TemplateVariable[];
  version: number;
}

export interface ApplyTaskTemplateRequest {
  variables?: Record<string, any>;
  projectId?: string;
  assigneeId?: string;
  parentTaskId?: string;
  options?: {
    createSubtasks: boolean;
    createDependencies: boolean;
    applyEstimates: boolean;
    overrides?: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      dueDate?: string;
      tags?: string[];
    };
  };
}

export interface ApplyTaskTemplateResponse {
  createdTasks: Task[];
  createdDependencies: TaskDependencyEntry[];
  summary: {
    totalTasks: number;
    totalDependencies: number;
    estimatedTotalHours: number;
    variables: Record<string, any>;
  };
  metadata: {
    appliedAt: string;
    templateId: string;
    templateVersion: number;
  };
}

export interface TaskTemplateListResponse {
  templates: TaskTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  facets: {
    categories: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}

// Risk Assessment Types
export interface RiskCategory {
  type: 'technical' | 'resource' | 'timeline' | 'dependency' | 'quality' | 'scope' | 'external';
  name: string;
  description: string;
  defaultSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface MitigationStrategy {
  strategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
  actions: Array<{
    action: string;
    assigneeId?: string;
    dueDate?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    notes?: string;
  }>;
  contingency?: string;
}

export interface RiskImpact {
  schedule?: {
    delayDays: number;
    confidence: number;
  };
  cost?: {
    additionalHours: number;
    additionalCost: number;
    confidence: number;
  };
  quality?: {
    score: number;
    areas: string[];
  };
}

export interface TaskRisk {
  id: string;
  type: 'technical' | 'resource' | 'timeline' | 'dependency' | 'quality' | 'scope' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  mitigation: MitigationStrategy;
  status: 'open' | 'monitoring' | 'mitigated' | 'closed';
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  history: Array<{
    timestamp: string;
    action: 'created' | 'updated' | 'mitigated' | 'escalated' | 'closed';
    userId: string;
    comment?: string;
    previousValue?: string;
    newValue?: string;
  }>;
  audit: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
    version: number;
  };
}

export interface AddTaskRiskRequest {
  type: 'technical' | 'resource' | 'timeline' | 'dependency' | 'quality' | 'scope' | 'external';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  mitigation?: MitigationStrategy;
  ownerId?: string;
  autoAnalyze?: boolean;
}

export interface UpdateTaskRiskRequest {
  type?: 'technical' | 'resource' | 'timeline' | 'dependency' | 'quality' | 'scope' | 'external';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  probability?: number;
  impact?: 'low' | 'medium' | 'high' | 'critical';
  title?: string;
  description?: string;
  mitigation?: MitigationStrategy;
  status?: 'open' | 'monitoring' | 'mitigated' | 'closed';
  ownerId?: string;
  version: number;
}

export interface TaskRisksResponse {
  taskId: string;
  risks: TaskRisk[];
  summary: {
    totalRisks: number;
    risksByType: {
      technical: number;
      resource: number;
      timeline: number;
      dependency: number;
      quality: number;
      scope: number;
      external: number;
    };
    risksBySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    overallRiskScore: number;
  };
}

// Event Payload Types
export interface BaseEventPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface AIProcessingMetadata {
  model: string;
  processingTime: number;
  confidenceScore: number;
  dataQuality?: {
    score: number;
    issues: string[];
  };
}

export interface TaskAnalyzedPayload extends BaseEventPayload {
  eventType: 'task.analyzed';
  data: {
    taskId: string;
    taskTitle: string;
    analysisId: string;
    analysis: {
      complexity: {
        score: number;
        level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex';
        factors: string[];
      };
      effort: {
        estimatedHours: number;
        confidenceLevel: number;
        range: {
          min: number;
          max: number;
        };
      };
      skillsRequired: Array<{
        skill: string;
        level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        importance: 'low' | 'medium' | 'high' | 'critical';
      }>;
      riskFactors: Array<{
        type: 'technical' | 'schedule' | 'resource' | 'dependency' | 'scope';
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        mitigation?: string;
      }>;
      categories: string[];
      tags: string[];
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

export interface TaskEstimatedPayload extends BaseEventPayload {
  eventType: 'task.estimated';
  data: {
    taskId: string;
    taskTitle: string;
    estimationId: string;
    estimation: {
      effort: {
        hours: number;
        storyPoints: number;
        confidenceLevel: number;
        range: {
          optimistic: number;
          mostLikely: number;
          pessimistic: number;
        };
      };
      methodology: 'historical' | 'similarity' | 'bottom_up' | 'three_point' | 'planning_poker';
      basedOn: Array<{
        type: 'similar_task' | 'historical_data' | 'expert_judgment' | 'decomposition';
        reference: string;
        similarity?: number;
      }>;
      adjustments: Array<{
        factor: string;
        adjustment: number;
        reason: string;
      }>;
      accuracy: {
        historicalAccuracy?: number;
        modelPerformance?: number;
      };
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

export interface TaskBreakdownCompletedPayload extends BaseEventPayload {
  eventType: 'task.breakdown_completed';
  data: {
    taskId: string;
    taskTitle: string;
    breakdownId: string;
    breakdown: {
      subtasks: Array<{
        id: string;
        title: string;
        description: string;
        type: string;
        priority: string;
        estimatedHours: number;
        storyPoints: number;
        dependencies: string[];
        skillsRequired: string[];
        order: number;
        acceptanceCriteria: string[];
        testCases?: string[];
      }>;
      totalEstimatedHours: number;
      totalStoryPoints: number;
      methodology: 'wbs' | 'user_story' | 'feature_driven' | 'component_based';
      decompositionLevel: number;
      parallelizable: boolean;
      criticalPath: string[];
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

export interface TaskDependenciesMappedPayload extends BaseEventPayload {
  eventType: 'task.dependencies_mapped';
  data: {
    taskId: string;
    taskTitle: string;
    mappingId: string;
    dependencies: {
      blockedBy: Array<{
        taskId: string;
        taskTitle: string;
        dependencyType: 'hard' | 'soft' | 'external' | 'internal';
        reason: string;
        criticality: 'low' | 'medium' | 'high' | 'critical';
        estimatedImpact: {
          delayDays: number;
          effortIncrease: number;
        };
      }>;
      blocking: Array<{
        taskId: string;
        taskTitle: string;
        dependencyType: 'hard' | 'soft' | 'external' | 'internal';
        reason: string;
        criticality: 'low' | 'medium' | 'high' | 'critical';
      }>;
      external: Array<{
        name: string;
        type: 'api' | 'service' | 'resource' | 'approval' | 'decision';
        provider: string;
        status: 'available' | 'pending' | 'blocked' | 'unknown';
        sla?: string;
        criticality: 'low' | 'medium' | 'high' | 'critical';
      }>;
      transitive: Array<{
        taskId: string;
        taskTitle: string;
        path: string[];
        depth: number;
      }>;
    };
    analysis: {
      criticalPath: string[];
      bottlenecks: Array<{
        taskId: string;
        taskTitle: string;
        fanOut: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
      }>;
      riskAssessment: {
        overallRisk: 'low' | 'medium' | 'high' | 'critical';
        riskFactors: string[];
        mitigationSuggestions: string[];
      };
      parallelizationOpportunities: Array<{
        taskIds: string[];
        benefit: 'low' | 'medium' | 'high';
        requirements: string[];
      }>;
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

export interface TaskRiskIdentifiedPayload extends BaseEventPayload {
  eventType: 'task.risk_identified';
  data: {
    taskId: string;
    taskTitle: string;
    riskId: string;
    risk: {
      category: 'technical' | 'schedule' | 'resource' | 'dependency' | 'scope' | 'quality' | 'security' | 'compliance';
      severity: 'low' | 'medium' | 'high' | 'critical';
      probability: number;
      impact: RiskImpact;
      description: string;
      indicators: Array<{
        type: string;
        value: string;
        significance: 'low' | 'medium' | 'high';
      }>;
      triggers: Array<{
        condition: string;
        metric: string;
        threshold: string;
      }>;
    };
    mitigation: {
      strategies: Array<{
        type: 'avoid' | 'transfer' | 'mitigate' | 'accept';
        description: string;
        effort: number;
        cost: number;
        effectiveness: number;
        priority: 'low' | 'medium' | 'high' | 'critical';
      }>;
      recommendations: string[];
      contingencyPlans: Array<{
        trigger: string;
        action: string;
        owner?: string;
      }>;
    };
    monitoring: {
      metrics: Array<{
        name: string;
        type: string;
        threshold: string;
        frequency: string;
      }>;
      reviewSchedule?: string;
      escalationPath?: string[];
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

export interface TaskTemplateAppliedPayload extends BaseEventPayload {
  eventType: 'task.template_applied';
  data: {
    taskId: string;
    taskTitle: string;
    templateId: string;
    template: {
      name: string;
      version: string;
      category: 'development' | 'testing' | 'deployment' | 'documentation' | 'review' | 'research';
      description: string;
      matchingCriteria: {
        taskType: string;
        keywords: string[];
        complexity: string;
        domain: string;
        matchScore: number;
      };
    };
    application: {
      changes: {
        structure: Array<{
          field: string;
          oldValue?: string;
          newValue: string;
          reason: string;
        }>;
        subtasks: {
          added: Array<{
            title: string;
            description: string;
            type: string;
            priority: string;
            estimatedHours: number;
          }>;
          modified: Array<{
            id: string;
            changes: Array<{
              field: string;
              oldValue: string;
              newValue: string;
            }>;
          }>;
        };
        checklists: Array<{
          name: string;
          items: string[];
          category: string;
        }>;
        acceptanceCriteria: string[];
        testCases: string[];
        documentation: Array<{
          type: string;
          title: string;
          description: string;
        }>;
      };
      customizations: {
        applied: Array<{
          type: string;
          description: string;
          reason: string;
        }>;
        skipped: Array<{
          type: string;
          reason: string;
        }>;
      };
      validation: {
        completeness: number;
        consistency: number;
        issues: Array<{
          type: 'warning' | 'error' | 'info';
          description: string;
          suggestion?: string;
        }>;
      };
    };
    aiProcessing: AIProcessingMetadata;
    project?: { id: string; name: string };
    assignee?: { id: string; name: string; email: string };
  };
}

// Response Types for Templates and Risks
export interface TaskTemplateResponse {
  template: TaskTemplate;
}

export interface TaskRiskResponse {
  risk: TaskRisk;
}

// Extended Service Interface for AI Analysis
export interface TaskAnalysisServiceInterface {
  // AI Analysis operations
  analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse>;
  getTaskAnalysis(taskId: string): Promise<TaskAnalysisResponse | null>;
  
  // Task breakdown operations
  createTaskBreakdown(taskId: string, request: TaskBreakdownRequest): Promise<TaskBreakdownResponse>;
  getTaskBreakdown(taskId: string): Promise<TaskBreakdownResponse | null>;
  
  // Dependency analysis
  analyzeDependencies(projectId?: string, taskIds?: string[]): Promise<DependencyAnalysisResponse>;
  validateDependencies(request: DependencyValidationRequest): Promise<DependencyValidationResponse>;
}

export interface TaskEstimationServiceInterface {
  // Task estimation operations
  estimateTask(request: TaskEstimationRequest): Promise<TaskEstimationResponse>;
  getTaskEstimate(taskId: string): Promise<TaskEstimationResponse | null>;
  updateTaskEstimate(taskId: string, request: UpdateTaskEstimateRequest): Promise<TaskEstimationResponse>;
  
  // Batch estimation operations
  createBatchEstimates(request: BatchEstimationRequest): Promise<BatchEstimationResponse>;
  getBatchEstimates(taskIds: string[]): Promise<BatchEstimationResponse>;
}

export interface TaskTemplateServiceInterface {
  // Template CRUD operations
  createTemplate(request: CreateTaskTemplateRequest): Promise<TaskTemplate>;
  getTemplate(templateId: string): Promise<TaskTemplate | null>;
  updateTemplate(templateId: string, request: UpdateTaskTemplateRequest): Promise<TaskTemplate>;
  deleteTemplate(templateId: string): Promise<boolean>;
  listTemplates(query: any): Promise<TaskTemplateListResponse>;
  
  // Template application
  applyTemplate(templateId: string, request: ApplyTaskTemplateRequest): Promise<ApplyTaskTemplateResponse>;
}

export interface TaskRiskServiceInterface {
  // Risk CRUD operations
  addTaskRisk(taskId: string, request: AddTaskRiskRequest): Promise<TaskRisk>;
  getTaskRisks(taskId: string): Promise<TaskRisksResponse>;
  updateTaskRisk(taskId: string, riskId: string, request: UpdateTaskRiskRequest): Promise<TaskRisk>;
  deleteTaskRisk(taskId: string, riskId: string): Promise<boolean>;
  
  // Risk analysis
  analyzeTaskRisks(taskId: string): Promise<TaskRisk[]>;
  assessRiskImpact(taskId: string, riskId: string): Promise<RiskImpact>;
}

// Extended Service Configuration
export interface ExtendedTaskServiceConfiguration extends TaskServiceConfiguration {
  // AI Service Configuration
  aiService: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
    timeout: number;
    retryAttempts: number;
    models: {
      analysis: string;
      estimation: string;
      breakdown: string;
      riskAssessment: string;
      templateMatching: string;
    };
  };
  // Template Configuration
  templates: {
    enabled: boolean;
    defaultCategory: string;
    autoApply: boolean;
    matchingThreshold: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  // Risk Assessment Configuration
  riskAssessment: {
    enabled: boolean;
    autoAnalyze: boolean;
    thresholds: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    defaultMitigationStrategy: 'avoid' | 'mitigate' | 'transfer' | 'accept';
    escalationEnabled: boolean;
    monitoringEnabled: boolean;
  };
}