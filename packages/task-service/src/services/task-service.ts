import { 
  Task, 
  TaskListQuery, 
  TaskListResponse,
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  AssignTaskRequest,
  AddDependencyRequest,
  TaskDependenciesResponse,
  TaskDependencyResponse,
  ScheduleTaskRequest,
  TaskScheduleResponse,
  UpdateProgressRequest,
  TaskProgressResponse,
  AddCommentRequest,
  TaskCommentsResponse,
  TaskCommentResponse,
  SearchTasksRequest,
  SearchTasksResponse,
  TaskAnalyticsQuery,
  TaskAnalyticsResponse
} from '../types/task-types';
import { TaskServiceInterface } from '../types/service-types';
import { MockDataService } from './mock-data-service';
import { EventService } from './event-service';
import { QueueService } from './queue-service';
import { SchedulerService } from './scheduler-service';
import { logger } from '@cycletime/shared-utils';

export class TaskService implements TaskServiceInterface {
  constructor(
    private mockDataService: MockDataService,
    private eventService: EventService,
    private queueService: QueueService,
    private schedulerService: SchedulerService
  ) {}

  // Task CRUD operations
  async createTask(request: CreateTaskRequest, userId: string = 'system'): Promise<Task> {
    try {
      const task = await this.mockDataService.createTask(request, userId);
      
      // Publish task created event
      await this.eventService.publishTaskCreated(task);
      
      // Schedule notifications if needed
      if (task.schedule.dueDate) {
        await this.queueService.scheduleNotification(task.id, 'due_date_reminder', task.schedule.dueDate);
      }
      
      logger.info(`Task created: ${task.id} - ${task.title}`);
      return task;
    } catch (error) {
      logger.error('Error creating task:', error);
      throw error;
    }
  }

  async getTask(id: string, includeHistory: boolean = false): Promise<Task | null> {
    try {
      const task = await this.mockDataService.getTask(id);
      
      if (!task) {
        logger.warn(`Task not found: ${id}`);
        return null;
      }

      // Optionally filter out history for performance
      if (!includeHistory) {
        return {
          ...task,
          history: []
        };
      }

      return task;
    } catch (error) {
      logger.error(`Error getting task ${id}:`, error);
      throw error;
    }
  }

  async updateTask(id: string, updates: UpdateTaskRequest, userId: string = 'system'): Promise<Task | null> {
    try {
      const existingTask = await this.mockDataService.getTask(id);
      if (!existingTask) {
        logger.warn(`Task not found for update: ${id}`);
        return null;
      }

      const updatedTask = await this.mockDataService.updateTask(id, updates, userId);
      if (!updatedTask) {
        return null;
      }

      // Detect significant changes and publish events
      const changes = this.detectTaskChanges(existingTask, updatedTask);
      
      await this.eventService.publishTaskUpdated(updatedTask, changes);

      // Handle status changes
      if (existingTask.status !== updatedTask.status) {
        await this.handleStatusChange(existingTask, updatedTask, userId);
      }

      // Handle priority changes
      if (existingTask.priority !== updatedTask.priority) {
        await this.eventService.publishTaskPriorityChanged(
          updatedTask.id,
          updatedTask.title,
          existingTask.priority,
          updatedTask.priority,
          updatedTask.assignee
        );
      }

      logger.info(`Task updated: ${id} - ${updatedTask.title}`);
      return updatedTask;
    } catch (error) {
      logger.error(`Error updating task ${id}:`, error);
      throw error;
    }
  }

  async deleteTask(id: string, permanent: boolean = false): Promise<boolean> {
    try {
      const task = await this.mockDataService.getTask(id);
      if (!task) {
        logger.warn(`Task not found for deletion: ${id}`);
        return false;
      }

      const success = await this.mockDataService.deleteTask(id, permanent);
      
      if (success) {
        await this.eventService.publishTaskDeleted(id, task.title, permanent);
        logger.info(`Task deleted: ${id} - ${task.title} (permanent: ${permanent})`);
      }

      return success;
    } catch (error) {
      logger.error(`Error deleting task ${id}:`, error);
      throw error;
    }
  }

