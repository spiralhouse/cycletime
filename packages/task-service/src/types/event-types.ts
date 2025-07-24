import { Task, User, Project, TaskStatus, TaskPriority, TaskType, DependencyType } from './task-types';

// Base Event Interface
export interface BaseTaskEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  version: string;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

// Task Lifecycle Events
export interface TaskCreatedEvent extends BaseTaskEvent {
  eventType: 'task.created';
  data: {
    taskId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    assignee: User | null;
    project: Project | null;
    dueDate: string | null;
    estimatedHours: number | null;
    tags: string[];
  };
}

export interface TaskUpdatedEvent extends BaseTaskEvent {
  eventType: 'task.updated';
  data: {
    taskId: string;
    changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    currentState: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      progress: number;
      assignee: User | null;
      dueDate: string | null;
    };
  };
}

export interface TaskDeletedEvent extends BaseTaskEvent {
  eventType: 'task.deleted';
  data: {
    taskId: string;
    title: string;
    permanent: boolean;
    deletedAt: string;
  };
}

// Task Assignment Events
export interface TaskAssignedEvent extends BaseTaskEvent {
  eventType: 'task.assigned';
  data: {
    taskId: string;
    taskTitle: string;
    assignee: User;
    previousAssignee: User | null;
    comment: string | null;
  };
}

export interface TaskUnassignedEvent extends BaseTaskEvent {
  eventType: 'task.unassigned';
  data: {
    taskId: string;
    taskTitle: string;
    previousAssignee: User;
  };
}

// Task Status Events
export interface TaskStatusChangedEvent extends BaseTaskEvent {
  eventType: 'task.status_changed';
  data: {
    taskId: string;
    taskTitle: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    statusChangedAt: string;
    assignee: User | null;
  };
}

export interface TaskPriorityChangedEvent extends BaseTaskEvent {
  eventType: 'task.priority_changed';
  data: {
    taskId: string;
    taskTitle: string;
    oldPriority: TaskPriority;
    newPriority: TaskPriority;
    assignee: User | null;
  };
}

// Task Progress Events
export interface TaskProgressUpdatedEvent extends BaseTaskEvent {
  eventType: 'task.progress_updated';
  data: {
    taskId: string;
    taskTitle: string;
    oldProgress: number;
    newProgress: number;
    timeSpent: number | null;
    comment: string | null;
    assignee: User | null;
  };
}

export interface TaskCompletedEvent extends BaseTaskEvent {
  eventType: 'task.completed';
  data: {
    taskId: string;
    taskTitle: string;
    completedAt: string;
    completionTime: number;
    assignee: User | null;
    project: Project | null;
    actualHours: number | null;
    estimatedHours: number | null;
  };
}

export interface TaskFailedEvent extends BaseTaskEvent {
  eventType: 'task.failed';
  data: {
    taskId: string;
    taskTitle: string;
    failedAt: string;
    reason: string | null;
    errorDetails: any | null;
    assignee: User | null;
    retryCount: number;
  };
}

export interface TaskOverdueEvent extends BaseTaskEvent {
  eventType: 'task.overdue';
  data: {
    taskId: string;
    taskTitle: string;
    dueDate: string;
    overdueDays: number;
    assignee: User | null;
    project: Project | null;
  };
}

// Task Dependency Events
export interface TaskDependencyAddedEvent extends BaseTaskEvent {
  eventType: 'task.dependency_added';
  data: {
    taskId: string;
    taskTitle: string;
    dependencyId: string;
    dependencyType: DependencyType;
    targetTaskId: string;
    targetTaskTitle: string;
    comment: string | null;
  };
}

export interface TaskDependencyRemovedEvent extends BaseTaskEvent {
  eventType: 'task.dependency_removed';
  data: {
    taskId: string;
    taskTitle: string;
    dependencyId: string;
    dependencyType: DependencyType;
    targetTaskId: string;
    targetTaskTitle: string;
  };
}

export interface TaskDependencyResolvedEvent extends BaseTaskEvent {
  eventType: 'task.dependency_resolved';
  data: {
    taskId: string;
    taskTitle: string;
    dependencyId: string;
    dependencyType: DependencyType;
    resolvedTaskId: string;
    resolvedTaskTitle: string;
    resolvedAt: string;
    unblockingTasks: Array<{
      id: string;
      title: string;
    }>;
  };
}

