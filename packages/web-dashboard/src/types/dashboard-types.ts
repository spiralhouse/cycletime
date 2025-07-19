export interface DashboardOverview {
  summary: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    teamMembers: number;
  };
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
  performanceMetrics: {
    velocityTrend: 'up' | 'down' | 'stable';
    completionRate: number;
    averageCycleTime: number;
  };
  generatedAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'task_created' | 'task_completed' | 'project_updated' | 'user_joined' | 'comment_added';
  title: string;
  description: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  relatedItem?: {
    type: 'project' | 'task' | 'user';
    id: string;
    name: string;
  };
}

export interface DeadlineItem {
  id: string;
  type: 'task' | 'project' | 'milestone';
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'planned';
  progress: number;
  tasksCount: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
  };
  teamMembers: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
  }>;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardAnalytics {
  timeframe: string;
  metrics: {
    velocity: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      change: number;
    };
    quality: {
      score: number;
      trend: 'up' | 'down' | 'stable';
      metrics: {
        testCoverage: number;
        bugRate: number;
        codeReviewRate: number;
      };
    };
    performance: {
      cycleTime: number;
      leadTime: number;
      throughput: number;
      trend: 'up' | 'down' | 'stable';
    };
    teamActivity: {
      activeMembers: number;
      commitsPerDay: number;
      pullRequestsPerDay: number;
      collaborationScore: number;
    };
  };
  charts: {
    velocityChart: Array<{
      date: string;
      value: number;
    }>;
    burndownChart: Array<{
      date: string;
      remaining: number;
      completed: number;
    }>;
  };
  generatedAt: string;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'project_updated' | 'mention' | 'system';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  readAt?: string;
  relatedItem?: {
    type: 'project' | 'task' | 'user' | 'comment';
    id: string;
    name: string;
  };
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'developer' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastActive: string;
  timezone: string;
  language: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    taskAssigned: boolean;
    projectUpdates: boolean;
    mentions: boolean;
  };
  dashboard: {
    defaultView: 'overview' | 'projects' | 'tasks' | 'analytics';
    showWelcomeCard: boolean;
    refreshInterval: number;
    compactMode: boolean;
  };
  display: {
    language: string;
    timezone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
  };
}

export interface Widget {
  id: string;
  type: 'tasks' | 'projects' | 'analytics' | 'notifications' | 'calendar' | 'weather' | 'notes';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: {
    refreshInterval: number;
    showHeader: boolean;
    theme: 'light' | 'dark' | 'auto';
    filters?: Record<string, any>;
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'user' | 'document';
  title: string;
  description: string;
  url: string;
  relevanceScore: number;
  highlightedText?: string;
  metadata?: {
    project?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

export interface RealtimeStatus {
  connected: boolean;
  activeConnections: number;
  userSession: {
    id: string;
    connectedAt: string;
    lastActivity: string;
    rooms: string[];
  };
  server: {
    uptime: number;
    totalConnections: number;
    messagesSent: number;
    messagesReceived: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  dependencies: {
    redis: 'healthy' | 'degraded' | 'unhealthy';
    database: 'healthy' | 'degraded' | 'unhealthy';
    apiGateway: 'healthy' | 'degraded' | 'unhealthy';
    backendServices: {
      projectService: 'healthy' | 'degraded' | 'unhealthy';
      taskService: 'healthy' | 'degraded' | 'unhealthy';
      aiService: 'healthy' | 'degraded' | 'unhealthy';
    };
  };
  uptime: number;
  metrics: {
    activeConnections: number;
    totalRequests: number;
    averageResponseTime: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  preferences: UserPreferences;
  lastLogin: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DashboardServiceError {
  error: string;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  details?: Record<string, any>;
  requestId: string;
}