  async listTasks(query: TaskListQuery): Promise<TaskListResponse> {
    try {
      const { tasks, total } = await this.mockDataService.listTasks(query);
      
      // Calculate pagination
      const totalPages = Math.ceil(total / query.limit);
      const hasNext = query.page < totalPages;
      const hasPrevious = query.page > 1;

      // Generate facets
      const allTasks = (await this.mockDataService.listTasks({ ...query, limit: 1000, page: 1 })).tasks;
      const statusCounts = this.generateFacetCounts(allTasks, 'status');
      const priorityCounts = this.generateFacetCounts(allTasks, 'priority');

      return {
        tasks,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages,
          hasNext,
          hasPrevious
        },
        filters: {
          status: query.status,
          priority: query.priority,
          assignee: query.assignee,
          project: query.project,
          search: query.search
        },
        facets: {
          statuses: statusCounts,
          priorities: priorityCounts
        }
      };
    } catch (error) {
      logger.error('Error listing tasks:', error);
      throw error;
    }
  }

  // Task assignment
  async assignTask(taskId: string, assigneeId: string, comment?: string, userId: string = 'system'): Promise<Task | null> {
    try {
      const existingTask = await this.mockDataService.getTask(taskId);
      if (!existingTask) {
        logger.warn(`Task not found for assignment: ${taskId}`);
        return null;
      }

      const updatedTask = await this.mockDataService.assignTask(taskId, assigneeId, userId);
      if (!updatedTask) {
        return null;
      }

      // Publish assignment event
      await this.eventService.publishTaskAssigned(
        taskId,
        updatedTask.title,
        updatedTask.assignee!,
        existingTask.assignee,
        comment
      );

      // Schedule notification
      await this.queueService.scheduleNotification(taskId, 'task_assigned', new Date().toISOString());

      logger.info(`Task assigned: ${taskId} to ${updatedTask.assignee?.name}`);
      return updatedTask;
    } catch (error) {
      logger.error(`Error assigning task ${taskId}:`, error);
      throw error;
    }
  }

  async unassignTask(taskId: string, userId: string = 'system'): Promise<Task | null> {
    try {
      const existingTask = await this.mockDataService.getTask(taskId);
      if (!existingTask) {
        logger.warn(`Task not found for unassignment: ${taskId}`);
        return null;
      }

      const updatedTask = await this.mockDataService.unassignTask(taskId, userId);
      if (!updatedTask) {
        return null;
      }

      // Publish unassignment event
      await this.eventService.publishTaskUnassigned(
        taskId,
        updatedTask.title,
        existingTask.assignee!
      );

      logger.info(`Task unassigned: ${taskId} from ${existingTask.assignee?.name}`);
      return updatedTask;
    } catch (error) {
      logger.error(`Error unassigning task ${taskId}:`, error);
      throw error;
    }
  }

  // Task dependencies
  async getDependencies(taskId: string): Promise<TaskDependenciesResponse> {
    try {
      const dependencies = await this.mockDataService.getDependencies(taskId);
      return {
        taskId,
        dependencies
      };
    } catch (error) {
      logger.error(`Error getting dependencies for task ${taskId}:`, error);
      throw error;
    }
  }

  async addDependency(taskId: string, request: AddDependencyRequest, userId: string = 'system'): Promise<TaskDependencyResponse> {
    try {
      // Validate that both tasks exist
      const sourceTask = await this.mockDataService.getTask(taskId);
      const targetTask = await this.mockDataService.getTask(request.targetTaskId);
      
      if (!sourceTask || !targetTask) {
        throw new Error('Source or target task not found');
      }

      // Check for circular dependencies
      const wouldCreateCircularDependency = await this.checkCircularDependency(taskId, request.targetTaskId);
      if (wouldCreateCircularDependency) {
        throw new Error('Adding this dependency would create a circular dependency');
      }

      const dependency = await this.mockDataService.addDependency(taskId, request, userId);
      
      // Publish dependency added event
      await this.eventService.publishTaskDependencyAdded(
        taskId,
        sourceTask.title,
        dependency.id,
        dependency.type,
        request.targetTaskId,
        targetTask.title,
        request.comment
      );

      logger.info(`Dependency added: ${taskId} ${dependency.type} ${request.targetTaskId}`);
      return { dependency };
    } catch (error) {
      logger.error(`Error adding dependency to task ${taskId}:`, error);
      throw error;
    }
  }

  async removeDependency(taskId: string, dependencyId: string): Promise<boolean> {
    try {
      const success = await this.mockDataService.removeDependency(dependencyId);
      
      if (success) {
        // Publish dependency removed event
        await this.eventService.publishTaskDependencyRemoved(taskId, dependencyId);
        logger.info(`Dependency removed: ${dependencyId} from task ${taskId}`);
      }

      return success;
    } catch (error) {
      logger.error(`Error removing dependency ${dependencyId} from task ${taskId}:`, error);
      throw error;
    }
  }

  // Task scheduling
  async getSchedule(taskId: string): Promise<TaskScheduleResponse | null> {
    try {
      const schedule = await this.mockDataService.getProgress(taskId);
      if (!schedule) {
        return null;
      }

      return {
        schedule: {
          taskId,
          startDate: schedule.taskId, // This is a mock implementation
          dueDate: null,
          scheduledAt: null,
          recurringPattern: null,
          nextExecution: null,
          executionHistory: []
        }
      };
    } catch (error) {
      logger.error(`Error getting schedule for task ${taskId}:`, error);
      throw error;
    }
  }

  async scheduleTask(taskId: string, request: ScheduleTaskRequest, userId: string = 'system'): Promise<TaskScheduleResponse> {
    try {
      // Update task with schedule information
      await this.mockDataService.updateTask(taskId, {
        startDate: request.startDate,
        dueDate: request.dueDate
      }, userId);

      // If this is a recurring task, register it with the scheduler
      if (request.recurringPattern) {
        await this.schedulerService.scheduleRecurringTask(taskId, request.recurringPattern);
      }

      // Mock schedule response
      const schedule = {
        taskId,
        startDate: request.startDate,
        dueDate: request.dueDate,
        scheduledAt: request.scheduledAt,
        recurringPattern: request.recurringPattern,
        nextExecution: request.recurringPattern ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
        executionHistory: []
      };

      // Publish schedule event
      await this.eventService.publishTaskScheduled(taskId, schedule);

      logger.info(`Task scheduled: ${taskId}`);
      return { schedule };
    } catch (error) {
      logger.error(`Error scheduling task ${taskId}:`, error);
      throw error;
    }
  }

  // Task progress
  async getProgress(taskId: string): Promise<TaskProgressResponse | null> {
    try {
      const progress = await this.mockDataService.getProgress(taskId);
      if (!progress) {
        return null;
      }

      return { progress };
    } catch (error) {
      logger.error(`Error getting progress for task ${taskId}:`, error);
      throw error;
    }
  }

  async updateProgress(taskId: string, request: UpdateProgressRequest, userId: string = 'system'): Promise<TaskProgressResponse | null> {
    try {
      const existingProgress = await this.mockDataService.getProgress(taskId);
      const updatedProgress = await this.mockDataService.updateProgress(taskId, request, userId);
      
      if (!updatedProgress) {
        return null;
      }

      // Publish progress update event
      await this.eventService.publishTaskProgressUpdated(
        taskId,
        updatedProgress.taskId, // Using as title for mock
        existingProgress?.progress || 0,
        request.progress,
        request.timeSpent,
        request.comment,
        null // assignee - would be fetched from task in real implementation
      );

      // Check if task is completed
      if (request.progress >= 100) {
        const task = await this.mockDataService.getTask(taskId);
        if (task) {
          await this.mockDataService.updateTask(taskId, { status: 'completed' }, userId);
          await this.eventService.publishTaskCompleted(task, request.timeSpent || 0);
        }
      }

      logger.info(`Progress updated for task ${taskId}: ${request.progress}%`);
      return { progress: updatedProgress };
    } catch (error) {
      logger.error(`Error updating progress for task ${taskId}:`, error);
      throw error;
    }
  }

  // Task comments
  async getComments(taskId: string, query: { page?: number; limit?: number } = {}): Promise<TaskCommentsResponse> {
    try {
      const comments = await this.mockDataService.getComments(taskId);
      
      // Simple pagination for mock implementation
      const page = query.page || 1;
      const limit = query.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedComments = comments.slice(startIndex, endIndex);

      return {
        comments: paginatedComments,
        pagination: {
          page,
          limit,
          total: comments.length,
          totalPages: Math.ceil(comments.length / limit),
          hasNext: endIndex < comments.length,
          hasPrevious: page > 1
        }
      };
    } catch (error) {
      logger.error(`Error getting comments for task ${taskId}:`, error);
      throw error;
    }
  }

  async addComment(taskId: string, request: AddCommentRequest, userId: string = 'system'): Promise<TaskCommentResponse> {
    try {
      const comment = await this.mockDataService.addComment(taskId, request, userId);
      
      // Publish comment added event
      await this.eventService.publishTaskCommentAdded(
        taskId,
        'Task', // Mock title
        comment.id,
        comment.content,
        comment.author,
        request.parentId,
        null // assignee
      );

      logger.info(`Comment added to task ${taskId}: ${comment.id}`);
      return { comment };
    } catch (error) {
      logger.error(`Error adding comment to task ${taskId}:`, error);
      throw error;
    }
  }

  async updateComment(taskId: string, commentId: string, updates: any): Promise<TaskCommentResponse | null> {
    // Mock implementation - in real service this would update the comment
    logger.info(`Comment update requested for task ${taskId}, comment ${commentId}`);
    return null;
  }

  async deleteComment(taskId: string, commentId: string): Promise<boolean> {
    // Mock implementation - in real service this would delete the comment
    logger.info(`Comment deletion requested for task ${taskId}, comment ${commentId}`);
    return true;
  }

  // Search and analytics
  async searchTasks(request: SearchTasksRequest): Promise<SearchTasksResponse> {
    try {
      const { tasks, total } = await this.mockDataService.searchTasks(request);
      
      // Mock search results with highlighting
      const results = tasks.map(task => ({
        task,
        score: Math.random() * 100, // Mock relevance score
        highlights: {
          title: task.title.toLowerCase().includes(request.query.toLowerCase()) ? [task.title] : [],
          description: task.description.toLowerCase().includes(request.query.toLowerCase()) ? [task.description] : []
        }
      }));

      return {
        query: request.query,
        results,
        pagination: {
          page: request.pagination?.page || 1,
          limit: request.pagination?.limit || 20,
          total,
          totalPages: Math.ceil(total / (request.pagination?.limit || 20)),
          hasNext: total > (request.pagination?.limit || 20),
          hasPrevious: (request.pagination?.page || 1) > 1
        },
        facets: {
          statuses: this.generateFacetCounts(tasks, 'status'),
          priorities: this.generateFacetCounts(tasks, 'priority'),
          types: this.generateFacetCounts(tasks, 'type')
        },
        statistics: {
          totalTasks: total,
          searchTime: Math.random() * 100, // Mock search time
          maxScore: Math.max(...results.map(r => r.score))
        }
      };
    } catch (error) {
      logger.error('Error searching tasks:', error);
      throw error;
    }
  }

  async getAnalytics(query: TaskAnalyticsQuery): Promise<TaskAnalyticsResponse> {
    try {
      const analytics = await this.mockDataService.getAnalytics(query);
      return { analytics };
    } catch (error) {
      logger.error('Error getting analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private detectTaskChanges(oldTask: Task, newTask: Task): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    const fieldsToCheck = ['title', 'description', 'status', 'priority', 'progress', 'estimatedHours', 'actualHours'];
    
    fieldsToCheck.forEach(field => {
      const oldValue = (oldTask as any)[field];
      const newValue = (newTask as any)[field];
      
      if (oldValue !== newValue) {
        changes.push({ field, oldValue, newValue });
      }
    });

    return changes;
  }

  private async handleStatusChange(oldTask: Task, newTask: Task, userId: string): Promise<void> {
    // Publish status change event
    await this.eventService.publishTaskStatusChanged(
      newTask.id,
      newTask.title,
      oldTask.status,
      newTask.status,
      new Date().toISOString(),
      newTask.assignee
    );

    // Handle specific status changes
    switch (newTask.status) {
      case 'completed':
        const completionTime = newTask.actualHours || 0;
        await this.eventService.publishTaskCompleted(newTask, completionTime);
        break;
      case 'failed':
        await this.eventService.publishTaskFailed(newTask.id, 'Task marked as failed', null, newTask.assignee, 0);
        break;
    }
  }

  private async checkCircularDependency(sourceTaskId: string, targetTaskId: string): Promise<boolean> {
    // Mock implementation - in real service this would check for circular dependencies
    // For now, just return false
    return false;
  }

  private generateFacetCounts(tasks: Task[], field: keyof Task): Array<{ value: string; count: number }> {
    const counts: Record<string, number> = {};
    
    tasks.forEach(task => {
      const value = String(task[field]);
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts).map(([value, count]) => ({ value, count }));
  }
}