// Task Schedule Events
export interface TaskScheduledEvent extends BaseTaskEvent {
  eventType: 'task.scheduled';
  data: {
    taskId: string;
    taskTitle: string;
    scheduledAt: string;
    startDate: string | null;
    dueDate: string | null;
    recurringPattern: string | null;
    nextExecution: string | null;
    assignee: User | null;
  };
}

export interface TaskScheduleUpdatedEvent extends BaseTaskEvent {
  eventType: 'task.schedule_updated';
  data: {
    taskId: string;
    taskTitle: string;
    oldSchedule: {
      startDate: string | null;
      dueDate: string | null;
      scheduledAt: string | null;
    };
    newSchedule: {
      startDate: string | null;
      dueDate: string | null;
      scheduledAt: string | null;
      recurringPattern: string | null;
      nextExecution: string | null;
    };
    assignee: User | null;
  };
}

// Task Comment Events
export interface TaskCommentAddedEvent extends BaseTaskEvent {
  eventType: 'task.comment_added';
  data: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    author: User;
    parentCommentId: string | null;
    assignee: User | null;
  };
}

export interface TaskCommentUpdatedEvent extends BaseTaskEvent {
  eventType: 'task.comment_updated';
  data: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    oldContent: string;
    newContent: string;
    author: User;
  };
}

export interface TaskCommentDeletedEvent extends BaseTaskEvent {
  eventType: 'task.comment_deleted';
  data: {
    taskId: string;
    taskTitle: string;
    commentId: string;
    content: string;
    author: User;
    deletedAt: string;
  };
}

// Batch Operation Events
export interface TaskBatchUpdatedEvent extends BaseTaskEvent {
  eventType: 'task.batch_updated';
  data: {
    batchId: string;
    operation: 'bulk_update' | 'bulk_assign' | 'bulk_status_change' | 'bulk_priority_change';
    taskIds: string[];
    changes: {
      field: string;
      oldValue: any;
      newValue: any;
    };
    successCount: number;
    failureCount: number;
    errors: Array<{
      taskId: string;
      error: string;
    }>;
  };
}

// Union type for all task events
export type TaskEvent = 
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskDeletedEvent
  | TaskAssignedEvent
  | TaskUnassignedEvent
  | TaskStatusChangedEvent
  | TaskPriorityChangedEvent
  | TaskProgressUpdatedEvent
  | TaskCompletedEvent
  | TaskFailedEvent
  | TaskOverdueEvent
  | TaskDependencyAddedEvent
  | TaskDependencyRemovedEvent
  | TaskDependencyResolvedEvent
  | TaskScheduledEvent
  | TaskScheduleUpdatedEvent
  | TaskCommentAddedEvent
  | TaskCommentUpdatedEvent
  | TaskCommentDeletedEvent
  | TaskBatchUpdatedEvent;

// Event Handler Types
export type TaskEventHandler<T extends TaskEvent = TaskEvent> = (event: T) => Promise<void>;

export interface TaskEventHandlers {
  'task.created': TaskEventHandler<TaskCreatedEvent>;
  'task.updated': TaskEventHandler<TaskUpdatedEvent>;
  'task.deleted': TaskEventHandler<TaskDeletedEvent>;
  'task.assigned': TaskEventHandler<TaskAssignedEvent>;
  'task.unassigned': TaskEventHandler<TaskUnassignedEvent>;
  'task.status_changed': TaskEventHandler<TaskStatusChangedEvent>;
  'task.priority_changed': TaskEventHandler<TaskPriorityChangedEvent>;
  'task.progress_updated': TaskEventHandler<TaskProgressUpdatedEvent>;
  'task.completed': TaskEventHandler<TaskCompletedEvent>;
  'task.failed': TaskEventHandler<TaskFailedEvent>;
  'task.overdue': TaskEventHandler<TaskOverdueEvent>;
  'task.dependency_added': TaskEventHandler<TaskDependencyAddedEvent>;
  'task.dependency_removed': TaskEventHandler<TaskDependencyRemovedEvent>;
  'task.dependency_resolved': TaskEventHandler<TaskDependencyResolvedEvent>;
  'task.scheduled': TaskEventHandler<TaskScheduledEvent>;
  'task.schedule_updated': TaskEventHandler<TaskScheduleUpdatedEvent>;
  'task.comment_added': TaskEventHandler<TaskCommentAddedEvent>;
  'task.comment_updated': TaskEventHandler<TaskCommentUpdatedEvent>;
  'task.comment_deleted': TaskEventHandler<TaskCommentDeletedEvent>;
  'task.batch_updated': TaskEventHandler<TaskBatchUpdatedEvent>;
}

