import { randomUUID } from 'crypto';
import {
  DashboardOverview,
  ActivityItem,
  DeadlineItem,
  ProjectSummary,
  TaskSummary,
  DashboardAnalytics,
  Notification,
  User,
  UserPreferences,
  Widget,
  SearchResult,
  RealtimeStatus,
  HealthStatus,
  LoginResponse,
  PaginationInfo,
} from '../types';

export class MockDataService {
  private static instance: MockDataService;
  private users: Map<string, User> = new Map();
  private preferences: Map<string, UserPreferences> = new Map();
  private widgets: Map<string, Widget[]> = new Map();
  private notifications: Map<string, Notification[]> = new Map();
  private projects: ProjectSummary[] = [];
  private tasks: TaskSummary[] = [];
  private activities: ActivityItem[] = [];
  private deadlines: DeadlineItem[] = [];

  private constructor() {
    this.initializeMockData();
  }

  public static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  private initializeMockData(): void {
    // Initialize users
    const users = [
      {
        id: process.env.NODE_ENV === 'test' ? 'test-user-123' : randomUUID(),
        email: 'john.doe@cycletime.dev',
        name: 'John Doe',
        avatar: 'https://api.dicebear.com/7.x/avatars/svg?seed=john',
        role: 'admin' as const,
        status: 'active' as const,
        createdAt: '2024-01-15T10:30:00Z',
        lastActive: new Date().toISOString(),
        timezone: 'America/New_York',
        language: 'en',
      },
      {
        id: process.env.NODE_ENV === 'test' ? 'test-user-456' : randomUUID(),
        email: 'jane.smith@cycletime.dev',
        name: 'Jane Smith',
        avatar: 'https://api.dicebear.com/7.x/avatars/svg?seed=jane',
        role: 'developer' as const,
        status: 'active' as const,
        createdAt: '2024-01-20T14:20:00Z',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        timezone: 'America/Los_Angeles',
        language: 'en',
      },
      {
        id: process.env.NODE_ENV === 'test' ? 'test-user-789' : randomUUID(),
        email: 'mike.johnson@cycletime.dev',
        name: 'Mike Johnson',
        avatar: 'https://api.dicebear.com/7.x/avatars/svg?seed=mike',
        role: 'manager' as const,
        status: 'active' as const,
        createdAt: '2024-02-01T09:15:00Z',
        lastActive: new Date(Date.now() - 7200000).toISOString(),
        timezone: 'Europe/London',
        language: 'en',
      },
    ];

    users.forEach(user => {
      this.users.set(user.id, user);
      this.initializeUserPreferences(user.id);
      this.initializeUserWidgets(user.id);
      this.initializeUserNotifications(user.id);
    });

    this.initializeProjects();
    this.initializeTasks();
    this.initializeActivities();
    this.initializeDeadlines();
  }

  private initializeUserPreferences(userId: string): void {
    const preferences: UserPreferences = {
      theme: 'auto',
      notifications: {
        email: true,
        push: true,
        taskAssigned: true,
        projectUpdates: true,
        mentions: true,
      },
      dashboard: {
        defaultView: 'overview',
        showWelcomeCard: true,
        refreshInterval: 60,
        compactMode: false,
      },
      display: {
        language: 'en',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      },
    };
    this.preferences.set(userId, preferences);
  }

