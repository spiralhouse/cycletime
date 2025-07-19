export interface ServiceConfig {
  port: number;
  host: string;
  nodeEnv: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpiration: string;
    refreshTokenExpiration: string;
  };
  services: {
    apiGateway: string;
    projectService: string;
    taskService: string;
    aiService: string;
    documentService: string;
    issueTrackerService: string;
  };
  websocket: {
    enabled: boolean;
    path: string;
    transports: string[];
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  logging: {
    level: string;
    format: string;
    timestamp: boolean;
    colorize: boolean;
  };
  rateLimiting: {
    windowMs: number;
    max: number;
    standardHeaders: boolean;
    legacyHeaders: boolean;
  };
  staticFiles: {
    enabled: boolean;
    root: string;
    prefix: string;
    decorateReply: boolean;
  };
  views: {
    engine: string;
    templates: string;
    options: {
      partials: string;
      layout: string;
      defaultLayout: string;
    };
  };
}

export interface ServiceDependency {
  name: string;
  url: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  responseTime?: number;
  error?: string;
}

export interface ServiceMetrics {
  uptime: number;
  requestCount: number;
  responseTimeAvg: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

export interface DashboardServiceInterface {
  // Authentication
  login(credentials: { email: string; password: string; rememberMe?: boolean }): Promise<any>;
  logout(token: string): Promise<any>;
  refreshToken(refreshToken: string): Promise<any>;
  getUserProfile(userId: string): Promise<any>;

  // Dashboard Data
  getDashboardOverview(userId: string, timeframe?: string, projectId?: string): Promise<any>;
  getProjectsSummary(userId: string, options?: any): Promise<any>;
  getTasksSummary(userId: string, options?: any): Promise<any>;
  getDashboardAnalytics(userId: string, options?: any): Promise<any>;

  // Notifications
  getNotifications(userId: string, options?: any): Promise<any>;
  markNotificationRead(notificationId: string, userId: string): Promise<any>;

  // Search
  searchDashboard(query: string, userId: string, options?: any): Promise<any>;

  // Preferences
  getUserPreferences(userId: string): Promise<any>;
  updateUserPreferences(userId: string, preferences: any): Promise<any>;

  // Widgets
  getDashboardWidgets(userId: string): Promise<any>;
  addDashboardWidget(userId: string, widget: any): Promise<any>;
  updateDashboardWidget(widgetId: string, userId: string, updates: any): Promise<any>;
  removeDashboardWidget(widgetId: string, userId: string): Promise<any>;

  // Real-time
  getRealtimeStatus(userId: string): Promise<any>;

  // Health
  getHealthStatus(): Promise<any>;
}

export interface WebSocketConnection {
  id: string;
  userId: string;
  sessionId: string;
  socket: any;
  connectedAt: string;
  lastActivity: string;
  rooms: string[];
  metadata: Record<string, any>;
}

export interface WebSocketManager {
  connections: Map<string, WebSocketConnection>;
  addConnection(connection: WebSocketConnection): void;
  removeConnection(connectionId: string): void;
  getConnection(connectionId: string): WebSocketConnection | undefined;
  getUserConnections(userId: string): WebSocketConnection[];
  broadcastToUser(userId: string, event: string, data: any): void;
  broadcastToRoom(room: string, event: string, data: any): void;
  broadcastToAll(event: string, data: any): void;
}

export interface ProxyConfig {
  services: Record<string, {
    baseUrl: string;
    timeout: number;
    retries: number;
    headers?: Record<string, string>;
  }>;
  defaultTimeout: number;
  defaultRetries: number;
  circuitBreaker: {
    enabled: boolean;
    threshold: number;
    timeout: number;
    resetTimeout: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: string;
  requestId: string;
  path: string;
  method: string;
  userAgent?: string;
  ip?: string;
}