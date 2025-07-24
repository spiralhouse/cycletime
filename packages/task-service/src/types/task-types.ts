import { z } from 'zod';

// Task Status Enum
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  BLOCKED = 'blocked'
}

// Task Priority Enum
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Task Type Enum
export enum TaskType {
  FEATURE = 'feature',
  BUG = 'bug',
  MAINTENANCE = 'maintenance',
  RESEARCH = 'research',
  DOCUMENTATION = 'documentation'
}

// Dependency Type Enum
export enum DependencyType {
  BLOCKS = 'blocks',
  DEPENDS_ON = 'depends_on',
  SUBTASK = 'subtask',
  PARENT = 'parent'
}

// History Action Enum
export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Zod Schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string()
});

export const TaskDependencySchema = z.object({
  blocks: z.array(z.string().uuid()).default([]),
  dependsOn: z.array(z.string().uuid()).default([]),
  subtasks: z.array(z.string().uuid()).default([]),
  parent: z.string().uuid().nullable().default(null)
});

export const TaskScheduleSchema = z.object({
  startDate: z.string().datetime().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  scheduledAt: z.string().datetime().nullable().default(null),
  recurringPattern: z.string().nullable().default(null)
});

export const TaskHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.nativeEnum(HistoryAction),
  field: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  timestamp: z.string().datetime(),
  userId: z.string().uuid(),
  comment: z.string().nullable()
});

export const TaskAuditSchema = z.object({
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedBy: z.string().uuid(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive()
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().default(''),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  type: z.nativeEnum(TaskType),
  estimatedHours: z.number().min(0).default(0),
  actualHours: z.number().min(0).default(0),
  progress: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  assignee: UserSchema.nullable().default(null),
  project: ProjectSchema.nullable().default(null),
  dependencies: TaskDependencySchema.default({}),
  schedule: TaskScheduleSchema.default({}),
  audit: TaskAuditSchema,
  history: z.array(TaskHistoryEntrySchema).default([])
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().default(''),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  type: z.nativeEnum(TaskType).default(TaskType.FEATURE),
  estimatedHours: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
  assigneeId: z.string().uuid().nullable().default(null),
  projectId: z.string().uuid().nullable().default(null),
  parentId: z.string().uuid().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  startDate: z.string().datetime().nullable().default(null)
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  progress: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  version: z.number().int().positive().optional()
});

export const TaskListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignee: z.string().uuid().optional(),
  project: z.string().uuid().optional(),
  dueDate: z.string().date().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const AssignTaskSchema = z.object({
  assigneeId: z.string().uuid(),
  comment: z.string().nullable().default(null)
});

export const TaskDependencyEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(DependencyType),
  sourceTaskId: z.string().uuid(),
  targetTaskId: z.string().uuid(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid()
});

export const AddDependencySchema = z.object({
  type: z.nativeEnum(DependencyType),
  targetTaskId: z.string().uuid(),
  comment: z.string().nullable().default(null)
});

export const TaskScheduleEntrySchema = z.object({
  taskId: z.string().uuid(),
  startDate: z.string().datetime().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  scheduledAt: z.string().datetime().nullable().default(null),
  recurringPattern: z.string().nullable().default(null),
  nextExecution: z.string().datetime().nullable().default(null),
  executionHistory: z.array(z.object({
    executedAt: z.string().datetime(),
    status: z.enum(['success', 'failure', 'skipped']),
    duration: z.number().min(0),
    result: z.string().nullable().default(null)
  })).default([])
});

export const ScheduleTaskSchema = z.object({
  startDate: z.string().datetime().nullable().default(null),
  dueDate: z.string().datetime().nullable().default(null),
  scheduledAt: z.string().datetime().nullable().default(null),
  recurringPattern: z.string().nullable().default(null)
});

export const TaskProgressSchema = z.object({
  taskId: z.string().uuid(),
  progress: z.number().min(0).max(100),
  timeSpent: z.number().min(0).default(0),
  timeRemaining: z.number().min(0).default(0),
  completedSubtasks: z.number().int().min(0).default(0),
  totalSubtasks: z.number().int().min(0).default(0),
  milestones: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    completed: z.boolean(),
    completedAt: z.string().datetime().nullable().default(null)
  })).default([]),
  progressHistory: z.array(z.object({
    timestamp: z.string().datetime(),
    progress: z.number().min(0).max(100),
    comment: z.string().nullable().default(null),
    updatedBy: z.string().uuid()
  })).default([])
});

export const UpdateProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  timeSpent: z.number().min(0).default(0),
  comment: z.string().nullable().default(null)
});

export const TaskCommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  author: UserSchema,
  parentId: z.string().uuid().nullable().default(null),
  thread: z.array(z.object({
    id: z.string().uuid(),
    content: z.string(),
    author: UserSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  })).default([]),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    size: z.number().int().positive(),
    mimeType: z.string(),
    url: z.string().url()
  })).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const AddCommentSchema = z.object({
  content: z.string().min(1),
  parentId: z.string().uuid().nullable().default(null),
  attachments: z.array(z.object({
    filename: z.string(),
    data: z.string(),
    mimeType: z.string()
  })).default([])
});

