import { v4 as uuidv4 } from 'uuid';
import { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  TaskType, 
  TaskDependencyEntry, 
  TaskScheduleEntry, 
  TaskProgress, 
  TaskComment, 
  User, 
  Project,
  DependencyType,
  TaskListQuery,
  CreateTaskRequest,
  UpdateTaskRequest,
  AddDependencyRequest,
  ScheduleTaskRequest,
  UpdateProgressRequest,
  AddCommentRequest,
  SearchTasksRequest,
  TaskAnalyticsQuery
} from '../types/task-types';
import {
  TaskTemplate,
  CreateTaskTemplateRequest,
  UpdateTaskTemplateRequest,
  ApplyTaskTemplateRequest,
  TaskTemplateListResponse,
  ApplyTaskTemplateResponse,
  TemplateVariable,
  TemplateUsageStats,
  TaskRisk,
  TaskRisksResponse,
  AddTaskRiskRequest,
  UpdateTaskRiskRequest,
  MitigationStrategy
} from '../types/service-types';
import { logger } from '@cycletime/shared-utils';

export class MockDataService {
  private tasks: Map<string, Task> = new Map();
  private dependencies: Map<string, TaskDependencyEntry> = new Map();
  private schedules: Map<string, TaskScheduleEntry> = new Map();
  private progress: Map<string, TaskProgress> = new Map();
  private comments: Map<string, TaskComment[]> = new Map();
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private templates: Map<string, TaskTemplate> = new Map();
  private risks: Map<string, TaskRisk[]> = new Map(); // taskId -> TaskRisk[]

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize mock users
    const mockUsers: User[] = [
      { id: '550e8400-e29b-41d4-a716-446655440001', name: 'John Doe', email: 'john.doe@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Jane Smith', email: 'jane.smith@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Bob Johnson', email: 'bob.johnson@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Alice Williams', email: 'alice.williams@example.com' },
      { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Charlie Brown', email: 'charlie.brown@example.com' }
    ];

    mockUsers.forEach(user => this.users.set(user.id, user));

    // Initialize mock projects
    const mockProjects: Project[] = [
      { id: '660e8400-e29b-41d4-a716-446655440001', name: 'CycleTime Core Platform' },
      { id: '660e8400-e29b-41d4-a716-446655440002', name: 'Task Management System' },
      { id: '660e8400-e29b-41d4-a716-446655440003', name: 'Analytics Dashboard' },
      { id: '660e8400-e29b-41d4-a716-446655440004', name: 'Mobile Application' },
      { id: '660e8400-e29b-41d4-a716-446655440005', name: 'API Gateway' }
    ];

    mockProjects.forEach(project => this.projects.set(project.id, project));

    // Initialize mock tasks
    const mockTasks: Omit<Task, 'id' | 'audit' | 'history'>[] = [
      {
        title: 'Implement user authentication system',
        description: 'Create a secure JWT-based authentication system with role-based access control',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        type: TaskType.FEATURE,
        estimatedHours: 40,
        actualHours: 25,
        progress: 65,
        tags: ['authentication', 'security', 'backend'],
        metadata: { complexity: 'high', module: 'auth' },
        assignee: mockUsers[0],
        project: mockProjects[0],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-01-15T09:00:00Z', 
          dueDate: '2024-01-30T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      },
      {
        title: 'Design task workflow UI',
        description: 'Create intuitive user interface for task management workflow',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        type: TaskType.FEATURE,
        estimatedHours: 24,
        actualHours: 0,
        progress: 0,
        tags: ['ui', 'frontend', 'design'],
        metadata: { complexity: 'medium', module: 'ui' },
        assignee: mockUsers[1],
        project: mockProjects[1],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-02-01T09:00:00Z', 
          dueDate: '2024-02-15T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      },
      {
        title: 'Fix database connection pooling issue',
        description: 'Resolve connection pool exhaustion causing intermittent service failures',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.URGENT,
        type: TaskType.BUG,
        estimatedHours: 8,
        actualHours: 12,
        progress: 100,
        tags: ['database', 'performance', 'bugfix'],
        metadata: { complexity: 'high', module: 'database' },
        assignee: mockUsers[2],
        project: mockProjects[0],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-01-10T09:00:00Z', 
          dueDate: '2024-01-12T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      },
      {
        title: 'Update API documentation',
        description: 'Comprehensive update of OpenAPI specifications and developer guides',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
        type: TaskType.DOCUMENTATION,
        estimatedHours: 16,
        actualHours: 8,
        progress: 30,
        tags: ['documentation', 'api', 'developer-experience'],
        metadata: { complexity: 'low', module: 'docs' },
        assignee: mockUsers[3],
        project: mockProjects[4],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-02-05T09:00:00Z', 
          dueDate: '2024-02-20T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      },
      {
        title: 'Performance optimization research',
        description: 'Research and analyze performance bottlenecks in the current system',
        status: TaskStatus.BLOCKED,
        priority: TaskPriority.MEDIUM,
        type: TaskType.RESEARCH,
        estimatedHours: 32,
        actualHours: 16,
        progress: 20,
        tags: ['performance', 'research', 'optimization'],
        metadata: { complexity: 'high', module: 'performance' },
        assignee: mockUsers[4],
        project: mockProjects[2],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-01-20T09:00:00Z', 
          dueDate: '2024-02-10T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      },
      {
        title: 'Database migration script',
        description: 'Create migration script for schema changes in v2.0',
        status: TaskStatus.FAILED,
        priority: TaskPriority.HIGH,
        type: TaskType.MAINTENANCE,
        estimatedHours: 12,
        actualHours: 20,
        progress: 85,
        tags: ['database', 'migration', 'maintenance'],
        metadata: { complexity: 'medium', module: 'database' },
        assignee: mockUsers[2],
        project: mockProjects[0],
        dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: null },
        schedule: { 
          startDate: '2024-01-25T09:00:00Z', 
          dueDate: '2024-01-28T17:00:00Z',
          scheduledAt: null,
          recurringPattern: null 
        }
      }
    ];

    // Create tasks with proper audit trails
    mockTasks.forEach((taskData, index) => {
      const taskId = uuidv4();
      const now = new Date();
      const createdAt = new Date(now.getTime() - (index * 24 * 60 * 60 * 1000));
      const updatedAt = new Date(createdAt.getTime() + (Math.random() * 24 * 60 * 60 * 1000));
      
      const task: Task = {
        id: taskId,
        ...taskData,
        audit: {
          createdBy: taskData.assignee?.id || mockUsers[0].id,
          createdAt: createdAt.toISOString(),
          updatedBy: taskData.assignee?.id || mockUsers[0].id,
          updatedAt: updatedAt.toISOString(),
          version: Math.floor(Math.random() * 5) + 1
        },
        history: [
          {
            id: uuidv4(),
            action: 'created' as const,
            field: null,
            oldValue: null,
            newValue: null,
            timestamp: createdAt.toISOString(),
            userId: taskData.assignee?.id || mockUsers[0].id,
            comment: 'Task created'
          }
        ]
      };

      this.tasks.set(taskId, task);

      // Create mock progress entries
      if (task.progress > 0) {
        const progressEntry: TaskProgress = {
          taskId: taskId,
          progress: task.progress,
          timeSpent: task.actualHours,
          timeRemaining: Math.max(0, task.estimatedHours - task.actualHours),
          completedSubtasks: Math.floor(task.progress / 25),
          totalSubtasks: 4,
          milestones: [
            {
              id: uuidv4(),
              title: 'Requirements gathering',
              completed: task.progress >= 25,
              completedAt: task.progress >= 25 ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString() : null
            },
            {
              id: uuidv4(),
              title: 'Implementation',
              completed: task.progress >= 50,
              completedAt: task.progress >= 50 ? new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString() : null
            },
            {
              id: uuidv4(),
              title: 'Testing',
              completed: task.progress >= 75,
              completedAt: task.progress >= 75 ? new Date(createdAt.getTime() + 72 * 60 * 60 * 1000).toISOString() : null
            },
            {
              id: uuidv4(),
              title: 'Deployment',
              completed: task.progress >= 100,
              completedAt: task.progress >= 100 ? new Date(createdAt.getTime() + 96 * 60 * 60 * 1000).toISOString() : null
            }
          ],
          progressHistory: [
            {
              timestamp: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              progress: 25,
              comment: 'Initial setup complete',
              updatedBy: task.assignee?.id || mockUsers[0].id
            },
            {
              timestamp: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000).toISOString(),
              progress: task.progress,
              comment: 'Progress update',
              updatedBy: task.assignee?.id || mockUsers[0].id
            }
          ]
        };
        this.progress.set(taskId, progressEntry);
      }

      // Create mock comments
      const commentCount = Math.floor(Math.random() * 4) + 1;
      const taskComments: TaskComment[] = [];
      
      for (let i = 0; i < commentCount; i++) {
        const commentId = uuidv4();
        const commentTime = new Date(createdAt.getTime() + (i + 1) * 12 * 60 * 60 * 1000);
        
        const comment: TaskComment = {
          id: commentId,
          content: `This is comment ${i + 1} for task ${task.title}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          author: mockUsers[Math.floor(Math.random() * mockUsers.length)],
          parentId: null,
          thread: [],
          attachments: [],
          createdAt: commentTime.toISOString(),
          updatedAt: commentTime.toISOString()
        };
        
        taskComments.push(comment);
      }
      
      this.comments.set(taskId, taskComments);
    });

    // Create some dependencies between tasks
    const taskIds = Array.from(this.tasks.keys());
    const dependencyTypes = Object.values(DependencyType);
    
    for (let i = 0; i < 3; i++) {
      const sourceTaskId = taskIds[i];
      const targetTaskId = taskIds[i + 1];
      const dependencyType = dependencyTypes[Math.floor(Math.random() * dependencyTypes.length)];
      
      const dependency: TaskDependencyEntry = {
        id: uuidv4(),
        type: dependencyType,
        sourceTaskId,
        targetTaskId,
        createdAt: new Date().toISOString(),
        createdBy: mockUsers[0].id
      };
      
      this.dependencies.set(dependency.id, dependency);
    }

    // Initialize mock templates
    this.initializeMockTemplates();

    // Initialize advanced templates
    const advancedTemplates = this.generateAdvancedTemplateData();
    advancedTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    logger.info(`Initialized mock data: ${this.tasks.size} tasks, ${this.dependencies.size} dependencies, ${this.templates.size} templates (including ${advancedTemplates.length} advanced templates)`);
  }

  // Task CRUD operations
  async createTask(request: CreateTaskRequest, userId: string): Promise<Task> {
    const taskId = uuidv4();
    const now = new Date();
    
    const task: Task = {
      id: taskId,
      title: request.title,
      description: request.description || '',
      status: TaskStatus.PENDING,
      priority: request.priority || TaskPriority.MEDIUM,
      type: request.type || TaskType.FEATURE,
      estimatedHours: request.estimatedHours || 0,
      actualHours: 0,
      progress: 0,
      tags: request.tags || [],
      metadata: request.metadata || {},
      assignee: request.assigneeId ? this.users.get(request.assigneeId) || null : null,
      project: request.projectId ? this.projects.get(request.projectId) || null : null,
      dependencies: { blocks: [], dependsOn: [], subtasks: [], parent: request.parentId || null },
      schedule: { 
        startDate: request.startDate || null, 
        dueDate: request.dueDate || null,
        scheduledAt: null,
        recurringPattern: null 
      },
      audit: {
        createdBy: userId,
        createdAt: now.toISOString(),
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: 1
      },
      history: [
        {
          id: uuidv4(),
          action: 'created' as const,
          field: null,
          oldValue: null,
          newValue: null,
          timestamp: now.toISOString(),
          userId: userId,
          comment: 'Task created'
        }
      ]
    };

    this.tasks.set(taskId, task);
    return task;
  }

  async getTask(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async updateTask(id: string, updates: UpdateTaskRequest, userId: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    const now = new Date();
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Track changes
    Object.entries(updates).forEach(([field, newValue]) => {
      if (field === 'version') return; // Skip version field
      
      const currentValue = (task as any)[field];
      if (currentValue !== newValue) {
        changes.push({ field, oldValue: currentValue, newValue });
      }
    });

    // Apply updates
    const updatedTask: Task = {
      ...task,
      ...updates,
      assignee: updates.assigneeId ? this.users.get(updates.assigneeId) || null : task.assignee,
      project: updates.projectId ? this.projects.get(updates.projectId) || null : task.project,
      audit: {
        ...task.audit,
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: task.audit.version + 1
      },
      history: [
        ...task.history,
        ...changes.map(change => ({
          id: uuidv4(),
          action: 'updated' as const,
          field: change.field,
          oldValue: String(change.oldValue),
          newValue: String(change.newValue),
          timestamp: now.toISOString(),
          userId: userId,
          comment: `Updated ${change.field}`
        }))
      ]
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string, permanent: boolean = false): Promise<boolean> {
    const task = this.tasks.get(id);
    if (!task) return false;

    if (permanent) {
      this.tasks.delete(id);
      this.dependencies.forEach((dep, depId) => {
        if (dep.sourceTaskId === id || dep.targetTaskId === id) {
          this.dependencies.delete(depId);
        }
      });
      this.schedules.delete(id);
      this.progress.delete(id);
      this.comments.delete(id);
    } else {
      // Soft delete
      const updatedTask = {
        ...task,
        status: TaskStatus.CANCELLED,
        audit: {
          ...task.audit,
          updatedAt: new Date().toISOString(),
          version: task.audit.version + 1
        }
      };
      this.tasks.set(id, updatedTask);
    }

    return true;
  }

  async listTasks(query: TaskListQuery): Promise<{ tasks: Task[]; total: number }> {
    let filteredTasks = Array.from(this.tasks.values());

    // Apply filters
    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm)
      );
    }

    if (query.status) {
      filteredTasks = filteredTasks.filter(task => task.status === query.status);
    }

    if (query.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === query.priority);
    }

    if (query.assignee) {
      filteredTasks = filteredTasks.filter(task => task.assignee?.id === query.assignee);
    }

    if (query.project) {
      filteredTasks = filteredTasks.filter(task => task.project?.id === query.project);
    }

    if (query.dueDate) {
      const targetDate = new Date(query.dueDate);
      filteredTasks = filteredTasks.filter(task => {
        if (!task.schedule.dueDate) return false;
        const taskDueDate = new Date(task.schedule.dueDate);
        return taskDueDate.toDateString() === targetDate.toDateString();
      });
    }

    if (query.tags) {
      const searchTags = query.tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredTasks = filteredTasks.filter(task => 
        searchTags.some(searchTag => 
          task.tags.some(taskTag => taskTag.toLowerCase().includes(searchTag))
        )
      );
    }

    // Sort tasks
    filteredTasks.sort((a, b) => {
      let aValue, bValue;
      
      switch (query.sortBy) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'dueDate':
          aValue = a.schedule.dueDate || '9999-12-31';
          bValue = b.schedule.dueDate || '9999-12-31';
          break;
        case 'updatedAt':
          aValue = a.audit.updatedAt;
          bValue = b.audit.updatedAt;
          break;
        case 'createdAt':
        default:
          aValue = a.audit.createdAt;
          bValue = b.audit.createdAt;
          break;
      }

      if (query.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Pagination
    const startIndex = (query.page - 1) * query.limit;
    const endIndex = startIndex + query.limit;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    return {
      tasks: paginatedTasks,
      total: filteredTasks.length
    };
  }

  // Task assignment
  async assignTask(taskId: string, assigneeId: string, userId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const assignee = this.users.get(assigneeId);
    if (!assignee) return null;

    const now = new Date();
    const updatedTask: Task = {
      ...task,
      assignee,
      audit: {
        ...task.audit,
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: task.audit.version + 1
      },
      history: [
        ...task.history,
        {
          id: uuidv4(),
          action: 'assigned' as const,
          field: 'assignee',
          oldValue: task.assignee?.id || null,
          newValue: assigneeId,
          timestamp: now.toISOString(),
          userId: userId,
          comment: `Assigned to ${assignee.name}`
        }
      ]
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  async unassignTask(taskId: string, userId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const now = new Date();
    const previousAssignee = task.assignee;
    
    const updatedTask: Task = {
      ...task,
      assignee: null,
      audit: {
        ...task.audit,
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: task.audit.version + 1
      },
      history: [
        ...task.history,
        {
          id: uuidv4(),
          action: 'unassigned' as const,
          field: 'assignee',
          oldValue: previousAssignee?.id || null,
          newValue: null,
          timestamp: now.toISOString(),
          userId: userId,
          comment: `Unassigned from ${previousAssignee?.name || 'unknown'}`
        }
      ]
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  // Dependencies
  async getDependencies(taskId: string): Promise<TaskDependencyEntry[]> {
    return Array.from(this.dependencies.values()).filter(dep => 
      dep.sourceTaskId === taskId || dep.targetTaskId === taskId
    );
  }

  async addDependency(taskId: string, request: AddDependencyRequest, userId: string): Promise<TaskDependencyEntry> {
    const dependency: TaskDependencyEntry = {
      id: uuidv4(),
      type: request.type,
      sourceTaskId: taskId,
      targetTaskId: request.targetTaskId,
      createdAt: new Date().toISOString(),
      createdBy: userId
    };

    this.dependencies.set(dependency.id, dependency);
    return dependency;
  }

  async removeDependency(dependencyId: string): Promise<boolean> {
    return this.dependencies.delete(dependencyId);
  }

  // Progress tracking
  async getProgress(taskId: string): Promise<TaskProgress | null> {
    return this.progress.get(taskId) || null;
  }

  async updateProgress(taskId: string, request: UpdateProgressRequest, userId: string): Promise<TaskProgress | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const existingProgress = this.progress.get(taskId);
    const now = new Date();
    
    const updatedProgress: TaskProgress = {
      taskId,
      progress: request.progress,
      timeSpent: request.timeSpent,
      timeRemaining: Math.max(0, task.estimatedHours - request.timeSpent),
      completedSubtasks: Math.floor(request.progress / 25),
      totalSubtasks: existingProgress?.totalSubtasks || 4,
      milestones: existingProgress?.milestones || [],
      progressHistory: [
        ...(existingProgress?.progressHistory || []),
        {
          timestamp: now.toISOString(),
          progress: request.progress,
          comment: request.comment,
          updatedBy: userId
        }
      ]
    };

    this.progress.set(taskId, updatedProgress);
    
    // Update task progress
    await this.updateTask(taskId, { progress: request.progress, actualHours: request.timeSpent }, userId);
    
    return updatedProgress;
  }

  // Comments
  async getComments(taskId: string): Promise<TaskComment[]> {
    return this.comments.get(taskId) || [];
  }

  async addComment(taskId: string, request: AddCommentRequest, userId: string): Promise<TaskComment> {
    const author = this.users.get(userId);
    if (!author) throw new Error('User not found');

    const now = new Date();
    const comment: TaskComment = {
      id: uuidv4(),
      content: request.content,
      author,
      parentId: request.parentId,
      thread: [],
      attachments: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    const existingComments = this.comments.get(taskId) || [];
    existingComments.push(comment);
    this.comments.set(taskId, existingComments);

    return comment;
  }

  // Search
  async searchTasks(request: SearchTasksRequest): Promise<{ tasks: Task[]; total: number }> {
    let filteredTasks = Array.from(this.tasks.values());

    // Apply search query
    if (request.query) {
      const searchTerm = request.query.toLowerCase();
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (request.filters.status) {
      filteredTasks = filteredTasks.filter(task => 
        request.filters.status!.includes(task.status)
      );
    }

    if (request.filters.priority) {
      filteredTasks = filteredTasks.filter(task => 
        request.filters.priority!.includes(task.priority)
      );
    }

    if (request.filters.assignee) {
      filteredTasks = filteredTasks.filter(task => 
        task.assignee && request.filters.assignee!.includes(task.assignee.id)
      );
    }

    if (request.filters.project) {
      filteredTasks = filteredTasks.filter(task => 
        task.project && request.filters.project!.includes(task.project.id)
      );
    }

    return {
      tasks: filteredTasks,
      total: filteredTasks.length
    };
  }

  // Analytics
  async getAnalytics(query: TaskAnalyticsQuery): Promise<any> {
    const tasks = Array.from(this.tasks.values());
    const now = new Date();
    
    // Filter by time range
    const timeRangeMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    
    const cutoffTime = new Date(now.getTime() - timeRangeMs[query.timeRange]);
    
    const recentTasks = tasks.filter(task => 
      new Date(task.audit.createdAt) >= cutoffTime
    );

    const completedTasks = recentTasks.filter(task => task.status === TaskStatus.COMPLETED);
    const pendingTasks = recentTasks.filter(task => task.status === TaskStatus.PENDING);
    const overdueTasks = recentTasks.filter(task => {
      if (!task.schedule.dueDate) return false;
      return new Date(task.schedule.dueDate) < now && task.status !== TaskStatus.COMPLETED;
    });

    return {
      timeRange: query.timeRange,
      summary: {
        totalTasks: recentTasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        overdueTasks: overdueTasks.length,
        averageCompletionTime: completedTasks.length > 0 
          ? completedTasks.reduce((sum, task) => sum + task.actualHours, 0) / completedTasks.length
          : 0,
        averageProgress: recentTasks.length > 0
          ? recentTasks.reduce((sum, task) => sum + task.progress, 0) / recentTasks.length
          : 0
      },
      breakdown: Object.values(TaskStatus).map(status => ({
        category: status,
        count: recentTasks.filter(task => task.status === status).length,
        percentage: recentTasks.length > 0 
          ? (recentTasks.filter(task => task.status === status).length / recentTasks.length) * 100
          : 0
      })),
      trends: [],
      performance: {
        velocityTrend: [],
        burndownRate: completedTasks.length > 0 ? completedTasks.length / recentTasks.length : 0,
        cycleTime: 0,
        leadTime: 0
      }
    };
  }

  // Template initialization
  private initializeMockTemplates() {
    const mockTemplates: Array<Omit<TaskTemplate, 'id' | 'audit'>> = [
      {
        name: 'Feature Development Template',
        description: 'Complete template for developing new features with testing, documentation, and deployment',
        category: 'feature',
        tags: ['development', 'feature', 'testing', 'documentation'],
        template: {
          title: 'Implement {{feature_name}}',
          description: 'Develop {{feature_name}} feature with comprehensive testing and documentation. This includes planning, implementation, testing, and deployment phases.',
          type: 'feature',
          priority: 'medium',
          estimatedHours: 40,
          acceptanceCriteria: [
            'Feature requirements are clearly defined',
            'Implementation follows coding standards',
            'Unit tests achieve 90% coverage',
            'Integration tests pass',
            'Documentation is complete and reviewed',
            'Performance benchmarks are met'
          ],
          subtasks: [
            {
              title: 'Research and Planning for {{feature_name}}',
              description: 'Analyze requirements and create technical specification',
              type: 'research',
              priority: 'high',
              estimatedHours: 8
            },
            {
              title: 'Core Implementation of {{feature_name}}',
              description: 'Implement the main functionality',
              type: 'feature',
              priority: 'high',
              estimatedHours: 20
            },
            {
              title: 'Write Tests for {{feature_name}}',
              description: 'Create comprehensive unit and integration tests',
              type: 'feature',
              priority: 'medium',
              estimatedHours: 8
            },
            {
              title: 'Documentation for {{feature_name}}',
              description: 'Create user and developer documentation',
              type: 'documentation',
              priority: 'low',
              estimatedHours: 4
            }
          ],
          dependencies: [
            {
              type: 'external',
              description: 'API design approval from architecture team'
            },
            {
              type: 'external',
              description: 'Database schema changes reviewed'
            }
          ],
          metadata: {
            complexity: 'medium',
            skills: ['backend', 'frontend', 'testing'],
            reviewRequired: true
          }
        },
        variables: [
          {
            name: 'feature_name',
            type: 'string',
            required: true,
            description: 'Name of the feature to implement'
          },
          {
            name: 'estimated_hours',
            type: 'number',
            required: false,
            defaultValue: 40,
            description: 'Estimated hours for completion',
            validation: {
              min: 1,
              max: 200
            }
          },
          {
            name: 'priority',
            type: 'string',
            required: false,
            defaultValue: 'medium',
            description: 'Priority level for the feature',
            validation: {
              options: ['low', 'medium', 'high', 'urgent']
            }
          }
        ],
        usage: {
          timesUsed: 47,
          lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.3,
          successRate: 0.89,
          averageCompletionTime: 38.5
        }
      },
      {
        name: 'Bug Fix Template',
        description: 'Systematic approach to bug investigation, fixing, and verification',
        category: 'bug',
        tags: ['bugfix', 'debugging', 'testing', 'hotfix'],
        template: {
          title: 'Fix {{bug_title}}',
          description: 'Investigate and resolve {{bug_title}}. Priority: {{priority}}. Affects: {{affected_components}}.',
          type: 'bug',
          priority: 'high',
          estimatedHours: 8,
          acceptanceCriteria: [
            'Root cause is identified and documented',
            'Fix is implemented without breaking existing functionality',
            'Regression tests are added',
            'Fix is verified in staging environment',
            'Post-deployment monitoring confirms resolution'
          ],
          subtasks: [
            {
              title: 'Investigate {{bug_title}}',
              description: 'Analyze logs, reproduce the issue, and identify root cause',
              type: 'research',
              priority: 'urgent',
              estimatedHours: 3
            },
            {
              title: 'Implement Fix for {{bug_title}}',
              description: 'Apply the fix and ensure no side effects',
              type: 'bug',
              priority: 'urgent',
              estimatedHours: 3
            },
            {
              title: 'Test Fix for {{bug_title}}',
              description: 'Verify fix works and add regression tests',
              type: 'bug',
              priority: 'high',
              estimatedHours: 2
            }
          ],
          dependencies: [
            {
              type: 'external',
              description: 'Access to production logs and monitoring data'
            }
          ],
          metadata: {
            complexity: 'variable',
            urgency: 'high',
            riskLevel: 'medium'
          }
        },
        variables: [
          {
            name: 'bug_title',
            type: 'string',
            required: true,
            description: 'Brief description of the bug'
          },
          {
            name: 'priority',
            type: 'string',
            required: true,
            defaultValue: 'high',
            description: 'Bug severity level',
            validation: {
              options: ['low', 'medium', 'high', 'urgent']
            }
          },
          {
            name: 'affected_components',
            type: 'string',
            required: false,
            description: 'Components or systems affected by the bug'
          }
        ],
        usage: {
          timesUsed: 156,
          lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.1,
          successRate: 0.94,
          averageCompletionTime: 7.2
        }
      },
      {
        name: 'Documentation Update Template',
        description: 'Comprehensive template for updating technical documentation',
        category: 'documentation',
        tags: ['documentation', 'technical-writing', 'knowledge-base'],
        template: {
          title: 'Update {{document_type}} Documentation',
          description: 'Update {{document_type}} documentation to reflect recent changes and improvements',
          type: 'documentation',
          priority: 'low',
          estimatedHours: 6,
          acceptanceCriteria: [
            'Documentation is accurate and up-to-date',
            'Examples are working and tested',
            'Screenshots are current',
            'Links are valid and functional',
            'Content is reviewed for clarity and completeness'
          ],
          subtasks: [
            {
              title: 'Review Current {{document_type}} Documentation',
              description: 'Identify outdated sections and missing information',
              type: 'research',
              priority: 'medium',
              estimatedHours: 2
            },
            {
              title: 'Update {{document_type}} Content',
              description: 'Revise content, add new sections, update examples',
              type: 'documentation',
              priority: 'medium',
              estimatedHours: 3
            },
            {
              title: 'Review and Validate {{document_type}} Documentation',
              description: 'Peer review and validation of updated content',
              type: 'documentation',
              priority: 'low',
              estimatedHours: 1
            }
          ],
          dependencies: [],
          metadata: {
            complexity: 'low',
            audience: 'developers',
            format: 'markdown'
          }
        },
        variables: [
          {
            name: 'document_type',
            type: 'string',
            required: true,
            description: 'Type of documentation to update (API, User Guide, etc.)'
          },
          {
            name: 'urgency',
            type: 'string',
            required: false,
            defaultValue: 'normal',
            description: 'How urgently the documentation needs to be updated',
            validation: {
              options: ['normal', 'high', 'critical']
            }
          }
        ],
        usage: {
          timesUsed: 73,
          lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 3.8,
          successRate: 0.97,
          averageCompletionTime: 5.8
        }
      },
      {
        name: 'Research Task Template',
        description: 'Structured approach to technical research and analysis',
        category: 'research',
        tags: ['research', 'analysis', 'investigation', 'proof-of-concept'],
        template: {
          title: 'Research {{topic}}',
          description: 'Conduct comprehensive research on {{topic}} to inform future development decisions',
          type: 'research',
          priority: 'medium',
          estimatedHours: 16,
          acceptanceCriteria: [
            'Research objectives are clearly defined',
            'Multiple approaches/solutions are evaluated',
            'Findings are documented with evidence',
            'Recommendations are actionable',
            'Results are presented to stakeholders'
          ],
          subtasks: [
            {
              title: 'Define Research Scope for {{topic}}',
              description: 'Clarify objectives, constraints, and success criteria',
              type: 'research',
              priority: 'high',
              estimatedHours: 2
            },
            {
              title: 'Investigate {{topic}} Solutions',
              description: 'Research existing solutions, frameworks, and approaches',
              type: 'research',
              priority: 'high',
              estimatedHours: 8
            },
            {
              title: 'Prototype {{topic}} Approach',
              description: 'Create proof-of-concept implementations',
              type: 'research',
              priority: 'medium',
              estimatedHours: 4
            },
            {
              title: 'Document {{topic}} Research Findings',
              description: 'Compile findings, recommendations, and next steps',
              type: 'documentation',
              priority: 'medium',
              estimatedHours: 2
            }
          ],
          dependencies: [
            {
              type: 'external',
              description: 'Access to relevant documentation and resources'
            }
          ],
          metadata: {
            complexity: 'high',
            outcome: 'recommendations',
            timeframe: 'flexible'
          }
        },
        variables: [
          {
            name: 'topic',
            type: 'string',
            required: true,
            description: 'Research topic or area of investigation'
          },
          {
            name: 'deadline',
            type: 'date',
            required: false,
            description: 'Target completion date for research'
          },
          {
            name: 'scope',
            type: 'string',
            required: false,
            defaultValue: 'comprehensive',
            description: 'Research scope level',
            validation: {
              options: ['focused', 'comprehensive', 'exploratory']
            }
          }
        ],
        usage: {
          timesUsed: 29,
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.2,
          successRate: 0.83,
          averageCompletionTime: 18.3
        }
      },
      {
        name: 'System Maintenance Template',
        description: 'Routine maintenance tasks for system health and performance',
        category: 'maintenance',
        tags: ['maintenance', 'system-health', 'performance', 'cleanup'],
        template: {
          title: 'Perform {{maintenance_type}} Maintenance',
          description: 'Execute {{maintenance_type}} maintenance tasks to ensure system reliability and performance',
          type: 'maintenance',
          priority: 'low',
          estimatedHours: 4,
          acceptanceCriteria: [
            'Maintenance tasks are completed successfully',
            'System performance is verified',
            'Cleanup activities are performed',
            'Monitoring confirms system health',
            'Documentation is updated'
          ],
          subtasks: [
            {
              title: 'Prepare for {{maintenance_type}} Maintenance',
              description: 'Review maintenance checklist and prepare environment',
              type: 'maintenance',
              priority: 'medium',
              estimatedHours: 1
            },
            {
              title: 'Execute {{maintenance_type}} Tasks',
              description: 'Perform the actual maintenance activities',
              type: 'maintenance',
              priority: 'medium',
              estimatedHours: 2
            },
            {
              title: 'Verify {{maintenance_type}} Results',
              description: 'Confirm maintenance was successful and system is healthy',
              type: 'maintenance',
              priority: 'high',
              estimatedHours: 1
            }
          ],
          dependencies: [
            {
              type: 'external',
              description: 'Maintenance window approval'
            }
          ],
          metadata: {
            complexity: 'low',
            impact: 'low',
            frequency: 'periodic'
          }
        },
        variables: [
          {
            name: 'maintenance_type',
            type: 'string',
            required: true,
            description: 'Type of maintenance to perform (database, server, etc.)'
          },
          {
            name: 'maintenance_window',
            type: 'date',
            required: false,
            description: 'Scheduled maintenance window'
          },
          {
            name: 'impact_level',
            type: 'string',
            required: false,
            defaultValue: 'low',
            description: 'Expected impact on system availability',
            validation: {
              options: ['none', 'low', 'medium', 'high']
            }
          }
        ],
        usage: {
          timesUsed: 134,
          lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.0,
          successRate: 0.98,
          averageCompletionTime: 3.7
        }
      }
    ];

    // Create templates with proper audit trails
    mockTemplates.forEach((templateData, index) => {
      const templateId = uuidv4();
      const now = new Date();
      const createdAt = new Date(now.getTime() - (index * 7 * 24 * 60 * 60 * 1000));
      const updatedAt = new Date(createdAt.getTime() + (Math.random() * 48 * 60 * 60 * 1000));
      
      const template: TaskTemplate = {
        id: templateId,
        ...templateData,
        audit: {
          createdBy: this.users.get(Array.from(this.users.keys())[0])?.id || 'system',
          createdAt: createdAt.toISOString(),
          updatedBy: this.users.get(Array.from(this.users.keys())[0])?.id || 'system',
          updatedAt: updatedAt.toISOString(),
          version: Math.floor(Math.random() * 3) + 1
        }
      };

      this.templates.set(templateId, template);
    });
  }

  // Template CRUD operations
  async getTemplates(query: any): Promise<TaskTemplateListResponse> {
    let filteredTemplates = Array.from(this.templates.values());

    // Apply filters
    if (query.category) {
      filteredTemplates = filteredTemplates.filter(template => template.category === query.category);
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template => 
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (query.tags) {
      const searchTags = query.tags.split(',').map((tag: string) => tag.trim().toLowerCase());
      filteredTemplates = filteredTemplates.filter(template => 
        searchTags.some(searchTag => 
          template.tags.some(templateTag => templateTag.toLowerCase().includes(searchTag))
        )
      );
    }

    // Sort templates
    filteredTemplates.sort((a, b) => {
      let aValue, bValue;
      
      switch (query.sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'usage':
          aValue = a.usage.timesUsed;
          bValue = b.usage.timesUsed;
          break;
        case 'createdAt':
          aValue = a.audit.createdAt;
          bValue = b.audit.createdAt;
          break;
        case 'updatedAt':
        default:
          aValue = a.audit.updatedAt;
          bValue = b.audit.updatedAt;
          break;
      }

      if (query.sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

    // Calculate facets
    const allTemplates = Array.from(this.templates.values());
    const categories = allTemplates.reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tags = allTemplates.reduce((acc, template) => {
      template.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      templates: paginatedTemplates,
      pagination: {
        page,
        limit,
        total: filteredTemplates.length,
        totalPages: Math.ceil(filteredTemplates.length / limit),
        hasNext: endIndex < filteredTemplates.length,
        hasPrevious: page > 1
      },
      facets: {
        categories: Object.entries(categories).map(([value, count]) => ({ value, count })),
        tags: Object.entries(tags).map(([value, count]) => ({ value, count }))
      }
    };
  }

  async createTemplate(request: CreateTaskTemplateRequest, userId: string): Promise<TaskTemplate> {
    const templateId = uuidv4();
    const now = new Date();
    
    const template: TaskTemplate = {
      id: templateId,
      name: request.name,
      description: request.description,
      category: request.category,
      tags: request.tags || [],
      template: request.template,
      variables: request.variables || [],
      usage: {
        timesUsed: 0,
        lastUsed: undefined,
        averageRating: undefined,
        successRate: undefined,
        averageCompletionTime: undefined
      },
      audit: {
        createdBy: userId,
        createdAt: now.toISOString(),
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: 1
      }
    };

    this.templates.set(templateId, template);
    return template;
  }

  async getTemplate(id: string, options?: { includeUsage?: boolean; includeHistory?: boolean }): Promise<TaskTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    // Could potentially filter or enhance based on options
    return template;
  }

  async updateTemplate(id: string, updates: UpdateTaskTemplateRequest, userId: string): Promise<TaskTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    // Version conflict check
    if (updates.version && updates.version !== template.audit.version) {
      throw new Error('Version conflict - template has been modified');
    }

    const now = new Date();
    const updatedTemplate: TaskTemplate = {
      ...template,
      ...updates,
      audit: {
        ...template.audit,
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: template.audit.version + 1
      }
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template) return false;

    // Check if template is in use (simplified check)
    const templatesInUse = Array.from(this.tasks.values()).filter(task => 
      task.metadata?.templateId === id
    );

    if (templatesInUse.length > 0) {
      throw new Error('Template is in use and cannot be deleted');
    }

    this.templates.delete(id);
    return true;
  }

  async applyTemplate(templateId: string, request: ApplyTaskTemplateRequest, userId: string): Promise<ApplyTaskTemplateResponse> {
    const template = this.templates.get(templateId);
    if (!template) return null;

    const now = new Date();
    const createdTasks: Task[] = [];
    const createdDependencies: TaskDependencyEntry[] = [];

    // Apply variable substitution
    const applyVariables = (text: string, variables: Record<string, any>): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    };

    const variables = request.variables || {};
    
    // Create main task
    const mainTaskRequest: CreateTaskRequest = {
      title: applyVariables(template.template.title, variables),
      description: applyVariables(template.template.description, variables),
      type: template.template.type,
      priority: request.options?.overrides?.priority || template.template.priority,
      estimatedHours: template.template.estimatedHours,
      tags: [...(template.template.metadata?.tags || []), ...(request.options?.overrides?.tags || [])],
      metadata: {
        ...template.template.metadata,
        templateId,
        templateVersion: template.audit.version,
        appliedAt: now.toISOString(),
        variables
      },
      assigneeId: request.assigneeId,
      projectId: request.projectId,
      parentId: request.parentTaskId,
      dueDate: request.options?.overrides?.dueDate
    };

    const mainTask = await this.createTask(mainTaskRequest, userId);
    createdTasks.push(mainTask);

    // Create subtasks if requested
    if (request.options?.createSubtasks !== false && template.template.subtasks) {
      for (const subtaskTemplate of template.template.subtasks) {
        const subtaskRequest: CreateTaskRequest = {
          title: applyVariables(subtaskTemplate.title, variables),
          description: applyVariables(subtaskTemplate.description, variables),
          type: subtaskTemplate.type,
          priority: subtaskTemplate.priority,
          estimatedHours: subtaskTemplate.estimatedHours,
          tags: [...(template.tags || []), 'subtask'],
          metadata: {
            templateId,
            templateVersion: template.audit.version,
            parentTemplateTask: mainTask.id,
            isSubtask: true
          },
          assigneeId: request.assigneeId,
          projectId: request.projectId,
          parentId: mainTask.id
        };

        const subtask = await this.createTask(subtaskRequest, userId);
        createdTasks.push(subtask);
      }
    }

    // Create dependencies if requested
    if (request.options?.createDependencies !== false && template.template.dependencies) {
      for (const depTemplate of template.template.dependencies) {
        if (depTemplate.type === 'external') {
          // For external dependencies, we might create a placeholder task or just log
          continue;
        }

        // For internal dependencies, create actual dependency entries
        const dependency: TaskDependencyEntry = {
          id: uuidv4(),
          type: depTemplate.type as any,
          sourceTaskId: mainTask.id,
          targetTaskId: mainTask.id, // Simplified - would need more complex logic
          createdAt: now.toISOString(),
          createdBy: userId
        };

        this.dependencies.set(dependency.id, dependency);
        createdDependencies.push(dependency);
      }
    }

    // Update template usage statistics
    template.usage.timesUsed++;
    template.usage.lastUsed = now.toISOString();

    const totalHours = createdTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

    return {
      createdTasks,
      createdDependencies,
      summary: {
        totalTasks: createdTasks.length,
        totalDependencies: createdDependencies.length,
        estimatedTotalHours: totalHours,
        variables
      },
      metadata: {
        appliedAt: now.toISOString(),
        templateId,
        templateVersion: template.audit.version
      }
    };
  }

  // Utility methods
  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getUser(id: string): User | null {
    return this.users.get(id) || null;
  }

  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  getTemplates(): TaskTemplate[] {
    return Array.from(this.templates.values());
  }

  // Risk Assessment Methods
  async getTaskRisks(taskId: string, filters: {
    status?: string;
    severity?: string;
    type?: string;
    includeHistory?: boolean;
  } = {}): Promise<TaskRisksResponse> {
    let taskRisks = this.risks.get(taskId) || [];

    // Generate mock risks if none exist
    if (taskRisks.length === 0) {
      taskRisks = this.generateMockRisks(taskId);
      this.risks.set(taskId, taskRisks);
    }

    // Apply filters
    let filteredRisks = taskRisks;
    if (filters.status) {
      filteredRisks = filteredRisks.filter(risk => risk.status === filters.status);
    }
    if (filters.severity) {
      filteredRisks = filteredRisks.filter(risk => risk.severity === filters.severity);
    }
    if (filters.type) {
      filteredRisks = filteredRisks.filter(risk => risk.type === filters.type);
    }

    // Calculate summary statistics
    const risksByType = {
      technical: filteredRisks.filter(r => r.type === 'technical').length,
      resource: filteredRisks.filter(r => r.type === 'resource').length,
      timeline: filteredRisks.filter(r => r.type === 'timeline').length,
      dependency: filteredRisks.filter(r => r.type === 'dependency').length,
      quality: filteredRisks.filter(r => r.type === 'quality').length,
      scope: filteredRisks.filter(r => r.type === 'scope').length,
      external: filteredRisks.filter(r => r.type === 'external').length
    };

    const risksBySeverity = {
      low: filteredRisks.filter(r => r.severity === 'low').length,
      medium: filteredRisks.filter(r => r.severity === 'medium').length,
      high: filteredRisks.filter(r => r.severity === 'high').length,
      critical: filteredRisks.filter(r => r.severity === 'critical').length
    };

    // Calculate overall risk score (0-100)
    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeightedRisk = filteredRisks.reduce((sum, risk) => 
      sum + (severityWeights[risk.severity] * risk.probability), 0);
    const maxPossibleRisk = filteredRisks.length * 4; // Max weight * max probability (1.0)
    const overallRiskScore = maxPossibleRisk > 0 ? Math.round((totalWeightedRisk / maxPossibleRisk) * 100) : 0;

    return {
      taskId,
      risks: filteredRisks,
      summary: {
        totalRisks: filteredRisks.length,
        risksByType,
        risksBySeverity,
        overallRiskScore
      }
    };
  }

  async addTaskRisk(taskId: string, request: AddTaskRiskRequest, userId: string): Promise<TaskRisk> {
    const now = new Date();
    const riskId = uuidv4();
    const users = Array.from(this.users.values());

    const risk: TaskRisk = {
      id: riskId,
      type: request.type,
      severity: request.severity,
      probability: request.probability,
      impact: request.impact,
      title: request.title,
      description: request.description,
      mitigation: request.mitigation || {
        strategy: 'mitigate',
        actions: [
          {
            action: 'Monitor and assess regularly',
            status: 'pending',
            notes: 'Default monitoring action'
          }
        ]
      },
      status: 'open',
      owner: request.ownerId ? {
        id: request.ownerId,
        name: this.users.get(request.ownerId)?.name || 'Unknown User',
        email: this.users.get(request.ownerId)?.email || 'unknown@example.com'
      } : undefined,
      history: [
        {
          timestamp: now.toISOString(),
          action: 'created',
          userId: userId,
          comment: 'Risk assessment created'
        }
      ],
      audit: {
        createdBy: userId,
        createdAt: now.toISOString(),
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: 1
      }
    };

    const taskRisks = this.risks.get(taskId) || [];
    taskRisks.push(risk);
    this.risks.set(taskId, taskRisks);

    return risk;
  }

  async updateTaskRisk(taskId: string, riskId: string, request: UpdateTaskRiskRequest, userId: string): Promise<TaskRisk | null> {
    const taskRisks = this.risks.get(taskId) || [];
    const riskIndex = taskRisks.findIndex(r => r.id === riskId);
    
    if (riskIndex === -1) {
      return null;
    }

    const existingRisk = taskRisks[riskIndex];
    const now = new Date();
    
    // Track changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    Object.entries(request).forEach(([field, newValue]) => {
      if (field === 'version') return; // Skip version field
      
      const currentValue = (existingRisk as any)[field];
      if (currentValue !== newValue) {
        changes.push({ field, oldValue: currentValue, newValue });
      }
    });

    const updatedRisk: TaskRisk = {
      ...existingRisk,
      ...request,
      owner: request.ownerId ? {
        id: request.ownerId,
        name: this.users.get(request.ownerId)?.name || 'Unknown User',
        email: this.users.get(request.ownerId)?.email || 'unknown@example.com'
      } : existingRisk.owner,
      history: [
        ...existingRisk.history,
        {
          timestamp: now.toISOString(),
          action: 'updated',
          userId: userId,
          comment: `Updated: ${changes.map(c => c.field).join(', ')}`
        }
      ],
      audit: {
        ...existingRisk.audit,
        updatedBy: userId,
        updatedAt: now.toISOString(),
        version: existingRisk.audit.version + 1
      }
    };

    taskRisks[riskIndex] = updatedRisk;
    this.risks.set(taskId, taskRisks);

    return updatedRisk;
  }

  async deleteTaskRisk(taskId: string, riskId: string, userId: string, reason?: string): Promise<boolean> {
    const taskRisks = this.risks.get(taskId) || [];
    const riskIndex = taskRisks.findIndex(r => r.id === riskId);
    
    if (riskIndex === -1) {
      return false;
    }

    taskRisks.splice(riskIndex, 1);
    this.risks.set(taskId, taskRisks);

    return true;
  }

  private generateMockRisks(taskId: string): TaskRisk[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];

    const users = Array.from(this.users.values());
    const risks: TaskRisk[] = [];
    const now = new Date();

    // Generate 2-4 realistic risks based on task characteristics
    const riskCount = Math.floor(Math.random() * 3) + 2;
    
    const riskTemplates = [
      {
        type: 'technical' as const,
        title: 'Implementation complexity risk',
        description: 'The technical implementation may be more complex than initially estimated due to unforeseen integration challenges.',
        severity: 'medium' as const,
        probability: 0.6,
        impact: 'medium' as const,
        mitigation: {
          strategy: 'mitigate' as const,
          actions: [
            {
              action: 'Conduct detailed technical spike to identify complexity factors',
              status: 'pending' as const,
              notes: 'Allocate 8 hours for technical investigation'
            },
            {
              action: 'Consult with senior architects for guidance',
              status: 'pending' as const
            }
          ]
        }
      },
      {
        type: 'resource' as const,
        title: 'Key team member availability',
        description: 'Critical team members may not be available during peak development periods due to other project commitments.',
        severity: 'high' as const,
        probability: 0.4,
        impact: 'high' as const,
        mitigation: {
          strategy: 'mitigate' as const,
          actions: [
            {
              action: 'Secure commitment from key team members',
              status: 'pending' as const
            },
            {
              action: 'Identify backup resources with similar skill sets',
              status: 'pending' as const
            }
          ]
        }
      },
      {
        type: 'timeline' as const,
        title: 'Scope creep risk',
        description: 'Requirements may expand beyond original scope, impacting delivery timeline.',
        severity: 'medium' as const,
        probability: 0.5,
        impact: 'medium' as const,
        mitigation: {
          strategy: 'avoid' as const,
          actions: [
            {
              action: 'Establish clear scope boundaries with stakeholders',
              status: 'pending' as const
            },
            {
              action: 'Implement change control process',
              status: 'pending' as const
            }
          ]
        }
      },
      {
        type: 'dependency' as const,
        title: 'External API dependency',
        description: 'Third-party service dependencies may introduce delays or integration issues.',
        severity: 'medium' as const,
        probability: 0.3,
        impact: 'high' as const,
        mitigation: {
          strategy: 'mitigate' as const,
          actions: [
            {
              action: 'Validate API availability and performance early',
              status: 'pending' as const
            },
            {
              action: 'Implement fallback mechanisms for service failures',
              status: 'pending' as const
            }
          ]
        }
      },
      {
        type: 'quality' as const,
        title: 'Testing coverage gaps',
        description: 'Insufficient testing coverage may lead to quality issues in production.',
        severity: 'low' as const,
        probability: 0.4,
        impact: 'medium' as const,
        mitigation: {
          strategy: 'mitigate' as const,
          actions: [
            {
              action: 'Implement comprehensive test strategy',
              status: 'pending' as const
            },
            {
              action: 'Set up automated testing pipeline',
              status: 'pending' as const
            }
          ]
        }
      }
    ];

    // Select random risks based on task characteristics
    const selectedRisks = riskTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, riskCount);

    selectedRisks.forEach(template => {
      const risk: TaskRisk = {
        id: uuidv4(),
        type: template.type,
        severity: template.severity,
        probability: template.probability,
        impact: template.impact,
        title: template.title,
        description: template.description,
        mitigation: template.mitigation,
        status: 'open',
        owner: Math.random() > 0.5 ? {
          id: users[Math.floor(Math.random() * users.length)].id,
          name: users[Math.floor(Math.random() * users.length)].name,
          email: users[Math.floor(Math.random() * users.length)].email
        } : undefined,
        history: [
          {
            timestamp: now.toISOString(),
            action: 'created',
            userId: users[0].id,
            comment: 'Risk identified during automated analysis'
          }
        ],
        audit: {
          createdBy: users[0].id,
          createdAt: now.toISOString(),
          updatedBy: users[0].id,
          updatedAt: now.toISOString(),
          version: 1
        }
      };

      risks.push(risk);
    });

    return risks;
  }

  // ===========================================
  // AI ANALYSIS SERVICE METHODS
  // ===========================================

  /**
   * Generates comprehensive AI analysis for a task with realistic complexity,
   * risk assessment, skill requirements, and actionable insights
   */
  async analyzeTask(request: TaskAnalysisRequest): Promise<TaskAnalysisResponse> {
    const analysisId = uuidv4();
    const now = new Date();
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${request.taskId || 'new'}-${JSON.stringify(request).slice(0, 50)}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // Generate realistic complexity analysis
    const complexity = this.generateComplexityAnalysis(request);
    
    // Generate comprehensive risk factors
    const risks = this.generateRiskFactors(request, complexity);
    
    // Generate skill requirements
    const skillRequirements = this.generateSkillRequirements(request, complexity);
    
    // Generate estimation if requested
    const estimate = request.options?.includeEstimate 
      ? this.generateEstimateData(request, complexity)
      : undefined;
    
    // Generate task breakdown if requested
    const breakdown = request.options?.includeBreakdown 
      ? this.generateTaskBreakdown(request, complexity)
      : undefined;
    
    // Generate insights and recommendations
    const insights = this.generateInsights(request, complexity, risks);
    
    const processingTime = Date.now() - startTime;
    const confidence = this.calculateAnalysisConfidence(request, complexity, risks);

    const analysis: TaskAnalysisResponse = {
      taskId: request.taskId,
      analysis: {
        complexity,
        risks,
        estimate,
        breakdown,
        insights
      },
      metadata: {
        analyzedAt: now.toISOString(),
        version: '2.1.0',
        confidence,
        processingTime
      }
    };

    // Cache the result
    this.analysisCache.set(cacheKey, analysis);
    
    logger.info(`Generated AI analysis for task: ${request.title} (confidence: ${confidence})`);
    return analysis;
  }

  async getTaskAnalysis(taskId: string): Promise<TaskAnalysisResponse | null> {
    // Check if we have a cached analysis
    const cachedAnalysis = Array.from(this.analysisCache.values())
      .find(analysis => analysis.taskId === taskId);
    
    if (cachedAnalysis) {
      return cachedAnalysis;
    }
    
    // Generate analysis for existing task
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }
    
    const analysisRequest: TaskAnalysisRequest = {
      taskId,
      title: task.title,
      description: task.description,
      type: task.type as any,
      context: {
        projectId: task.project?.id,
        teamSize: 3, // Default team size
        techStack: task.tags.filter(tag => ['javascript', 'typescript', 'react', 'nodejs', 'python'].includes(tag))
      },
      options: {
        includeBreakdown: true,
        includeRisks: true,
        includeEstimate: true,
        analyzeComplexity: true
      }
    };
    
    return this.analyzeTask(analysisRequest);
  }

  /**
   * Generates task estimation with multiple methodologies and historical data
   */
  async estimateTask(request: TaskEstimationRequest): Promise<TaskEstimationResponse> {
    const now = new Date();
    const startTime = Date.now();
    const task = request.tasks[0]; // For simplicity, handle first task
    
    if (!task) {
      throw new Error('No task provided for estimation');
    }

    const cacheKey = `estimate-${task.id || 'new'}-${JSON.stringify(task).slice(0, 50)}`;
    if (this.estimationCache.has(cacheKey)) {
      return this.estimationCache.get(cacheKey)!;
    }

    // Determine estimation methodology
    const methodology = this.selectEstimationMethodology(request, task);
    
    // Generate base estimate
    const baseHours = this.calculateBaseEstimate(task, request.context);
    
    // Apply complexity and context factors
    const factors = this.generateEstimationFactors(task, request.context);
    const adjustedHours = factors.reduce((hours, factor) => hours * factor.multiplier, baseHours);
    
    // Generate confidence and range
    const confidence = this.calculateEstimationConfidence(task, request.context, methodology);
    const range = this.calculateEstimationRange(adjustedHours, confidence);
    
    // Generate breakdown
    const breakdown = this.generateEstimationBreakdown(adjustedHours, task.type, request.options?.includeBuffer);
    
    // Generate historical comparisons
    const comparisons = this.generateHistoricalComparisons(task);
    
    const storyPoints = Math.round(adjustedHours / 8 * 3); // Rough conversion
    
    const processingTime = Date.now() - startTime;

    const estimation: TaskEstimationResponse = {
      taskId: task.id,
      estimate: {
        hours: Math.round(adjustedHours * 10) / 10,
        storyPoints,
        confidence,
        range,
        breakdown,
        factors,
        comparisons
      },
      metadata: {
        estimatedAt: now.toISOString(),
        version: '2.1.0',
        method: methodology.method,
        confidence
      }
    };

    this.estimationCache.set(cacheKey, estimation);
    
    logger.info(`Generated estimation for task: ${task.title} (${adjustedHours}h, confidence: ${confidence})`);
    return estimation;
  }

  async getTaskEstimate(taskId: string): Promise<TaskEstimationResponse | null> {
    // Check cache first
    const cachedEstimate = Array.from(this.estimationCache.values())
      .find(estimate => estimate.taskId === taskId);
    
    if (cachedEstimate) {
      return cachedEstimate;
    }
    
    // Generate estimate for existing task
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }
    
    const estimationRequest: TaskEstimationRequest = {
      tasks: [{
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type as any,
        complexity: task.metadata?.complexity as any
      }],
      context: {
        teamExperience: 'intermediate',
        projectType: 'brownfield',
        techStack: task.tags.filter(tag => ['javascript', 'typescript', 'react', 'nodejs', 'python'].includes(tag))
      },
      options: {
        unit: 'hours',
        includeBuffer: true,
        includeBreakdown: true,
        confidenceLevel: 'medium'
      }
    };
    
    return this.estimateTask(estimationRequest);
  }

  async updateTaskEstimate(taskId: string, request: UpdateTaskEstimateRequest): Promise<TaskEstimationResponse> {
    const existingEstimate = await this.getTaskEstimate(taskId);
    if (!existingEstimate) {
      throw new Error(`No estimate found for task ${taskId}`);
    }
    
    // Version check
    if (request.version !== existingEstimate.metadata.confidence) {
      throw new Error('Version conflict - estimate has been modified');
    }
    
    const now = new Date();
    const updatedEstimate: TaskEstimationResponse = {
      ...existingEstimate,
      estimate: {
        ...existingEstimate.estimate,
        hours: request.hours ?? existingEstimate.estimate.hours,
        storyPoints: request.storyPoints ?? existingEstimate.estimate.storyPoints,
        confidence: request.confidence ?? existingEstimate.estimate.confidence
      },
      metadata: {
        ...existingEstimate.metadata,
        estimatedAt: now.toISOString(),
        confidence: request.confidence ?? existingEstimate.metadata.confidence
      }
    };
    
    // Update cache
    const cacheKey = `estimate-${taskId}`;
    this.estimationCache.set(cacheKey, updatedEstimate);
    
    // Update the task itself if hours changed
    if (request.hours) {
      await this.updateTask(taskId, { estimatedHours: request.hours }, 'system');
    }
    
    logger.info(`Updated estimate for task ${taskId}: ${request.hours}h (confidence: ${request.confidence})`);
    return updatedEstimate;
  }

  /**
   * Creates detailed task breakdown with subtasks and dependencies
   */
  async createTaskBreakdown(taskId: string, request: TaskBreakdownRequest): Promise<TaskBreakdownResponse> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const cacheKey = `breakdown-${taskId}-${JSON.stringify(request).slice(0, 30)}`;
    if (this.breakdownCache.has(cacheKey)) {
      return this.breakdownCache.get(cacheKey)!;
    }

    const now = new Date();
    
    // Generate subtasks based on task type and granularity
    const subtasks = this.generateSubtasks(task, request);
    
    // Generate dependencies between subtasks
    const dependencies = this.generateSubtaskDependencies(subtasks, request.includeDependencies);
    
    // Calculate summary metrics
    const totalEstimatedHours = subtasks.reduce((sum, subtask) => sum + subtask.estimatedHours, 0);
    const totalStoryPoints = subtasks.reduce((sum, subtask) => sum + subtask.storyPoints, 0);
    const criticalPath = this.calculateCriticalPath(subtasks, dependencies);
    const estimatedDuration = this.calculateEstimatedDuration(criticalPath, subtasks, request.context);
    
    const confidence = this.calculateBreakdownConfidence(task, request, subtasks);

    const breakdown: TaskBreakdownResponse = {
      taskId,
      breakdown: {
        subtasks,
        dependencies,
        summary: {
          totalSubtasks: subtasks.length,
          totalEstimatedHours,
          totalStoryPoints,
          criticalPath,
          estimatedDuration
        }
      },
      metadata: {
        createdAt: now.toISOString(),
        version: '2.1.0',
        confidence,
        methodology: request.context?.methodology || 'agile'
      }
    };

    this.breakdownCache.set(cacheKey, breakdown);
    
    logger.info(`Generated breakdown for task ${taskId}: ${subtasks.length} subtasks, ${totalEstimatedHours}h total`);
    return breakdown;
  }

  async getTaskBreakdown(taskId: string): Promise<TaskBreakdownResponse | null> {
    // Check cache first
    const cachedBreakdown = Array.from(this.breakdownCache.values())
      .find(breakdown => breakdown.taskId === taskId);
    
    if (cachedBreakdown) {
      return cachedBreakdown;
    }
    
    // Generate breakdown for existing task
    const defaultRequest: TaskBreakdownRequest = {
      granularity: 'medium',
      includeEstimates: true,
      includeDependencies: true,
      maxSubtasks: 6,
      context: {
        methodology: 'agile',
        sprintDuration: 14,
        teamVelocity: 1.0
      }
    };
    
    return this.createTaskBreakdown(taskId, defaultRequest);
  }

  /**
   * Analyzes project dependencies for bottlenecks and risks
   */
  async analyzeDependencies(projectId?: string, taskIds?: string[]): Promise<DependencyAnalysisResponse> {
    const now = new Date();
    const cacheKey = `deps-${projectId || 'all'}-${taskIds?.join(',') || 'all'}`;
    
    if (this.dependencyAnalysisCache.has(cacheKey)) {
      return this.dependencyAnalysisCache.get(cacheKey)!;
    }

    // Get relevant tasks
    let tasksToAnalyze = Array.from(this.tasks.values());
    if (projectId) {
      tasksToAnalyze = tasksToAnalyze.filter(task => task.project?.id === projectId);
    }
    if (taskIds) {
      tasksToAnalyze = tasksToAnalyze.filter(task => taskIds.includes(task.id));
    }

    // Get all dependencies
    const allDependencies = Array.from(this.dependencies.values());
    const relevantDeps = allDependencies.filter(dep => 
      tasksToAnalyze.some(task => task.id === dep.sourceTaskId || task.id === dep.targetTaskId)
    );

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies(tasksToAnalyze, relevantDeps);
    
    // Find critical path
    const criticalPath = this.findCriticalPath(tasksToAnalyze, relevantDeps);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(tasksToAnalyze, relevantDeps);
    
    // Assess risks
    const risks = this.assessDependencyRisks(tasksToAnalyze, relevantDeps, circularDependencies, bottlenecks);
    
    // Generate recommendations
    const recommendations = this.generateDependencyRecommendations(circularDependencies, bottlenecks, risks);
    
    const confidence = this.calculateDependencyAnalysisConfidence(tasksToAnalyze, relevantDeps);

    const analysis: DependencyAnalysisResponse = {
      analysis: {
        totalDependencies: relevantDeps.length,
        circularDependencies,
        criticalPath,
        bottlenecks,
        risks
      },
      recommendations,
      metadata: {
        analyzedAt: now.toISOString(),
        version: '2.1.0',
        confidence
      }
    };

    this.dependencyAnalysisCache.set(cacheKey, analysis);
    
    logger.info(`Analyzed dependencies: ${relevantDeps.length} deps, ${circularDependencies.length} cycles, ${bottlenecks.length} bottlenecks`);
    return analysis;
  }

  /**
   * Validates dependency configurations for conflicts and issues
   */
  async validateDependencies(request: DependencyValidationRequest): Promise<DependencyValidationResponse> {
    const now = new Date();
    
    // Validate for circular dependencies
    const cycleCheck = this.validateDependencyCycles(request.dependencies);
    
    // Validate resource capacity (simplified)
    const capacityCheck = this.validateResourceCapacity(request.dependencies, request.context);
    
    // Validate timing constraints
    const timingCheck = this.validateTimingConstraints(request.dependencies, request.context);
    
    const isValid = cycleCheck.passed && capacityCheck.passed && timingCheck.passed;
    
    // Generate suggestions for fixes
    const suggestions = this.generateValidationSuggestions(cycleCheck, capacityCheck, timingCheck);

    return {
      isValid,
      validation: {
        cycleCheck,
        capacityCheck,
        timingCheck
      },
      suggestions,
      metadata: {
        validatedAt: now.toISOString(),
        version: '2.1.0'
      }
    };
  }

  /**
   * Processes batch estimation requests efficiently
   */
  async createBatchEstimates(request: BatchEstimationRequest): Promise<BatchEstimationResponse> {
    const now = new Date();
    const startTime = Date.now();
    
    const estimates: BatchEstimationResponse['estimates'] = [];
    let totalHours = 0;
    let totalStoryPoints = 0;
    let successfulEstimates = 0;
    let failedEstimates = 0;
    let totalConfidence = 0;

    for (const taskId of request.taskIds) {
      try {
        const task = this.tasks.get(taskId);
        if (!task) {
          estimates.push({
            taskId,
            estimate: {} as TaskEstimationResponse,
            status: 'failed',
            error: 'Task not found'
          });
          failedEstimates++;
          continue;
        }

        // Create estimation request for this task
        const estimationRequest: TaskEstimationRequest = {
          tasks: [{
            id: task.id,
            title: task.title,
            description: task.description,
            type: task.type as any,
            complexity: task.metadata?.complexity as any
          }],
          context: request.context,
          options: request.options
        };

        const estimate = await this.estimateTask(estimationRequest);
        
        estimates.push({
          taskId,
          estimate,
          status: 'success'
        });
        
        totalHours += estimate.estimate.hours;
        totalStoryPoints += estimate.estimate.storyPoints;
        totalConfidence += estimate.estimate.confidence;
        successfulEstimates++;
        
      } catch (error) {
        estimates.push({
          taskId,
          estimate: {} as TaskEstimationResponse,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failedEstimates++;
      }
    }

    const processingTime = Date.now() - startTime;
    const averageConfidence = successfulEstimates > 0 ? totalConfidence / successfulEstimates : 0;

    return {
      estimates,
      summary: {
        totalTasks: request.taskIds.length,
        successfulEstimates,
        failedEstimates,
        totalHours: Math.round(totalHours * 10) / 10,
        totalStoryPoints,
        averageConfidence: Math.round(averageConfidence * 100) / 100
      },
      metadata: {
        estimatedAt: now.toISOString(),
        processingTime
      }
    };
  }

  async getBatchEstimates(taskIds: string[]): Promise<BatchEstimationResponse> {
    const batchRequest: BatchEstimationRequest = {
      taskIds,
      context: {
        teamExperience: 'intermediate',
        projectType: 'brownfield',
        methodology: 'agile'
      },
      options: {
        unit: 'hours',
        includeBuffer: true,
        includeBreakdown: false
      }
    };
    
    return this.createBatchEstimates(batchRequest);
  }

  // ===========================================
  // PRIVATE HELPER METHODS FOR AI ANALYSIS
  // ===========================================

  private generateComplexityAnalysis(request: TaskAnalysisRequest): ComplexityAnalysis {
    const factors: ComplexityAnalysis['factors'] = [];
    let baseScore = 2; // Start with baseline complexity

    // Analyze task type impact
    const typeComplexity = {
      'feature': 3,
      'bug': 2,
      'maintenance': 1,
      'research': 4,
      'documentation': 1
    };
    
    baseScore = typeComplexity[request.type] || 2;
    
    // Analyze description complexity
    const descriptionLength = request.description.length;
    if (descriptionLength > 500) {
      factors.push({
        factor: 'Detailed requirements',
        impact: 'high',
        description: 'Comprehensive description suggests complex requirements'
      });
      baseScore += 1.5;
    } else if (descriptionLength < 100) {
      factors.push({
        factor: 'Minimal requirements',
        impact: 'medium',
        description: 'Brief description may indicate unclear or missing requirements'
      });
      baseScore += 0.5;
    }

    // Analyze technical stack complexity
    if (request.context?.techStack) {
      const complexTech = ['microservices', 'kubernetes', 'machine-learning', 'blockchain'];
      const hasComplexTech = request.context.techStack.some(tech => 
        complexTech.some(complex => tech.toLowerCase().includes(complex))
      );
      
      if (hasComplexTech) {
        factors.push({
          factor: 'Advanced technology stack',
          impact: 'high',
          description: 'Use of complex technologies increases implementation difficulty'
        });
        baseScore += 1;
      }
    }

    // Analyze team size impact
    if (request.context?.teamSize) {
      if (request.context.teamSize > 8) {
        factors.push({
          factor: 'Large team coordination',
          impact: 'medium',
          description: 'Large teams require additional coordination overhead'
        });
        baseScore += 0.5;
      } else if (request.context.teamSize === 1) {
        factors.push({
          factor: 'Solo development',
          impact: 'medium',
          description: 'Single developer carries full responsibility for all aspects'
        });
        baseScore += 0.3;
      }
    }

    // Analyze constraints
    if (request.context?.constraints) {
      if (request.context.constraints.length > 3) {
        factors.push({
          factor: 'Multiple constraints',
          impact: 'high',
          description: 'Numerous constraints limit implementation options'
        });
        baseScore += 1;
      }
    }

    // Normalize score to 1-10 scale
    const finalScore = Math.min(Math.max(baseScore, 1), 10);
    
    let level: ComplexityAnalysis['level'];
    if (finalScore <= 2.5) level = 'low';
    else if (finalScore <= 5) level = 'medium';
    else if (finalScore <= 7.5) level = 'high';
    else level = 'very_high';

    return {
      score: Math.round(finalScore * 10) / 10,
      level,
      factors
    };
  }

  private generateRiskFactors(request: TaskAnalysisRequest, complexity: ComplexityAnalysis): RiskFactor[] {
    const risks: RiskFactor[] = [];
    
    // Generate risks based on complexity level
    if (complexity.level === 'high' || complexity.level === 'very_high') {
      risks.push({
        id: uuidv4(),
        type: 'technical',
        severity: complexity.level === 'very_high' ? 'high' : 'medium',
        probability: 0.7,
        description: 'High complexity may lead to implementation challenges and technical debt',
        mitigation: 'Break down into smaller, manageable components. Conduct technical spikes for unclear areas.',
        impact: 'Potential delays and increased maintenance costs'
      });
    }

    // Type-specific risks
    if (request.type === 'research') {
      risks.push({
        id: uuidv4(),
        type: 'timeline',
        severity: 'medium',
        probability: 0.6,
        description: 'Research tasks often uncover unexpected complexities or require additional investigation',
        mitigation: 'Set clear time-boxed milestones and define success criteria upfront',
        impact: 'Timeline extension and scope expansion'
      });
    }

    if (request.type === 'feature') {
      risks.push({
        id: uuidv4(),
        type: 'quality',
        severity: 'medium',
        probability: 0.4,
        description: 'New features may have unforeseen edge cases and integration issues',
        mitigation: 'Implement comprehensive testing strategy including integration and user acceptance tests',
        impact: 'Potential bugs and user experience issues'
      });
    }

    // Context-based risks
    if (request.context?.teamSize === 1) {
      risks.push({
        id: uuidv4(),
        type: 'resource',
        severity: 'high',
        probability: 0.8,
        description: 'Single point of failure - no backup resources available',
        mitigation: 'Document progress regularly and ensure knowledge sharing with team leads',
        impact: 'Complete work stoppage if resource becomes unavailable'
      });
    }

    if (request.context?.constraints && request.context.constraints.length > 2) {
      risks.push({
        id: uuidv4(),
        type: 'dependency',
        severity: 'medium',
        probability: 0.5,
        description: 'Multiple constraints may conflict or create implementation bottlenecks',
        mitigation: 'Prioritize constraints and identify potential conflicts early',
        impact: 'Reduced implementation options and potential rework'
      });
    }

    // Add a baseline timeline risk for all tasks
    risks.push({
      id: uuidv4(),
      type: 'timeline',
      severity: 'low',
      probability: 0.3,
      description: 'Standard project timeline risk due to unforeseen circumstances',
      mitigation: 'Build buffer time into estimates and maintain regular progress reviews',
      impact: 'Minor schedule adjustments may be needed'
    });

    return risks;
  }

  private generateSkillRequirements(request: TaskAnalysisRequest, complexity: ComplexityAnalysis): SkillRequirement[] {
    const skills: SkillRequirement[] = [];
    
    // Base skills by task type
    const typeSkills = {
      'feature': [
        { skill: 'Software Development', level: 'intermediate' as const, importance: 'high' as const },
        { skill: 'Testing', level: 'intermediate' as const, importance: 'medium' as const }
      ],
      'bug': [
        { skill: 'Debugging', level: 'advanced' as const, importance: 'critical' as const },
        { skill: 'System Analysis', level: 'intermediate' as const, importance: 'high' as const }
      ],
      'maintenance': [
        { skill: 'System Administration', level: 'intermediate' as const, importance: 'high' as const },
        { skill: 'Documentation', level: 'beginner' as const, importance: 'medium' as const }
      ],
      'research': [
        { skill: 'Research & Analysis', level: 'advanced' as const, importance: 'critical' as const },
        { skill: 'Technical Writing', level: 'intermediate' as const, importance: 'high' as const }
      ],
      'documentation': [
        { skill: 'Technical Writing', level: 'advanced' as const, importance: 'critical' as const },
        { skill: 'Information Architecture', level: 'intermediate' as const, importance: 'medium' as const }
      ]
    };
    
    skills.push(...typeSkills[request.type] || []);
    
    // Adjust skill levels based on complexity
    if (complexity.level === 'high' || complexity.level === 'very_high') {
      skills.forEach(skill => {
        if (skill.level === 'beginner') skill.level = 'intermediate';
        else if (skill.level === 'intermediate') skill.level = 'advanced';
        if (skill.importance === 'low') skill.importance = 'medium';
        else if (skill.importance === 'medium') skill.importance = 'high';
      });
      
      // Add architectural skills for complex tasks
      skills.push({
        skill: 'Software Architecture',
        level: 'advanced',
        importance: 'high'
      });
    }
    
    // Add technology-specific skills
    if (request.context?.techStack) {
      request.context.techStack.forEach(tech => {
        const techSkill = {
          skill: tech,
          level: complexity.level === 'high' || complexity.level === 'very_high' ? 'advanced' as const : 'intermediate' as const,
          importance: 'medium' as const
        };
        skills.push(techSkill);
      });
    }
    
    return skills;
  }

  private generateEstimateData(request: TaskAnalysisRequest, complexity: ComplexityAnalysis) {
    const baseHours = {
      'feature': 24,
      'bug': 8,
      'maintenance': 6,
      'research': 32,
      'documentation': 12
    }[request.type] || 16;
    
    const complexityMultiplier = {
      'low': 0.7,
      'medium': 1.0,
      'high': 1.5,
      'very_high': 2.0
    }[complexity.level];
    
    const totalHours = Math.round(baseHours * complexityMultiplier);
    const confidence = {
      'low': 0.9,
      'medium': 0.8,
      'high': 0.6,
      'very_high': 0.4
    }[complexity.level];
    
    return {
      hours: totalHours,
      storyPoints: Math.round(totalHours / 8 * 3),
      confidence,
      breakdown: {
        design: Math.round(totalHours * 0.15),
        implementation: Math.round(totalHours * 0.50),
        testing: Math.round(totalHours * 0.20),
        review: Math.round(totalHours * 0.10),
        deployment: Math.round(totalHours * 0.05)
      }
    };
  }

  private generateTaskBreakdown(request: TaskAnalysisRequest, complexity: ComplexityAnalysis) {
    const subtasks = [];
    const dependencies = [];
    
    // Generate basic subtasks based on type
    if (request.type === 'feature') {
      subtasks.push(
        {
          title: `Requirements Analysis for ${request.title}`,
          description: 'Define detailed requirements and acceptance criteria',
          type: 'research' as const,
          priority: 'high' as const,
          estimatedHours: 4,
          dependencies: []
        },
        {
          title: `Implementation of ${request.title}`,
          description: 'Core development work',
          type: 'feature' as const,
          priority: 'high' as const,
          estimatedHours: 16,
          dependencies: ['requirements']
        },
        {
          title: `Testing for ${request.title}`,
          description: 'Unit and integration testing',
          type: 'feature' as const,
          priority: 'medium' as const,
          estimatedHours: 8,
          dependencies: ['implementation']
        }
      );
    }
    
    return { subtasks, dependencies };
  }

  private generateInsights(request: TaskAnalysisRequest, complexity: ComplexityAnalysis, risks: RiskFactor[]) {
    const recommendations = [];
    const patterns = [];
    const concerns = [];
    const opportunities = [];
    
    // Generate context-aware recommendations
    if (complexity.level === 'high' || complexity.level === 'very_high') {
      recommendations.push('Consider breaking this task into smaller, more manageable components');
      recommendations.push('Allocate senior developer resources for complex implementation areas');
      recommendations.push('Schedule additional code review sessions to ensure quality');
    }
    
    if (request.type === 'research') {
      recommendations.push('Define clear success criteria and time boundaries for research phases');
      recommendations.push('Document findings incrementally to capture knowledge as it develops');
    }
    
    // Identify patterns
    if (risks.some(r => r.type === 'dependency')) {
      patterns.push('Task has multiple dependencies that may impact delivery timeline');
    }
    
    if (complexity.factors.some(f => f.factor.includes('team'))) {
      patterns.push('Team coordination requirements identified - may benefit from pair programming');
    }
    
    // Highlight concerns
    const highSeverityRisks = risks.filter(r => r.severity === 'high' || r.severity === 'critical');
    if (highSeverityRisks.length > 0) {
      concerns.push(`${highSeverityRisks.length} high-severity risk(s) identified requiring active mitigation`);
    }
    
    if (complexity.level === 'very_high') {
      concerns.push('Very high complexity detected - consider architectural review before implementation');
    }
    
    // Identify opportunities
    if (request.context?.teamSize && request.context.teamSize > 1) {
      opportunities.push('Multiple team members available - consider parallel development of independent components');
    }
    
    if (request.type === 'feature') {
      opportunities.push('New feature development - opportunity to improve code quality and add comprehensive testing');
    }
    
    return {
      recommendations,
      patterns,
      concerns,
      opportunities
    };
  }

  private calculateAnalysisConfidence(request: TaskAnalysisRequest, complexity: ComplexityAnalysis, risks: RiskFactor[]): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on description quality
    if (request.description.length > 200) confidence += 0.1;
    if (request.description.length < 50) confidence -= 0.2;
    
    // Adjust based on context availability
    if (request.context?.techStack) confidence += 0.05;
    if (request.context?.teamSize) confidence += 0.05;
    
    // Adjust based on complexity certainty
    if (complexity.level === 'very_high') confidence -= 0.1;
    if (complexity.factors.length > 5) confidence -= 0.05;
    
    // Adjust based on risk assessment quality
    if (risks.length > 0) confidence += 0.05;
    
    return Math.max(0.3, Math.min(0.95, Math.round(confidence * 100) / 100));
  }

  // Additional helper methods for estimation
  private selectEstimationMethodology(request: TaskEstimationRequest, task: any): EstimationMethodology {
    const taskCount = request.tasks.length;
    const hasHistoricalData = Math.random() > 0.3; // Simulate historical data availability
    
    let method: EstimationMethodology['method'];
    let dataPoints: number;
    let confidence: number;
    
    if (hasHistoricalData && taskCount === 1) {
      method = 'historical_comparison';
      dataPoints = Math.floor(Math.random() * 20) + 5;
      confidence = 0.8;
    } else if (task.complexity === 'high' || task.complexity === 'very_high') {
      method = 'hybrid';
      dataPoints = Math.floor(Math.random() * 15) + 3;
      confidence = 0.7;
    } else {
      method = 'ai_analysis';
      dataPoints = Math.floor(Math.random() * 10) + 1;
      confidence = 0.75;
    }
    
    return { method, dataPoints, confidence };
  }

  private calculateBaseEstimate(task: any, context?: any): number {
    const typeBaselines = {
      'feature': 24,
      'bug': 8,
      'maintenance': 12,
      'research': 32,
      'documentation': 16
    };
    
    const baseline = typeBaselines[task.type] || 16;
    
    // Adjust for experience level
    const experienceMultiplier = {
      'junior': 1.5,
      'intermediate': 1.0,
      'senior': 0.8,
      'expert': 0.6
    }[context?.teamExperience || 'intermediate'];
    
    return baseline * experienceMultiplier;
  }

  private generateEstimationFactors(task: any, context?: any) {
    const factors = [];
    
    // Complexity factor
    if (task.complexity) {
      const complexityMultipliers = {
        'low': 0.8,
        'medium': 1.0,
        'high': 1.4,
        'very_high': 1.8
      };
      
      factors.push({
        factor: 'Task Complexity',
        impact: 'increases' as const,
        multiplier: complexityMultipliers[task.complexity] || 1.0,
        description: `${task.complexity} complexity task requires additional effort`
      });
    }
    
    // Project type factor
    if (context?.projectType) {
      const projectMultipliers = {
        'greenfield': 1.0,
        'brownfield': 1.3,
        'maintenance': 0.9,
        'migration': 1.5
      };
      
      factors.push({
        factor: 'Project Type',
        impact: context.projectType === 'maintenance' ? 'decreases' as const : 'increases' as const,
        multiplier: projectMultipliers[context.projectType] || 1.0,
        description: `${context.projectType} project characteristics`
      });
    }
    
    return factors;
  }

  private calculateEstimationConfidence(task: any, context?: any, methodology?: EstimationMethodology): number {
    let confidence = 0.7; // Base confidence
    
    // Methodology affects confidence
    if (methodology) {
      const methodConfidence = {
        'historical_comparison': 0.85,
        'ai_analysis': 0.75,
        'expert_judgment': 0.8,
        'hybrid': 0.9
      };
      confidence = methodConfidence[methodology.method];
    }
    
    // Task characteristics
    if (task.description && task.description.length > 200) confidence += 0.1;
    if (task.requirements && task.requirements.length > 3) confidence += 0.05;
    
    // Context availability
    if (context?.teamExperience) confidence += 0.05;
    if (context?.techStack) confidence += 0.05;
    
    return Math.max(0.4, Math.min(0.95, Math.round(confidence * 100) / 100));
  }

  private calculateEstimationRange(baseHours: number, confidence: number) {
    const variance = (1 - confidence) * 0.5; // Higher variance for lower confidence
    
    return {
      min: Math.round(baseHours * (1 - variance)),
      max: Math.round(baseHours * (1 + variance)),
      mostLikely: baseHours
    };
  }

  private generateEstimationBreakdown(totalHours: number, taskType: string, includeBuffer?: boolean) {
    const breakdown = {
      analysis: Math.round(totalHours * 0.10),
      design: Math.round(totalHours * 0.15),
      implementation: Math.round(totalHours * 0.50),
      testing: Math.round(totalHours * 0.15),
      review: Math.round(totalHours * 0.05),
      deployment: Math.round(totalHours * 0.05),
      buffer: includeBuffer ? Math.round(totalHours * 0.20) : 0
    };
    
    // Adjust breakdown based on task type
    if (taskType === 'research') {
      breakdown.analysis = Math.round(totalHours * 0.40);
      breakdown.implementation = Math.round(totalHours * 0.30);
    } else if (taskType === 'bug') {
      breakdown.analysis = Math.round(totalHours * 0.30);
      breakdown.testing = Math.round(totalHours * 0.25);
      breakdown.implementation = Math.round(totalHours * 0.35);
    }
    
    return breakdown;
  }

  private generateHistoricalComparisons(task: any) {
    const comparisons = [];
    const comparisonCount = Math.floor(Math.random() * 4) + 1;
    
    for (let i = 0; i < comparisonCount; i++) {
      const similarity = Math.random() * 0.6 + 0.4; // 40-100% similarity
      const actualHours = Math.round((Math.random() * 40 + 5) * 10) / 10;
      const variance = (Math.random() * 0.4 - 0.2); // -20% to +20% variance
      
      comparisons.push({
        taskId: uuidv4(),
        title: `Similar ${task.type} task ${i + 1}`,
        similarity: Math.round(similarity * 100) / 100,
        actualHours,
        variance: Math.round(variance * 100) / 100
      });
    }
    
    return comparisons.sort((a, b) => b.similarity - a.similarity);
  }

  // Methods for task breakdown generation
  private generateSubtasks(task: Task, request: TaskBreakdownRequest) {
    const subtasks = [];
    const maxSubtasks = Math.min(request.maxSubtasks, 8);
    const baseSubtaskCount = {
      'high': 6,
      'medium': 4,
      'low': 2
    }[request.granularity];
    
    const subtaskCount = Math.min(maxSubtasks, baseSubtaskCount + Math.floor(Math.random() * 2));
    
    // Generate type-specific subtasks
    const subtaskTemplates = this.getSubtaskTemplates(task.type, task.title);
    
    for (let i = 0; i < Math.min(subtaskCount, subtaskTemplates.length); i++) {
      const template = subtaskTemplates[i];
      const estimatedHours = request.includeEstimates 
        ? this.calculateSubtaskEstimate(template, task, request.granularity)
        : 0;
      
      subtasks.push({
        id: uuidv4(),
        title: template.title,
        description: template.description,
        type: template.type,
        priority: template.priority,
        estimatedHours,
        storyPoints: Math.round(estimatedHours / 8 * 3),
        order: i + 1,
        dependencies: [],
        acceptanceCriteria: template.acceptanceCriteria || [],
        tags: ['subtask', task.type]
      });
    }
    
    return subtasks;
  }

  private getSubtaskTemplates(taskType: string, taskTitle: string) {
    const templates = {
      'feature': [
        {
          title: `Requirements analysis for ${taskTitle}`,
          description: 'Define detailed requirements and acceptance criteria',
          type: 'research' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Requirements documented', 'Stakeholder approval obtained']
        },
        {
          title: `Design architecture for ${taskTitle}`,
          description: 'Create technical design and architecture plan',
          type: 'feature' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Architecture documented', 'Design review completed']
        },
        {
          title: `Implement core functionality for ${taskTitle}`,
          description: 'Develop the main feature functionality',
          type: 'feature' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Core functionality working', 'Code follows standards']
        },
        {
          title: `Create unit tests for ${taskTitle}`,
          description: 'Develop comprehensive unit test coverage',
          type: 'feature' as const,
          priority: 'medium' as const,
          acceptanceCriteria: ['90% test coverage achieved', 'All tests passing']
        },
        {
          title: `Integration testing for ${taskTitle}`,
          description: 'Test integration with existing systems',
          type: 'feature' as const,
          priority: 'medium' as const,
          acceptanceCriteria: ['Integration tests passing', 'No regression detected']
        },
        {
          title: `Documentation for ${taskTitle}`,
          description: 'Create user and developer documentation',
          type: 'documentation' as const,
          priority: 'low' as const,
          acceptanceCriteria: ['User guide complete', 'API documentation updated']
        }
      ],
      'bug': [
        {
          title: `Investigate ${taskTitle}`,
          description: 'Analyze logs and reproduce the issue',
          type: 'research' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Root cause identified', 'Reproduction steps documented']
        },
        {
          title: `Fix implementation for ${taskTitle}`,
          description: 'Implement the bug fix',
          type: 'bug' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Bug resolved', 'No side effects introduced']
        },
        {
          title: `Test fix for ${taskTitle}`,
          description: 'Verify the fix works and add regression tests',
          type: 'bug' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Fix verified', 'Regression test added']
        }
      ],
      'research': [
        {
          title: `Define research scope for ${taskTitle}`,
          description: 'Clarify objectives and success criteria',
          type: 'research' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Scope defined', 'Success criteria established']
        },
        {
          title: `Conduct investigation for ${taskTitle}`,
          description: 'Perform the research and analysis',
          type: 'research' as const,
          priority: 'high' as const,
          acceptanceCriteria: ['Research completed', 'Findings documented']
        },
        {
          title: `Create prototype for ${taskTitle}`,
          description: 'Build proof-of-concept demonstration',
          type: 'research' as const,
          priority: 'medium' as const,
          acceptanceCriteria: ['Prototype functional', 'Concept validated']
        },
        {
          title: `Document findings for ${taskTitle}`,
          description: 'Compile results and recommendations',
          type: 'documentation' as const,
          priority: 'medium' as const,
          acceptanceCriteria: ['Report complete', 'Recommendations provided']
        }
      ]
    };
    
    return templates[taskType] || templates['feature'];
  }

  private calculateSubtaskEstimate(template: any, parentTask: Task, granularity: string): number {
    const baseHours = {
      'research': 8,
      'feature': 12,
      'bug': 6,
      'documentation': 4,
      'maintenance': 4
    }[template.type] || 8;
    
    const granularityMultiplier = {
      'high': 0.7,
      'medium': 1.0,
      'low': 1.5
    }[granularity];
    
    const priorityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.2,
      'urgent': 1.4
    }[template.priority];
    
    return Math.round(baseHours * granularityMultiplier * priorityMultiplier);
  }

  private generateSubtaskDependencies(subtasks: any[], includeDependencies: boolean) {
    if (!includeDependencies) return [];
    
    const dependencies = [];
    
    // Create logical dependencies based on subtask order
    for (let i = 1; i < subtasks.length; i++) {
      const sourceTask = subtasks[i - 1];
      const targetTask = subtasks[i];
      
      // Add dependency if it makes logical sense
      if (this.shouldCreateDependency(sourceTask, targetTask)) {
        dependencies.push({
          sourceId: sourceTask.id,
          targetId: targetTask.id,
          type: 'depends_on' as const,
          description: `${targetTask.title} depends on completion of ${sourceTask.title}`
        });
      }
    }
    
    return dependencies;
  }

  private shouldCreateDependency(sourceTask: any, targetTask: any): boolean {
    // Logic for determining if a dependency should exist
    const dependencyRules = {
      'research': ['feature', 'bug', 'documentation'],
      'feature': ['feature'], // Can depend on other features
      'documentation': [] // Usually doesn't block other tasks
    };
    
    const validTargets = dependencyRules[sourceTask.type] || [];
    return validTargets.includes(targetTask.type) && Math.random() > 0.3;
  }

  private calculateCriticalPath(subtasks: any[], dependencies: any[]): string[] {
    // Simplified critical path calculation
    const taskDurations = new Map(subtasks.map(task => [task.id, task.estimatedHours]));
    
    // For simplicity, return the longest path through dependencies
    const pathTasks = subtasks
      .filter(task => dependencies.some(dep => dep.sourceId === task.id || dep.targetId === task.id))
      .sort((a, b) => b.estimatedHours - a.estimatedHours)
      .slice(0, 3)
      .map(task => task.id);
    
    return pathTasks.length > 0 ? pathTasks : [subtasks[0]?.id].filter(Boolean);
  }

  private calculateEstimatedDuration(criticalPath: string[], subtasks: any[], context?: any): number {
    const criticalTasks = subtasks.filter(task => criticalPath.includes(task.id));
    const totalHours = criticalTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    
    // Convert to working days (8 hours per day)
    const workingDays = Math.ceil(totalHours / 8);
    
    // Add buffer based on team velocity
    const velocity = context?.teamVelocity || 1.0;
    return Math.round(workingDays / velocity);
  }

  private calculateBreakdownConfidence(task: Task, request: TaskBreakdownRequest, subtasks: any[]): number {
    let confidence = 0.75; // Base confidence
    
    // Adjust based on granularity
    if (request.granularity === 'high') confidence += 0.1;
    if (request.granularity === 'low') confidence -= 0.1;
    
    // Adjust based on subtask count
    if (subtasks.length > 6) confidence -= 0.05;
    if (subtasks.length < 3) confidence -= 0.1;
    
    // Adjust based on task complexity
    const taskComplexity = task.metadata?.complexity;
    if (taskComplexity === 'high' || taskComplexity === 'very_high') confidence -= 0.1;
    
    return Math.max(0.4, Math.min(0.9, Math.round(confidence * 100) / 100));
  }

  // Dependency analysis helper methods
  private detectCircularDependencies(tasks: Task[], dependencies: TaskDependencyEntry[]) {
    const cycles: DependencyAnalysisResponse['analysis']['circularDependencies'] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    // Build adjacency list
    const graph = new Map<string, string[]>();
    tasks.forEach(task => graph.set(task.id, []));
    
    dependencies.forEach(dep => {
      const sources = graph.get(dep.sourceTaskId) || [];
      sources.push(dep.targetTaskId);
      graph.set(dep.sourceTaskId, sources);
    });
    
    // DFS to detect cycles
    const detectCycle = (taskId: string, path: string[]): boolean => {
      if (recursionStack.has(taskId)) {
        // Found cycle
        const cycleStart = path.indexOf(taskId);
        const cycle = path.slice(cycleStart).concat(taskId);
        
        cycles.push({
          cycle,
          severity: cycle.length > 4 ? 'critical' : cycle.length > 2 ? 'high' : 'medium',
          description: `Circular dependency detected involving ${cycle.length} tasks`
        });
        return true;
      }
      
      if (visited.has(taskId)) return false;
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const neighbors = graph.get(taskId) || [];
      for (const neighbor of neighbors) {
        if (detectCycle(neighbor, [...path, taskId])) {
          return true;
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    // Check each task
    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        detectCycle(task.id, []);
      }
    });
    
    return cycles;
  }

  private findCriticalPath(tasks: Task[], dependencies: TaskDependencyEntry[]): string[] {
    // Simplified critical path using longest path algorithm
    const taskDurations = new Map(tasks.map(task => [task.id, task.estimatedHours || 8]));
    
    // Build dependency graph
    const dependents = new Map<string, string[]>();
    const dependencies_count = new Map<string, number>();
    
    tasks.forEach(task => {
      dependents.set(task.id, []);
      dependencies_count.set(task.id, 0);
    });
    
    dependencies.forEach(dep => {
      const deps = dependents.get(dep.sourceTaskId) || [];
      deps.push(dep.targetTaskId);
      dependents.set(dep.sourceTaskId, deps);
      
      const count = dependencies_count.get(dep.targetTaskId) || 0;
      dependencies_count.set(dep.targetTaskId, count + 1);
    });
    
    // Find longest path (simplified version)
    const longestPath = tasks
      .sort((a, b) => (b.estimatedHours || 8) - (a.estimatedHours || 8))
      .slice(0, 3)
      .map(task => task.id);
    
    return longestPath;
  }

  private identifyBottlenecks(tasks: Task[], dependencies: TaskDependencyEntry[]) {
    const bottlenecks: DependencyAnalysisResponse['analysis']['bottlenecks'] = [];
    
    // Count how many tasks depend on each task
    const dependentCounts = new Map<string, number>();
    tasks.forEach(task => dependentCounts.set(task.id, 0));
    
    dependencies.forEach(dep => {
      const count = dependentCounts.get(dep.sourceTaskId) || 0;
      dependentCounts.set(dep.sourceTaskId, count + 1);
    });
    
    // Identify tasks with high dependency counts
    dependentCounts.forEach((count, taskId) => {
      if (count >= 3) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          bottlenecks.push({
            taskId,
            dependentCount: count,
            impact: count >= 5 ? 'critical' : count >= 4 ? 'high' : 'medium',
            description: `${task.title} blocks ${count} other tasks`
          });
        }
      }
    });
    
    return bottlenecks.sort((a, b) => b.dependentCount - a.dependentCount);
  }

  private assessDependencyRisks(tasks: Task[], dependencies: TaskDependencyEntry[], 
                               circularDeps: any[], bottlenecks: any[]) {
    const risks: DependencyAnalysisResponse['analysis']['risks'] = [];
    
    // Circular dependency risks
    if (circularDeps.length > 0) {
      risks.push({
        type: 'circular',
        severity: 'critical',
        affectedTasks: circularDeps.flatMap(cycle => cycle.cycle),
        description: `${circularDeps.length} circular dependencies detected that will prevent task completion`
      });
    }
    
    // Bottleneck risks
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.impact === 'critical' || bottleneck.impact === 'high') {
        risks.push({
          type: 'bottleneck',
          severity: bottleneck.impact,
          affectedTasks: [bottleneck.taskId],
          description: `Critical bottleneck: ${bottleneck.dependentCount} tasks depend on completion of this task`
        });
      }
    });
    
    // Resource conflicts (simplified)
    const assigneeCounts = new Map<string, number>();
    tasks.forEach(task => {
      if (task.assignee) {
        const count = assigneeCounts.get(task.assignee.id) || 0;
        assigneeCounts.set(task.assignee.id, count + 1);
      }
    });
    
    assigneeCounts.forEach((count, assigneeId) => {
      if (count > 3) {
        const assignee = this.users.get(assigneeId);
        risks.push({
          type: 'resource',
          severity: count > 5 ? 'high' : 'medium',
          affectedTasks: tasks.filter(t => t.assignee?.id === assigneeId).map(t => t.id),
          description: `${assignee?.name || 'Assignee'} has ${count} concurrent tasks which may impact delivery`
        });
      }
    });
    
    return risks;
  }

  private generateDependencyRecommendations(circularDeps: any[], bottlenecks: any[], risks: any[]) {
    const recommendations: DependencyAnalysisResponse['recommendations'] = [];
    
    // Recommendations for circular dependencies
    if (circularDeps.length > 0) {
      recommendations.push({
        type: 'restructure',
        priority: 'urgent',
        description: 'Break circular dependencies by removing or reordering dependency relationships',
        affectedTasks: circularDeps.flatMap(cycle => cycle.cycle),
        estimatedImpact: 'high'
      });
    }
    
    // Recommendations for bottlenecks
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.impact === 'critical') {
        recommendations.push({
          type: 'parallel',
          priority: 'high',
          description: `Parallelize work around bottleneck task or increase resources`,
          affectedTasks: [bottleneck.taskId],
          estimatedImpact: 'medium'
        });
      }
    });
    
    // Resource optimization recommendations
    const resourceRisks = risks.filter(r => r.type === 'resource');
    if (resourceRisks.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Rebalance task assignments to distribute workload more evenly',
        affectedTasks: resourceRisks.flatMap(r => r.affectedTasks),
        estimatedImpact: 'medium'
      });
    }
    
    return recommendations;
  }

  private calculateDependencyAnalysisConfidence(tasks: Task[], dependencies: TaskDependencyEntry[]): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on data completeness
    const tasksWithAssignees = tasks.filter(t => t.assignee).length;
    const assigneeCompleteness = tasksWithAssignees / tasks.length;
    confidence += (assigneeCompleteness - 0.5) * 0.2;
    
    // Adjust based on dependency complexity
    const avgDependenciesPerTask = dependencies.length / tasks.length;
    if (avgDependenciesPerTask > 2) confidence -= 0.1;
    if (avgDependenciesPerTask < 0.5) confidence -= 0.05;
    
    return Math.max(0.5, Math.min(0.95, Math.round(confidence * 100) / 100));
  }

  // Dependency validation helper methods
  private validateDependencyCycles(dependencies: DependencyValidationRequest['dependencies']) {
    const graph = new Map<string, Set<string>>();
    const cycles: any[] = [];
    
    // Build graph
    dependencies.forEach(dep => {
      if (!graph.has(dep.sourceTaskId)) {
        graph.set(dep.sourceTaskId, new Set());
      }
      graph.get(dep.sourceTaskId)!.add(dep.targetTaskId);
    });
    
    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push({
          cycle: path.slice(cycleStart).concat(node),
          severity: 'error' as const
        });
        return true;
      }
      
      if (visited.has(node)) return false;
      
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor, [...path, node])) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    const allNodes = new Set<string>();
    dependencies.forEach(dep => {
      allNodes.add(dep.sourceTaskId);
      allNodes.add(dep.targetTaskId);
    });
    
    let foundCycles = false;
    allNodes.forEach(node => {
      if (!visited.has(node)) {
        if (hasCycle(node, [])) {
          foundCycles = true;
        }
      }
    });
    
    return {
      passed: !foundCycles,
      cycles
    };
  }

  private validateResourceCapacity(dependencies: any[], context?: any) {
    // Simplified capacity validation
    const conflicts: any[] = [];
    
    // Check if any task has too many dependencies
    const dependencyCounts = new Map<string, number>();
    dependencies.forEach(dep => {
      const count = dependencyCounts.get(dep.targetTaskId) || 0;
      dependencyCounts.set(dep.targetTaskId, count + 1);
    });
    
    dependencyCounts.forEach((count, taskId) => {
      if (count > 5) {
        conflicts.push({
          taskId,
          issue: `Task has ${count} dependencies which may indicate over-complexity`,
          severity: 'warning' as const
        });
      }
    });
    
    return {
      passed: conflicts.length === 0,
      conflicts
    };
  }

  private validateTimingConstraints(dependencies: any[], context?: any) {
    // Simplified timing validation
    const conflicts: any[] = [];
    
    // Check for potential timing issues (simplified logic)
    dependencies.forEach(dep => {
      if (Math.random() < 0.1) { // 10% chance of timing conflict
        conflicts.push({
          sourceTaskId: dep.sourceTaskId,
          targetTaskId: dep.targetTaskId,
          issue: 'Potential timing conflict detected based on estimated schedules',
          severity: 'warning' as const
        });
      }
    });
    
    return {
      passed: conflicts.length === 0,
      conflicts
    };
  }

  private generateValidationSuggestions(cycleCheck: any, capacityCheck: any, timingCheck: any) {
    const suggestions: any[] = [];
    
    if (!cycleCheck.passed) {
      suggestions.push({
        type: 'remove',
        description: 'Remove dependencies that create circular references',
        affectedDependencies: cycleCheck.cycles.map((_: any, index: number) => index)
      });
    }
    
    if (!capacityCheck.passed) {
      suggestions.push({
        type: 'split',
        description: 'Consider breaking down tasks with excessive dependencies',
        affectedDependencies: []
      });
    }
    
    if (!timingCheck.passed) {
      suggestions.push({
        type: 'reorder',
        description: 'Adjust task timing to resolve scheduling conflicts',
        affectedDependencies: []
      });
    }
    
    return suggestions;
  }

  /**
   * Clears all analysis caches for testing
   */
  clearAnalysisCaches(): void {
    this.analysisCache.clear();
    this.estimationCache.clear();
    this.breakdownCache.clear();
    this.dependencyAnalysisCache.clear();
    logger.info('All AI analysis caches cleared');
  }
  
  /**
   * Gets cache statistics for monitoring
   */
  getCacheStatistics() {
    return {
      analysisCache: this.analysisCache.size,
      estimationCache: this.estimationCache.size,
      breakdownCache: this.breakdownCache.size,
      dependencyAnalysisCache: this.dependencyAnalysisCache.size,
      totalCachedItems: this.analysisCache.size + this.estimationCache.size + 
                       this.breakdownCache.size + this.dependencyAnalysisCache.size
    };
  }

  // ===========================================
  // UTILITY METHODS FOR GENERATING TEST SCENARIOS
  // ===========================================

  /**
   * Generates a complex task scenario for testing AI analysis capabilities
   */
  generateComplexTaskScenario(scenarioType: 'high-risk' | 'multi-dependency' | 'resource-intensive' | 'research-heavy'): TaskAnalysisRequest {
    const scenarios = {
      'high-risk': {
        title: 'Migrate legacy authentication system to OAuth 2.0',
        description: 'Complete migration of the existing proprietary authentication system to industry-standard OAuth 2.0. This involves updating all client applications, migrating user data, maintaining backward compatibility during transition, and ensuring zero downtime deployment. The system currently handles 100,000+ active users across 15 different client applications.',
        type: 'feature' as const,
        requirements: [
          'Zero downtime migration',
          'Backward compatibility for 6 months',
          'Data integrity validation',
          'Performance benchmarking',
          'Security audit compliance',
          'Multi-tenant support'
        ],
        context: {
          teamSize: 8,
          techStack: ['microservices', 'kubernetes', 'postgresql', 'redis', 'oauth2'],
          constraints: [
            'GDPR compliance required',
            'Must maintain SLA of 99.9% uptime',
            'Integration with 3rd party identity providers',
            'Budget limitations for infrastructure'
          ]
        }
      },
      'multi-dependency': {
        title: 'Implement real-time notification system',
        description: 'Build a comprehensive real-time notification system that integrates with email, SMS, push notifications, and in-app messaging. System must handle notification preferences, delivery confirmation, retry mechanisms, and analytics. Requires integration with existing user management, subscription billing, and audit logging systems.',
        type: 'feature' as const,
        requirements: [
          'Real-time WebSocket connections',
          'Multi-channel delivery (email, SMS, push)',
          'User preference management',
          'Delivery confirmation and retry logic',
          'Rate limiting and throttling',
          'Analytics and reporting dashboard'
        ],
        context: {
          teamSize: 6,
          techStack: ['nodejs', 'websockets', 'kafka', 'elasticsearch', 'react'],
          constraints: [
            'Must integrate with 5 existing services',
            'Scalability to 1M+ notifications/day',
            'GDPR and CAN-SPAM compliance'
          ]
        }
      },
      'resource-intensive': {
        title: 'Optimize data processing pipeline for machine learning workflows',
        description: 'Re-architect the existing data processing pipeline to handle ML training workflows efficiently. Current system processes 10TB of data daily but struggles with ML workloads requiring iterative processing, feature extraction, and model training orchestration. New system must support distributed computing, GPU acceleration, and automatic scaling.',
        type: 'feature' as const,
        requirements: [
          'Distributed processing capability',
          'GPU acceleration support',
          'Automatic horizontal scaling',
          'Data lineage tracking',
          'Model versioning integration',
          'Cost optimization for cloud resources'
        ],
        context: {
          teamSize: 12,
          techStack: ['apache-spark', 'kubernetes', 'tensorflow', 'aws-sagemaker', 'airflow'],
          constraints: [
            'Budget constraints for GPU instances',
            'Data residency requirements',
            'Integration with existing ML platform',
            'Performance SLA of <2 hour processing time'
          ]
        }
      },
      'research-heavy': {
        title: 'Evaluate and implement advanced caching strategy for distributed systems',
        description: 'Research and implement an advanced caching strategy to improve performance of our distributed microservices architecture. Current system experiences cache invalidation issues, cache stampede problems, and inconsistent cache hit ratios across services. Need to evaluate technologies like Redis Cluster, Hazelcast, and implement intelligent cache warming and invalidation strategies.',
        type: 'research' as const,
        requirements: [
          'Performance benchmarking of cache solutions',
          'Cache invalidation strategy design',
          'Distributed cache coherency analysis',
          'Cost-benefit analysis of solutions',
          'Migration strategy from current system',
          'Monitoring and alerting framework'
        ],
        context: {
          teamSize: 4,
          techStack: ['redis', 'hazelcast', 'memcached', 'consul', 'prometheus'],
          constraints: [
            'Cannot exceed current infrastructure costs by >20%',
            'Must maintain backward compatibility',
            'Research phase limited to 4 weeks',
            'POC implementation required'
          ]
        }
      }
    };
    
    const scenario = scenarios[scenarioType];
    return {
      ...scenario,
      options: {
        includeBreakdown: true,
        includeRisks: true,
        includeEstimate: true,
        analyzeComplexity: true
      }
    };
  }
  
  /**
   * Generates estimation test data with known accuracy metrics
   */
  generateEstimationTestData(complexity: 'low' | 'medium' | 'high', teamExperience: 'junior' | 'senior'): TaskEstimationRequest {
    const baseHours = {
      'low': 16,
      'medium': 40,
      'high': 80
    }[complexity];
    
    return {
      tasks: [{
        title: `${complexity} complexity ${teamExperience} team task`,
        description: `A ${complexity} complexity task designed for ${teamExperience} team estimation testing. Expected hours: ${baseHours}`,
        type: 'feature',
        complexity
      }],
      context: {
        teamExperience,
        projectType: 'greenfield',
        techStack: ['typescript', 'react', 'nodejs']
      },
      options: {
        unit: 'hours',
        includeBuffer: true,
        includeBreakdown: true,
        confidenceLevel: 'medium'
      }
    };
  }

  /**
   * Generates comprehensive template data with advanced variables and usage patterns
   */
  generateAdvancedTemplateData(): TaskTemplate[] {
    const advancedTemplates = [
      {
        name: 'Microservice Development Template',
        description: 'Complete template for developing a new microservice with all DevOps practices',
        category: 'feature' as const,
        tags: ['microservice', 'devops', 'kubernetes', 'monitoring'],
        template: {
          title: 'Develop {{service_name}} Microservice',
          description: 'Create {{service_name}} microservice with {{api_endpoints}} endpoints, including authentication, monitoring, and deployment automation. Technology stack: {{tech_stack}}.',
          type: 'feature' as const,
          priority: 'high' as const,
          estimatedHours: 120,
          acceptanceCriteria: [
            'Service implements all {{api_endpoints}} REST endpoints',
            'Authentication and authorization working',
            'Comprehensive test coverage (>90%)',
            'Docker containerization complete',
            'Kubernetes deployment manifests created',
            'Monitoring and logging integrated',
            'API documentation generated',
            'Performance benchmarks met'
          ],
          subtasks: [
            {
              title: 'Design {{service_name}} API specification',
              description: 'Create OpenAPI specification with {{api_endpoints}} endpoints',
              type: 'research' as const,
              priority: 'high' as const,
              estimatedHours: 16
            },
            {
              title: 'Implement {{service_name}} core business logic',
              description: 'Develop the main service functionality using {{tech_stack}}',
              type: 'feature' as const,
              priority: 'high' as const,
              estimatedHours: 40
            },
            {
              title: 'Create comprehensive test suite for {{service_name}}',
              description: 'Unit, integration, and contract tests',
              type: 'feature' as const,
              priority: 'medium' as const,
              estimatedHours: 24
            },
            {
              title: 'Setup CI/CD pipeline for {{service_name}}',
              description: 'Automated testing, building, and deployment',
              type: 'maintenance' as const,
              priority: 'medium' as const,
              estimatedHours: 20
            },
            {
              title: 'Configure monitoring and alerting for {{service_name}}',
              description: 'Prometheus metrics, Grafana dashboards, alert rules',
              type: 'maintenance' as const,
              priority: 'medium' as const,
              estimatedHours: 12
            },
            {
              title: 'Create documentation for {{service_name}}',
              description: 'API docs, deployment guide, troubleshooting guide',
              type: 'documentation' as const,
              priority: 'low' as const,
              estimatedHours: 8
            }
          ],
          dependencies: [
            {
              type: 'external' as const,
              description: 'Infrastructure team approval for resource allocation'
            },
            {
              type: 'external' as const,
              description: 'Security team review of authentication implementation'
            },
            {
              type: 'external' as const,
              description: 'DevOps team configuration of deployment pipelines'
            }
          ],
          metadata: {
            complexity: 'high',
            skills: ['backend', 'devops', 'kubernetes', 'monitoring'],
            reviewRequired: true,
            securityReview: true,
            performanceReview: true
          }
        },
        variables: [
          {
            name: 'service_name',
            type: 'string',
            required: true,
            description: 'Name of the microservice to develop',
            validation: {
              pattern: '^[a-z][a-z0-9-]*[a-z0-9]$',
              min: 3,
              max: 50
            }
          },
          {
            name: 'api_endpoints',
            type: 'number',
            required: true,
            defaultValue: 5,
            description: 'Number of REST API endpoints to implement',
            validation: {
              min: 1,
              max: 20
            }
          },
          {
            name: 'tech_stack',
            type: 'string',
            required: false,
            defaultValue: 'Node.js, TypeScript, Express',
            description: 'Technology stack for the microservice',
            validation: {
              options: [
                'Node.js, TypeScript, Express',
                'Java, Spring Boot',
                'Python, FastAPI',
                'Go, Gin',
                '.NET Core, C#'
              ]
            }
          },
          {
            name: 'database_type',
            type: 'string',
            required: false,
            defaultValue: 'PostgreSQL',
            description: 'Database technology to use',
            validation: {
              options: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'DynamoDB']
            }
          },
          {
            name: 'authentication_type',
            type: 'string',
            required: false,
            defaultValue: 'JWT',
            description: 'Authentication mechanism',
            validation: {
              options: ['JWT', 'OAuth2', 'API Key', 'mTLS']
            }
          }
        ],
        usage: {
          timesUsed: 23,
          lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.6,
          successRate: 0.91,
          averageCompletionTime: 115.2
        }
      },
      {
        name: 'Data Migration Template',
        description: 'Comprehensive template for large-scale data migration projects',
        category: 'maintenance' as const,
        tags: ['data-migration', 'etl', 'database', 'testing'],
        template: {
          title: 'Migrate {{source_system}} data to {{target_system}}',
          description: 'Complete data migration from {{source_system}} to {{target_system}}, processing {{record_count}} records with validation and rollback capabilities.',
          type: 'maintenance' as const,
          priority: 'high' as const,
          estimatedHours: 80,
          acceptanceCriteria: [
            'Data mapping document approved by stakeholders',
            'Migration scripts tested on staging environment',
            'Data validation rules implemented and passing',
            'Rollback procedure tested and documented',
            'Performance benchmarks met ({{performance_target}})',
            'Zero data loss during migration',
            'Downtime within acceptable window ({{downtime_window}})',
            'Post-migration verification complete'
          ],
          subtasks: [
            {
              title: 'Analyze {{source_system}} data structure',
              description: 'Complete analysis of source data schema and relationships',
              type: 'research' as const,
              priority: 'high' as const,
              estimatedHours: 12
            },
            {
              title: 'Design {{target_system}} data model',
              description: 'Create optimized target schema and mapping rules',
              type: 'research' as const,
              priority: 'high' as const,
              estimatedHours: 16
            },
            {
              title: 'Develop migration scripts for {{record_count}} records',
              description: 'ETL scripts with error handling and logging',
              type: 'maintenance' as const,
              priority: 'high' as const,
              estimatedHours: 24
            },
            {
              title: 'Implement data validation framework',
              description: 'Automated validation of migrated data integrity',
              type: 'maintenance' as const,
              priority: 'high' as const,
              estimatedHours: 16
            },
            {
              title: 'Create rollback procedures',
              description: 'Safe rollback mechanisms and recovery procedures',
              type: 'maintenance' as const,
              priority: 'medium' as const,
              estimatedHours: 8
            },
            {
              title: 'Performance testing and optimization',
              description: 'Ensure migration meets {{performance_target}} requirements',
              type: 'maintenance' as const,
              priority: 'medium' as const,
              estimatedHours: 4
            }
          ],
          dependencies: [
            {
              type: 'external' as const,
              description: 'Database administrator approval for schema changes'
            },
            {
              type: 'external' as const,
              description: 'Business stakeholder approval of data mapping'
            },
            {
              type: 'external' as const,
              description: 'Maintenance window coordination with operations team'
            }
          ],
          metadata: {
            complexity: 'high',
            skills: ['database', 'etl', 'data-analysis', 'scripting'],
            reviewRequired: true,
            riskLevel: 'high',
            requiresBackup: true
          }
        },
        variables: [
          {
            name: 'source_system',
            type: 'string',
            required: true,
            description: 'Name of the source system/database'
          },
          {
            name: 'target_system',
            type: 'string',
            required: true,
            description: 'Name of the target system/database'
          },
          {
            name: 'record_count',
            type: 'string',
            required: true,
            defaultValue: '1M',
            description: 'Approximate number of records to migrate',
            validation: {
              options: ['<100K', '100K-1M', '1M-10M', '10M-100M', '>100M']
            }
          },
          {
            name: 'performance_target',
            type: 'string',
            required: false,
            defaultValue: '1000 records/second',
            description: 'Performance target for migration speed'
          },
          {
            name: 'downtime_window',
            type: 'string',
            required: false,
            defaultValue: '4 hours',
            description: 'Maximum acceptable downtime window',
            validation: {
              options: ['1 hour', '2 hours', '4 hours', '8 hours', '24 hours']
            }
          },
          {
            name: 'migration_strategy',
            type: 'string',
            required: false,
            defaultValue: 'big_bang',
            description: 'Migration execution strategy',
            validation: {
              options: ['big_bang', 'phased', 'parallel_run', 'trickle_feed']
            }
          }
        ],
        usage: {
          timesUsed: 12,
          lastUsed: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          averageRating: 4.3,
          successRate: 0.83,
          averageCompletionTime: 92.5
        }
      }
    ];
    
    return advancedTemplates.map((templateData, index) => {
      const templateId = uuidv4();
      const now = new Date();
      const createdAt = new Date(now.getTime() - (index * 14 * 24 * 60 * 60 * 1000));
      
      return {
        id: templateId,
        ...templateData,
        audit: {
          createdBy: Array.from(this.users.values())[0]?.id || 'system',
          createdAt: createdAt.toISOString(),
          updatedBy: Array.from(this.users.values())[0]?.id || 'system',
          updatedAt: createdAt.toISOString(),
          version: 1
        }
      };
    });
  }
  
  /**
   * Generates realistic risk assessment patterns for different project phases
   */
  generateRiskAssessmentPatterns(projectPhase: 'planning' | 'development' | 'testing' | 'deployment'): TaskRisk[] {
    const riskPatterns = {
      planning: [
        {
          type: 'scope' as const,
          severity: 'medium' as const,
          probability: 0.6,
          impact: 'medium' as const,
          title: 'Requirements scope creep',
          description: 'Initial requirements may expand during planning phase as stakeholders gain clarity',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Establish formal change control process',
                status: 'pending' as const,
                notes: 'Document approval workflow for requirement changes'
              },
              {
                action: 'Create detailed scope boundary document',
                status: 'pending' as const
              }
            ]
          }
        },
        {
          type: 'resource' as const,
          severity: 'high' as const,
          probability: 0.4,
          impact: 'high' as const,
          title: 'Key personnel availability during planning',
          description: 'Subject matter experts may not be available for requirement gathering sessions',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Schedule stakeholder availability in advance',
                status: 'pending' as const
              },
              {
                action: 'Identify backup SMEs for each domain area',
                status: 'pending' as const
              }
            ]
          }
        }
      ],
      development: [
        {
          type: 'technical' as const,
          severity: 'high' as const,
          probability: 0.5,
          impact: 'high' as const,
          title: 'Integration complexity with legacy systems',
          description: 'Legacy system integration may reveal undocumented dependencies and constraints',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Conduct technical spike for integration points',
                status: 'pending' as const,
                notes: 'Allocate 2 weeks for integration investigation'
              },
              {
                action: 'Create abstraction layer for legacy interactions',
                status: 'pending' as const
              }
            ]
          }
        },
        {
          type: 'quality' as const,
          severity: 'medium' as const,
          probability: 0.7,
          impact: 'medium' as const,
          title: 'Code quality degradation under pressure',
          description: 'Tight deadlines may lead to technical debt accumulation',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Implement automated code quality gates',
                status: 'pending' as const
              },
              {
                action: 'Schedule regular technical debt review sessions',
                status: 'pending' as const
              }
            ]
          }
        }
      ],
      testing: [
        {
          type: 'timeline' as const,
          severity: 'medium' as const,
          probability: 0.6,
          impact: 'medium' as const,
          title: 'Test environment availability delays',
          description: 'Test environments may not be available when needed for critical testing phases',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Reserve test environments in advance',
                status: 'pending' as const
              },
              {
                action: 'Set up containerized testing environments',
                status: 'pending' as const
              }
            ]
          }
        },
        {
          type: 'quality' as const,
          severity: 'high' as const,
          probability: 0.4,
          impact: 'high' as const,
          title: 'Critical defects discovered late in testing',
          description: 'Major defects found during final testing phases may require significant rework',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Implement shift-left testing practices',
                status: 'pending' as const
              },
              {
                action: 'Increase early-stage integration testing',
                status: 'pending' as const
              }
            ]
          }
        }
      ],
      deployment: [
        {
          type: 'external' as const,
          severity: 'critical' as const,
          probability: 0.3,
          impact: 'critical' as const,
          title: 'Production deployment rollback required',
          description: 'Deployment may fail or cause critical issues requiring immediate rollback',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Test rollback procedures in staging environment',
                status: 'pending' as const,
                notes: 'Verify rollback can be completed within 15 minutes'
              },
              {
                action: 'Implement blue-green deployment strategy',
                status: 'pending' as const
              },
              {
                action: 'Prepare incident response team for deployment window',
                status: 'pending' as const
              }
            ]
          }
        },
        {
          type: 'dependency' as const,
          severity: 'high' as const,
          probability: 0.4,
          impact: 'high' as const,
          title: 'Third-party service unavailability during deployment',
          description: 'External services required for deployment may be unavailable',
          mitigation: {
            strategy: 'mitigate' as const,
            actions: [
              {
                action: 'Coordinate deployment windows with service providers',
                status: 'pending' as const
              },
              {
                action: 'Implement circuit breaker patterns for external dependencies',
                status: 'pending' as const
              }
            ]
          }
        }
      ]
    };
    
    return riskPatterns[projectPhase].map(riskData => {
      const now = new Date();
      const users = Array.from(this.users.values());
      
      return {
        id: uuidv4(),
        ...riskData,
        status: 'open' as const,
        owner: Math.random() > 0.5 ? {
          id: users[Math.floor(Math.random() * users.length)].id,
          name: users[Math.floor(Math.random() * users.length)].name,
          email: users[Math.floor(Math.random() * users.length)].email
        } : undefined,
        history: [
          {
            timestamp: now.toISOString(),
            action: 'created' as const,
            userId: users[0].id,
            comment: `${projectPhase} phase risk identified`
          }
        ],
        audit: {
          createdBy: users[0].id,
          createdAt: now.toISOString(),
          updatedBy: users[0].id,
          updatedAt: now.toISOString(),
          version: 1
        }
      };
    });
  }
  
  /**
   * Simulates AI model accuracy metrics for estimation validation
   */
  getEstimationAccuracyMetrics(): AccuracyMetrics {
    return {
      historicalAccuracy: 0.82, // 82% historical accuracy
      modelPerformance: 0.78,   // 78% AI model performance
      dataQuality: 0.91         // 91% data quality score
    };
  }
  
  /**
   * Generates confidence level data for different scenarios
   */
  generateConfidenceLevels(scenario: 'simple' | 'complex' | 'novel'): ConfidenceLevel {
    const confidenceData = {
      simple: {
        level: 'high' as const,
        score: 0.89,
        factors: ['Well-defined requirements', 'Familiar technology stack', 'Experienced team']
      },
      complex: {
        level: 'medium' as const,
        score: 0.65,
        factors: ['Multiple integration points', 'Some unknown requirements', 'Mixed team experience']
      },
      novel: {
        level: 'low' as const,
        score: 0.42,
        factors: ['Experimental technology', 'Unclear requirements', 'Limited prior experience']
      }
    };
    
    return confidenceData[scenario];
  }

  /**
   * Generates mock data for multiple estimation methodologies with historical accuracy
   */
  generateMethodologyComparisonData(): Array<{
    methodology: EstimationMethodology;
    accuracy: AccuracyMetrics;
    sampleEstimate: TaskEstimationResponse;
  }> {
    const methodologies: EstimationMethodology[] = [
      { method: 'ai_analysis', dataPoints: 150, confidence: 0.78 },
      { method: 'historical_comparison', dataPoints: 89, confidence: 0.85 },
      { method: 'expert_judgment', dataPoints: 12, confidence: 0.72 },
      { method: 'hybrid', dataPoints: 203, confidence: 0.91 }
    ];

    return methodologies.map(methodology => {
      const accuracy: AccuracyMetrics = {
        historicalAccuracy: Math.random() * 0.3 + 0.65, // 65-95%
        modelPerformance: methodology.confidence,
        dataQuality: Math.random() * 0.2 + 0.8 // 80-100%
      };

      // Generate a sample estimate using this methodology
      const sampleTask = {
        id: uuidv4(),
        title: `Sample task estimated with ${methodology.method}`,
        description: 'Representative task for methodology comparison',
        type: 'feature',
        complexity: 'medium'
      };

      const estimatedHours = Math.round((Math.random() * 30 + 10) * 10) / 10;
      const confidence = methodology.confidence;

      const sampleEstimate: TaskEstimationResponse = {
        taskId: sampleTask.id,
        estimate: {
          hours: estimatedHours,
          storyPoints: Math.round(estimatedHours / 8 * 3),
          confidence,
          range: {
            min: Math.round(estimatedHours * 0.8),
            max: Math.round(estimatedHours * 1.3),
            mostLikely: estimatedHours
          },
          breakdown: {
            analysis: Math.round(estimatedHours * 0.1),
            design: Math.round(estimatedHours * 0.15),
            implementation: Math.round(estimatedHours * 0.5),
            testing: Math.round(estimatedHours * 0.15),
            review: Math.round(estimatedHours * 0.05),
            deployment: Math.round(estimatedHours * 0.05),
            buffer: Math.round(estimatedHours * 0.2)
          },
          factors: [
            {
              factor: 'Methodology Quality',
              impact: 'neutral',
              multiplier: 1.0,
              description: `Using ${methodology.method} with ${methodology.dataPoints} historical data points`
            }
          ],
          comparisons: []
        },
        metadata: {
          estimatedAt: new Date().toISOString(),
          version: '2.1.0',
          method: methodology.method,
          confidence
        }
      };

      return {
        methodology,
        accuracy,
        sampleEstimate
      };
    });
  }
}