// Event Publisher Configuration
export interface EventPublisherConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  channels: {
    tasks: string;
    notifications: string;
    analytics: string;
  };
  serialization: {
    format: 'json' | 'msgpack' | 'avro';
    compression: boolean;
  };
  retries: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  deadLetterQueue: {
    enabled: boolean;
    channel: string;
    maxAge: number;
  };
}

// Event Subscriber Configuration
export interface EventSubscriberConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  subscriptions: {
    channels: string[];
    patterns: string[];
  };
  processing: {
    concurrency: number;
    batchSize: number;
    processingTimeout: number;
  };
  errorHandling: {
    maxRetries: number;
    retryDelay: number;
    deadLetterQueue: string;
  };
}

// Event Store Types
export interface EventStore {
  save(event: TaskEvent): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<TaskEvent[]>;
  getEventsByType(eventType: string, limit?: number): Promise<TaskEvent[]>;
  getEventsByTimeRange(from: Date, to: Date): Promise<TaskEvent[]>;
  saveSnapshot(aggregateId: string, version: number, data: any): Promise<void>;
  getSnapshot(aggregateId: string): Promise<{ version: number; data: any } | null>;
}

// Event Stream Types
export interface EventStream {
  subscribe(eventType: string, handler: TaskEventHandler): Promise<void>;
  unsubscribe(eventType: string, handler: TaskEventHandler): Promise<void>;
  publish(event: TaskEvent): Promise<void>;
  close(): Promise<void>;
}

// Event Sourcing Types
export interface EventSourcingProjection {
  name: string;
  eventTypes: string[];
  handler: (event: TaskEvent, currentState: any) => Promise<any>;
  initialState: any;
}

export interface EventSourcingAggregate {
  id: string;
  version: number;
  events: TaskEvent[];
  uncommittedEvents: TaskEvent[];
  
  applyEvent(event: TaskEvent): void;
  markEventsAsCommitted(): void;
  getUncommittedEvents(): TaskEvent[];
}

// Event Replay Types
export interface EventReplayConfig {
  fromTimestamp?: string;
  toTimestamp?: string;
  eventTypes?: string[];
  aggregateIds?: string[];
  batchSize: number;
  parallelism: number;
}

export interface EventReplayResult {
  processedEvents: number;
  skippedEvents: number;
  failedEvents: number;
  duration: number;
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}

// Event Validation Types
export interface EventValidationRule {
  eventType: string;
  validator: (event: TaskEvent) => Promise<{ valid: boolean; errors: string[] }>;
}

export interface EventValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Event Metrics Types
export interface EventMetrics {
  published: number;
  processed: number;
  failed: number;
  retried: number;
  averageProcessingTime: number;
  eventsByType: Record<string, number>;
  errorsByType: Record<string, number>;
  processingTimeByType: Record<string, number>;
}

// Event Audit Types
export interface EventAuditLog {
  eventId: string;
  eventType: string;
  timestamp: string;
  userId: string;
  action: 'published' | 'processed' | 'failed' | 'retried';
  details: any;
  correlationId: string;
}

// Event Transformation Types
export interface EventTransformation {
  sourceEventType: string;
  targetEventType: string;
  transformer: (event: TaskEvent) => Promise<TaskEvent>;
}

// Event Routing Types
export interface EventRoute {
  eventType: string;
  condition?: (event: TaskEvent) => boolean;
  destination: string;
  transformation?: EventTransformation;
}

export interface EventRouter {
  routes: EventRoute[];
  defaultRoute?: string;
  
  route(event: TaskEvent): Promise<string[]>;
  addRoute(route: EventRoute): void;
  removeRoute(eventType: string, destination: string): void;
}