  private initializeUserWidgets(userId: string): void {
    const widgets: Widget[] = [
      {
        id: randomUUID(),
        type: 'tasks',
        title: 'My Tasks',
        position: { x: 0, y: 0, width: 6, height: 4 },
        config: {
          refreshInterval: 60,
          showHeader: true,
          theme: 'auto',
          filters: { assignedToMe: true },
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        type: 'projects',
        title: 'Active Projects',
        position: { x: 6, y: 0, width: 6, height: 4 },
        config: {
          refreshInterval: 120,
          showHeader: true,
          theme: 'auto',
          filters: { status: 'active' },
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        type: 'analytics',
        title: 'Performance Metrics',
        position: { x: 0, y: 4, width: 12, height: 6 },
        config: {
          refreshInterval: 300,
          showHeader: true,
          theme: 'auto',
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    this.widgets.set(userId, widgets);
  }

  private initializeUserNotifications(userId: string): void {
    const notifications: Notification[] = [
      {
        id: randomUUID(),
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned to "Implement user authentication"',
        read: false,
        priority: 'high',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        relatedItem: {
          type: 'task',
          id: randomUUID(),
          name: 'Implement user authentication',
        },
        actionUrl: '/tasks/implement-auth',
      },
      {
        id: randomUUID(),
        type: 'project_updated',
        title: 'Project Updated',
        message: 'CycleTime Dashboard project has been updated',
        read: false,
        priority: 'medium',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        relatedItem: {
          type: 'project',
          id: randomUUID(),
          name: 'CycleTime Dashboard',
        },
        actionUrl: '/projects/cycletime-dashboard',
      },
      {
        id: randomUUID(),
        type: 'mention',
        title: 'You were mentioned',
        message: 'John Doe mentioned you in a comment',
        read: true,
        priority: 'medium',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        readAt: new Date(Date.now() - 82800000).toISOString(),
        relatedItem: {
          type: 'comment',
          id: randomUUID(),
          name: 'Comment on task review',
        },
        actionUrl: '/tasks/review-comment',
      },
    ];
    this.notifications.set(userId, notifications);
  }

  private initializeProjects(): void {
    const projectNames = [
      'CycleTime Dashboard',
      'API Gateway Enhancement',
      'Mobile App Development',
      'Data Analytics Platform',
      'User Experience Redesign',
      'Security Audit Implementation',
    ];

    this.projects = projectNames.map(name => ({
      id: randomUUID(),
      name,
      description: `${name} project with comprehensive features and modern architecture`,
      status: Math.random() > 0.3 ? 'active' : Math.random() > 0.5 ? 'planned' : 'archived',
      progress: Math.random(),
      tasksCount: {
        total: Math.floor(Math.random() * 50) + 10,
        completed: Math.floor(Math.random() * 20) + 5,
        inProgress: Math.floor(Math.random() * 15) + 3,
        todo: Math.floor(Math.random() * 20) + 5,
      },
      teamMembers: Array.from(this.users.values()).slice(0, Math.floor(Math.random() * 3) + 1).map(user => ({
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      })),
      dueDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  private initializeTasks(): void {
    const taskTitles = [
      'Implement user authentication',
      'Design dashboard layout',
      'Set up CI/CD pipeline',
      'Write unit tests',
      'Optimize database queries',
      'Create API documentation',
      'Implement real-time notifications',
      'Add data visualization',
      'Perform security audit',
      'Update user interface',
      'Integrate third-party services',
      'Implement caching strategy',
      'Add monitoring and logging',
      'Create user onboarding flow',
      'Optimize performance',
    ];

    const users = Array.from(this.users.values());
    const statuses = ['todo', 'in_progress', 'review', 'done'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;

    this.tasks = taskTitles.map(title => ({
      id: randomUUID(),
      title,
      description: `${title} with comprehensive testing and documentation`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      assignee: Math.random() > 0.2 ? {
        id: users[Math.floor(Math.random() * users.length)].id,
        name: users[Math.floor(Math.random() * users.length)].name,
        avatar: users[Math.floor(Math.random() * users.length)].avatar,
      } : undefined,
      project: Math.random() > 0.1 ? {
        id: this.projects[Math.floor(Math.random() * this.projects.length)].id,
        name: this.projects[Math.floor(Math.random() * this.projects.length)].name,
      } : undefined,
      dueDate: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  private initializeActivities(): void {
    const users = Array.from(this.users.values());
    const activityTypes = ['task_created', 'task_completed', 'project_updated', 'user_joined', 'comment_added'] as const;

    this.activities = Array.from({ length: 20 }, (_, i) => ({
      id: randomUUID(),
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      title: `Activity ${i + 1}`,
      description: `Description for activity ${i + 1}`,
      user: {
        id: users[Math.floor(Math.random() * users.length)].id,
        name: users[Math.floor(Math.random() * users.length)].name,
        avatar: users[Math.floor(Math.random() * users.length)].avatar,
      },
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      relatedItem: Math.random() > 0.3 ? {
        type: Math.random() > 0.5 ? 'project' : 'task',
        id: randomUUID(),
        name: `Related item ${i + 1}`,
      } : undefined,
    }));
  }

  private initializeDeadlines(): void {
    const users = Array.from(this.users.values());
    const types = ['task', 'project', 'milestone'] as const;
    const priorities = ['low', 'medium', 'high', 'urgent'] as const;
    const statuses = ['todo', 'in_progress', 'review', 'done'] as const;

    this.deadlines = Array.from({ length: 10 }, (_, i) => ({
      id: randomUUID(),
      type: types[Math.floor(Math.random() * types.length)],
      title: `Deadline ${i + 1}`,
      description: `Description for deadline ${i + 1}`,
      dueDate: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      assignee: Math.random() > 0.2 ? {
        id: users[Math.floor(Math.random() * users.length)].id,
        name: users[Math.floor(Math.random() * users.length)].name,
        avatar: users[Math.floor(Math.random() * users.length)].avatar,
      } : undefined,
      project: Math.random() > 0.2 ? {
        id: this.projects[Math.floor(Math.random() * this.projects.length)].id,
        name: this.projects[Math.floor(Math.random() * this.projects.length)].name,
      } : undefined,
    }));
  }

  // Public methods for accessing mock data
  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  public getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  public authenticateUser(email: string, password: string): LoginResponse | null {
    const user = this.getUserByEmail(email);
    if (!user) return null;

    // Mock authentication - in real implementation, verify password hash
    if (password === 'password123') {
      return {
        success: true,
        user,
        tokens: {
          accessToken: `mock-access-token-${user.id}-${Date.now()}`,
          refreshToken: `mock-refresh-token-${user.id}-${Date.now()}`,
          expiresIn: 3600,
        },
        preferences: this.preferences.get(user.id)!,
        lastLogin: new Date().toISOString(),
      };
    }
    return null;
  }

  public getDashboardOverview(userId: string, timeframe = 'month'): DashboardOverview {
    const activeProjects = this.projects.filter(p => p.status === 'active');
    const activeTasks = this.tasks.filter(t => t.status === 'in_progress');
    const completedTasks = this.tasks.filter(t => t.status === 'done');

    return {
      summary: {
        totalProjects: this.projects.length,
        activeProjects: activeProjects.length,
        totalTasks: this.tasks.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        teamMembers: this.users.size,
      },
      recentActivity: this.activities.slice(0, 10),
      upcomingDeadlines: this.deadlines.filter(d => new Date(d.dueDate) > new Date()).slice(0, 5),
      performanceMetrics: {
        velocityTrend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
        completionRate: Math.random() * 0.4 + 0.6,
        averageCycleTime: Math.random() * 5 + 2,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  public getProjectsSummary(userId: string, options: any = {}): { projects: ProjectSummary[]; totalProjects: number; pagination: PaginationInfo } {
    let filteredProjects = [...this.projects];

    if (options.status) {
      filteredProjects = filteredProjects.filter(p => p.status === options.status);
    }

    if (options.sort) {
      filteredProjects.sort((a, b) => {
        switch (options.sort) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'created':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'updated':
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          default:
            return 0;
        }
      });
    }

    const limit = options.limit || 10;
    const page = options.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

    return {
      projects: paginatedProjects,
      totalProjects: filteredProjects.length,
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
        totalPages: Math.ceil(filteredProjects.length / limit),
        hasNext: endIndex < filteredProjects.length,
        hasPrevious: page > 1,
      },
    };
  }

  public getTasksSummary(userId: string, options: any = {}): { tasks: TaskSummary[]; totalTasks: number; pagination: PaginationInfo } {
    let filteredTasks = [...this.tasks];

    if (options.status) {
      filteredTasks = filteredTasks.filter(t => t.status === options.status);
    }

    if (options.priority) {
      filteredTasks = filteredTasks.filter(t => t.priority === options.priority);
    }

    if (options.assignedToMe) {
      filteredTasks = filteredTasks.filter(t => t.assignee?.id === userId);
    }

    const limit = options.limit || 20;
    const page = options.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    return {
      tasks: paginatedTasks,
      totalTasks: filteredTasks.length,
      pagination: {
        page,
        limit,
        total: filteredTasks.length,
        totalPages: Math.ceil(filteredTasks.length / limit),
        hasNext: endIndex < filteredTasks.length,
        hasPrevious: page > 1,
      },
    };
  }

  public getDashboardAnalytics(userId: string, timeframe = 'month'): DashboardAnalytics {
    const generateChartData = (days: number) => {
      return Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.random() * 100,
      }));
    };

    const generateBurndownData = (days: number) => {
      let remaining = 100;
      return Array.from({ length: days }, (_, i) => {
        const completed = Math.random() * 5;
        remaining = Math.max(0, remaining - completed);
        return {
          date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          remaining,
          completed: 100 - remaining,
        };
      });
    };

    return {
      timeframe,
      metrics: {
        velocity: {
          current: Math.random() * 50 + 25,
          previous: Math.random() * 50 + 25,
          trend: Math.random() > 0.5 ? 'up' : 'down',
          change: (Math.random() - 0.5) * 20,
        },
        quality: {
          score: Math.random() * 30 + 70,
          trend: Math.random() > 0.5 ? 'up' : 'stable',
          metrics: {
            testCoverage: Math.random() * 30 + 70,
            bugRate: Math.random() * 5 + 1,
            codeReviewRate: Math.random() * 20 + 80,
          },
        },
        performance: {
          cycleTime: Math.random() * 3 + 2,
          leadTime: Math.random() * 5 + 3,
          throughput: Math.random() * 20 + 10,
          trend: Math.random() > 0.5 ? 'up' : 'stable',
        },
        teamActivity: {
          activeMembers: this.users.size,
          commitsPerDay: Math.random() * 20 + 10,
          pullRequestsPerDay: Math.random() * 10 + 5,
          collaborationScore: Math.random() * 30 + 70,
        },
      },
      charts: {
        velocityChart: generateChartData(30),
        burndownChart: generateBurndownData(30),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  public getNotifications(userId: string, options: any = {}): { notifications: Notification[]; unreadCount: number; totalCount: number; pagination: PaginationInfo } {
    const userNotifications = this.notifications.get(userId) || [];
    let filteredNotifications = [...userNotifications];

    if (options.unreadOnly) {
      filteredNotifications = filteredNotifications.filter(n => !n.read);
    }

    if (options.type) {
      filteredNotifications = filteredNotifications.filter(n => n.type === options.type);
    }

    const limit = options.limit || 20;
    const page = options.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    return {
      notifications: paginatedNotifications,
      unreadCount: userNotifications.filter(n => !n.read).length,
      totalCount: filteredNotifications.length,
      pagination: {
        page,
        limit,
        total: filteredNotifications.length,
        totalPages: Math.ceil(filteredNotifications.length / limit),
        hasNext: endIndex < filteredNotifications.length,
        hasPrevious: page > 1,
      },
    };
  }

  public markNotificationRead(notificationId: string, userId: string): boolean {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public searchDashboard(query: string, userId: string, options: any = {}): { results: SearchResult[]; totalResults: number; searchTime: number; pagination: PaginationInfo } {
    const searchStart = Date.now();
    const results: SearchResult[] = [];

    // Search projects
    if (!options.type || options.type === 'all' || options.type === 'projects') {
      this.projects.forEach(project => {
        if (project.name.toLowerCase().includes(query.toLowerCase()) || 
            project.description.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: project.id,
            type: 'project',
            title: project.name,
            description: project.description,
            url: `/projects/${project.id}`,
            relevanceScore: Math.random() * 0.5 + 0.5,
            highlightedText: project.name,
            metadata: {
              status: project.status,
              createdAt: project.createdAt,
              updatedAt: project.updatedAt,
            },
          });
        }
      });
    }

    // Search tasks
    if (!options.type || options.type === 'all' || options.type === 'tasks') {
      this.tasks.forEach(task => {
        if (task.title.toLowerCase().includes(query.toLowerCase()) || 
            task.description.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            description: task.description,
            url: `/tasks/${task.id}`,
            relevanceScore: Math.random() * 0.5 + 0.5,
            highlightedText: task.title,
            metadata: {
              project: task.project?.name,
              status: task.status,
              createdAt: task.createdAt,
              updatedAt: task.updatedAt,
            },
          });
        }
      });
    }

    // Search users
    if (!options.type || options.type === 'all' || options.type === 'users') {
      Array.from(this.users.values()).forEach(user => {
        if (user.name.toLowerCase().includes(query.toLowerCase()) || 
            user.email.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            id: user.id,
            type: 'user',
            title: user.name,
            description: user.email,
            url: `/users/${user.id}`,
            relevanceScore: Math.random() * 0.5 + 0.5,
            highlightedText: user.name,
            metadata: {
              status: user.status,
              createdAt: user.createdAt,
            },
          });
        }
      });
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const limit = options.limit || 20;
    const page = options.page || 1;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      results: paginatedResults,
      totalResults: results.length,
      searchTime: Date.now() - searchStart,
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit),
        hasNext: endIndex < results.length,
        hasPrevious: page > 1,
      },
    };
  }

  public getUserPreferences(userId: string): UserPreferences | undefined {
    return this.preferences.get(userId);
  }

  public updateUserPreferences(userId: string, updates: Partial<UserPreferences>): UserPreferences | undefined {
    const current = this.preferences.get(userId);
    if (!current) return undefined;

    const updated = { ...current, ...updates };
    this.preferences.set(userId, updated);
    return updated;
  }

  public getDashboardWidgets(userId: string): Widget[] {
    return this.widgets.get(userId) || [];
  }

  public addDashboardWidget(userId: string, widgetData: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'>): Widget {
    const widget: Widget = {
      ...widgetData,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userWidgets = this.widgets.get(userId) || [];
    userWidgets.push(widget);
    this.widgets.set(userId, userWidgets);

    return widget;
  }

  public updateDashboardWidget(widgetId: string, userId: string, updates: Partial<Widget>): Widget | undefined {
    const userWidgets = this.widgets.get(userId) || [];
    const widgetIndex = userWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetIndex === -1) return undefined;

    const updatedWidget = {
      ...userWidgets[widgetIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    userWidgets[widgetIndex] = updatedWidget;
    this.widgets.set(userId, userWidgets);

    return updatedWidget;
  }

  public removeDashboardWidget(widgetId: string, userId: string): boolean {
    const userWidgets = this.widgets.get(userId) || [];
    const widgetIndex = userWidgets.findIndex(w => w.id === widgetId);
    
    if (widgetIndex === -1) return false;

    userWidgets.splice(widgetIndex, 1);
    this.widgets.set(userId, userWidgets);

    return true;
  }

  public getRealtimeStatus(userId: string): RealtimeStatus {
    return {
      connected: true,
      activeConnections: Math.floor(Math.random() * 50) + 10,
      userSession: {
        id: randomUUID(),
        connectedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        lastActivity: new Date().toISOString(),
        rooms: ['dashboard', 'notifications', `user-${userId}`],
      },
      server: {
        uptime: Math.random() * 86400 + 3600,
        totalConnections: Math.floor(Math.random() * 1000) + 100,
        messagesSent: Math.floor(Math.random() * 10000) + 1000,
        messagesReceived: Math.floor(Math.random() * 5000) + 500,
      },
    };
  }

  public getHealthStatus(): HealthStatus {
    const isHealthy = Math.random() > 0.1;
    const isDegraded = Math.random() > 0.7;

    return {
      status: isHealthy ? (isDegraded ? 'degraded' : 'healthy') : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      dependencies: {
        redis: isHealthy ? 'healthy' : 'degraded',
        database: isHealthy ? 'healthy' : 'degraded',
        apiGateway: isHealthy ? 'healthy' : 'degraded',
        backendServices: {
          projectService: isHealthy ? 'healthy' : 'degraded',
          taskService: isHealthy ? 'healthy' : 'degraded',
          aiService: isHealthy ? 'healthy' : 'degraded',
        },
      },
      uptime: Math.random() * 86400 + 3600,
      metrics: {
        activeConnections: Math.floor(Math.random() * 100) + 10,
        totalRequests: Math.floor(Math.random() * 100000) + 10000,
        averageResponseTime: Math.random() * 200 + 50,
      },
    };
  }
}