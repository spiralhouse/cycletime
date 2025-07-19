import { v4 as uuidv4 } from 'uuid';
import { 
  TaskEvent,
  TaskCreatedEvent,
  TaskUpdatedEvent,
  TaskDeletedEvent,
  TaskAssignedEvent,
  TaskUnassignedEvent,
  TaskStatusChangedEvent,
  TaskPriorityChangedEvent,
  TaskProgressUpdatedEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
  TaskDependencyAddedEvent,
  TaskDependencyRemovedEvent,
  TaskScheduledEvent,
  TaskCommentAddedEvent,
  EventPublisherConfig
} from '../types/event-types';
import { Task, User, TaskStatus, TaskPriority, DependencyType } from '../types/task-types';
import { TaskEventPublisherInterface } from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export class EventService implements TaskEventPublisherInterface {
  private isStarted = false;
  private eventStore: TaskEvent[] = [];
  
  constructor(private config: EventPublisherConfig) {}

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      // In a real implementation, this would connect to Redis/message broker
      logger.info('Event service started');
      this.isStarted = true;
    } catch (error) {
      logger.error('Failed to start event service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      // In a real implementation, this would disconnect from Redis/message broker
      logger.info('Event service stopped');
      this.isStarted = false;
    } catch (error) {
      logger.error('Failed to stop event service:', error);
      throw error;
    }
  }

  async publish(event: string, data: any): Promise<void> {
    if (!this.isStarted) {
      logger.warn('Event service not started, event not published');
      return;
    }

    try {
      // In a real implementation, this would publish to Redis/message broker
      logger.info(`Event published: ${event}`, { data });
    } catch (error) {
      logger.error(`Failed to publish event ${event}:`, error);
      throw error;
    }
  }

  async publishTaskCreated(task: Task): Promise<void> {
    const event: TaskCreatedEvent = {
      eventId: uuidv4(),
      eventType: 'task.created',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      userId: task.audit.createdBy,
      correlationId: uuidv4(),
      data: {
        taskId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        assignee: task.assignee,
        project: task.project,
        dueDate: task.schedule.dueDate,
        estimatedHours: task.estimatedHours,
        tags: task.tags
      }
    };

    this.eventStore.push(event);
    await this.publish('task.created', event);
  }

  async publishTaskUpdated(task: Task, changes: Array<{ field: string; oldValue: any; newValue: any }>): Promise<void> {
    const event: TaskUpdatedEvent = {
      eventId: uuidv4(),
      eventType: 'task.updated',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      userId: task.audit.updatedBy,
      correlationId: uuidv4(),
      data: {
        taskId: task.id,
        changes,
        currentState: {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          progress: task.progress,
          assignee: task.assignee,
          dueDate: task.schedule.dueDate
        }
      }
    };

    this.eventStore.push(event);
    await this.publish('task.updated', event);
  }

  async publishTaskDeleted(taskId: string, title: string, permanent: boolean): Promise<void> {
    const event: TaskDeletedEvent = {
      eventId: uuidv4(),
      eventType: 'task.deleted',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        title,
        permanent,
        deletedAt: new Date().toISOString()
      }
    };

    this.eventStore.push(event);
    await this.publish('task.deleted', event);
  }

  async publishTaskAssigned(taskId: string, taskTitle: string, assignee: User, previousAssignee?: User | null, comment?: string | null): Promise<void> {
    const event: TaskAssignedEvent = {
      eventId: uuidv4(),
      eventType: 'task.assigned',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        assignee,
        previousAssignee: previousAssignee || null,
        comment: comment || null
      }
    };

    this.eventStore.push(event);
    await this.publish('task.assigned', event);
  }

  async publishTaskUnassigned(taskId: string, taskTitle: string, previousAssignee: User): Promise<void> {
    const event: TaskUnassignedEvent = {
      eventId: uuidv4(),
      eventType: 'task.unassigned',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        previousAssignee
      }
    };

    this.eventStore.push(event);
    await this.publish('task.unassigned', event);
  }

  async publishTaskStatusChanged(taskId: string, taskTitle: string, oldStatus: TaskStatus, newStatus: TaskStatus, statusChangedAt: string, assignee: User | null): Promise<void> {
    const event: TaskStatusChangedEvent = {
      eventId: uuidv4(),
      eventType: 'task.status_changed',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        oldStatus,
        newStatus,
        statusChangedAt,
        assignee
      }
    };

    this.eventStore.push(event);
    await this.publish('task.status_changed', event);
  }

  async publishTaskPriorityChanged(taskId: string, taskTitle: string, oldPriority: TaskPriority, newPriority: TaskPriority, assignee: User | null): Promise<void> {
    const event: TaskPriorityChangedEvent = {
      eventId: uuidv4(),
      eventType: 'task.priority_changed',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        oldPriority,
        newPriority,
        assignee
      }
    };

    this.eventStore.push(event);
    await this.publish('task.priority_changed', event);
  }

  async publishTaskProgressUpdated(taskId: string, taskTitle: string, oldProgress: number, newProgress: number, timeSpent: number | null, comment: string | null, assignee: User | null): Promise<void> {
    const event: TaskProgressUpdatedEvent = {
      eventId: uuidv4(),
      eventType: 'task.progress_updated',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        oldProgress,
        newProgress,
        timeSpent,
        comment,
        assignee
      }
    };

    this.eventStore.push(event);
    await this.publish('task.progress_updated', event);
  }

  async publishTaskCompleted(task: Task, completionTime: number): Promise<void> {
    const event: TaskCompletedEvent = {
      eventId: uuidv4(),
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId: task.id,
        taskTitle: task.title,
        completedAt: new Date().toISOString(),
        completionTime,
        assignee: task.assignee,
        project: task.project,
        actualHours: task.actualHours,
        estimatedHours: task.estimatedHours
      }
    };

    this.eventStore.push(event);
    await this.publish('task.completed', event);
  }

  async publishTaskFailed(taskId: string, reason: string, errorDetails?: any, assignee?: User | null, retryCount: number = 0): Promise<void> {
    const event: TaskFailedEvent = {
      eventId: uuidv4(),
      eventType: 'task.failed',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle: taskId, // Mock - would fetch real title
        failedAt: new Date().toISOString(),
        reason,
        errorDetails,
        assignee: assignee || null,
        retryCount
      }
    };

    this.eventStore.push(event);
    await this.publish('task.failed', event);
  }

  async publishTaskDependencyAdded(taskId: string, taskTitle: string, dependencyId: string, dependencyType: DependencyType, targetTaskId: string, targetTaskTitle: string, comment: string | null): Promise<void> {
    const event: TaskDependencyAddedEvent = {
      eventId: uuidv4(),
      eventType: 'task.dependency_added',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        dependencyId,
        dependencyType,
        targetTaskId,
        targetTaskTitle,
        comment
      }
    };

    this.eventStore.push(event);
    await this.publish('task.dependency_added', event);
  }

  async publishTaskDependencyRemoved(taskId: string, dependencyId: string): Promise<void> {
    const event: TaskDependencyRemovedEvent = {
      eventId: uuidv4(),
      eventType: 'task.dependency_removed',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle: taskId, // Mock
        dependencyId,
        dependencyType: 'blocks', // Mock
        targetTaskId: 'target', // Mock
        targetTaskTitle: 'Target Task' // Mock
      }
    };

    this.eventStore.push(event);
    await this.publish('task.dependency_removed', event);
  }

  async publishTaskScheduled(taskId: string, schedule: any): Promise<void> {
    const event: TaskScheduledEvent = {
      eventId: uuidv4(),
      eventType: 'task.scheduled',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle: taskId, // Mock
        scheduledAt: schedule.scheduledAt || new Date().toISOString(),
        startDate: schedule.startDate,
        dueDate: schedule.dueDate,
        recurringPattern: schedule.recurringPattern,
        nextExecution: schedule.nextExecution,
        assignee: null // Mock
      }
    };

    this.eventStore.push(event);
    await this.publish('task.scheduled', event);
  }

  async publishTaskCommentAdded(taskId: string, taskTitle: string, commentId: string, content: string, author: User, parentCommentId: string | null, assignee: User | null): Promise<void> {
    const event: TaskCommentAddedEvent = {
      eventId: uuidv4(),
      eventType: 'task.comment_added',
      timestamp: new Date().toISOString(),
      source: 'task-service',
      version: '1.0',
      correlationId: uuidv4(),
      data: {
        taskId,
        taskTitle,
        commentId,
        content,
        author,
        parentCommentId,
        assignee
      }
    };

    this.eventStore.push(event);
    await this.publish('task.comment_added', event);
  }

  // Utility methods for testing and monitoring
  getEventStore(): TaskEvent[] {
    return [...this.eventStore];
  }

  clearEventStore(): void {
    this.eventStore = [];
  }

  getEventCount(): number {
    return this.eventStore.length;
  }

  getEventsByType(eventType: string): TaskEvent[] {
    return this.eventStore.filter(event => event.eventType === eventType);
  }

  getEventsForTask(taskId: string): TaskEvent[] {
    return this.eventStore.filter(event => {
      const data = event.data as any;
      return data.taskId === taskId;
    });
  }
}