export const SearchTasksSchema = z.object({
  query: z.string().min(1),
  filters: z.object({
    status: z.array(z.nativeEnum(TaskStatus)).optional(),
    priority: z.array(z.nativeEnum(TaskPriority)).optional(),
    type: z.array(z.nativeEnum(TaskType)).optional(),
    assignee: z.array(z.string().uuid()).optional(),
    project: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().datetime(),
      to: z.string().datetime()
    }).optional()
  }).default({}),
  facets: z.array(z.enum(['status', 'priority', 'type', 'assignee', 'project', 'tags', 'dueDate'])).default([]),
  sort: z.object({
    field: z.enum(['relevance', 'createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title']).default('relevance'),
    order: z.enum(['asc', 'desc']).default('desc')
  }).default({}),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }).default({})
});

export const TaskAnalyticsQuerySchema = z.object({
  timeRange: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('week'),
  groupBy: z.enum(['status', 'priority', 'assignee', 'project', 'tag']).default('status'),
  project: z.string().uuid().optional(),
  assignee: z.string().uuid().optional()
});

// TypeScript Types (derived from Zod schemas)
export type User = z.infer<typeof UserSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type TaskDependency = z.infer<typeof TaskDependencySchema>;
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;
export type TaskHistoryEntry = z.infer<typeof TaskHistoryEntrySchema>;
export type TaskAudit = z.infer<typeof TaskAuditSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskRequest = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskRequest = z.infer<typeof UpdateTaskSchema>;
export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;
export type AssignTaskRequest = z.infer<typeof AssignTaskSchema>;
export type TaskDependencyEntry = z.infer<typeof TaskDependencyEntrySchema>;
export type AddDependencyRequest = z.infer<typeof AddDependencySchema>;
export type TaskScheduleEntry = z.infer<typeof TaskScheduleEntrySchema>;
export type ScheduleTaskRequest = z.infer<typeof ScheduleTaskSchema>;
export type TaskProgress = z.infer<typeof TaskProgressSchema>;
export type UpdateProgressRequest = z.infer<typeof UpdateProgressSchema>;
export type TaskComment = z.infer<typeof TaskCommentSchema>;
export type AddCommentRequest = z.infer<typeof AddCommentSchema>;
export type SearchTasksRequest = z.infer<typeof SearchTasksSchema>;
export type TaskAnalyticsQuery = z.infer<typeof TaskAnalyticsQuerySchema>;

// API Response Types
export interface TaskResponse {
  task: Task;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    status?: string;
    priority?: string;
    assignee?: string;
    project?: string;
    search?: string;
  };
  facets: {
    statuses: Array<{ value: string; count: number }>;
    priorities: Array<{ value: string; count: number }>;
  };
}

export interface TaskDependenciesResponse {
  taskId: string;
  dependencies: TaskDependencyEntry[];
}

export interface TaskDependencyResponse {
  dependency: TaskDependencyEntry;
}

export interface TaskScheduleResponse {
  schedule: TaskScheduleEntry;
}

export interface TaskProgressResponse {
  progress: TaskProgress;
}

export interface TaskCommentsResponse {
  comments: TaskComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface TaskCommentResponse {
  comment: TaskComment;
}

export interface SearchTasksResponse {
  query: string;
  results: Array<{
    task: Task;
    score: number;
    highlights: {
      title?: string[];
      description?: string[];
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  facets: {
    statuses: Array<{ value: string; count: number }>;
    priorities: Array<{ value: string; count: number }>;
    types: Array<{ value: string; count: number }>;
  };
  statistics: {
    totalTasks: number;
    searchTime: number;
    maxScore: number;
  };
}

export interface TaskAnalytics {
  timeRange: string;
  summary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
    averageCompletionTime: number;
    averageProgress: number;
  };
  breakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  trends: Array<{
    date: string;
    created: number;
    completed: number;
    pending: number;
  }>;
  performance: {
    velocityTrend: Array<{
      period: string;
      tasksCompleted: number;
      storyPoints: number;
    }>;
    burndownRate: number;
    cycleTime: number;
    leadTime: number;
  };
}

export interface TaskAnalyticsResponse {
  analytics: TaskAnalytics;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    redis: 'healthy' | 'degraded' | 'unhealthy';
    queue: 'healthy' | 'degraded' | 'unhealthy';
    scheduler: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    tasksCount: number;
    pendingTasks: number;
    completedTasks: number;
    averageCompletionTime: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  timestamp: string;
  path?: string;
  details?: any;
}


// Service Configuration Types
export interface TaskServiceConfig {
  port: number;
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  queue: {
    name: string;
    concurrency: number;
    removeOnComplete: number;
    removeOnFail: number;
  };
  scheduler: {
    enabled: boolean;
    checkInterval: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

// Queue Job Types
export interface TaskExecutionJob {
  taskId: string;
  executionId: string;
  scheduledAt: string;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface TaskNotificationJob {
  taskId: string;
  eventType: string;
  recipients: string[];
  template: string;
  data: Record<string, any>;
}

export interface TaskReminderJob {
  taskId: string;
  reminderType: 'due_date' | 'overdue' | 'progress_check';
  scheduledAt: string;
  metadata: Record<string, any>;
}