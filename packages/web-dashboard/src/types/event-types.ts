export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  version: string;
}

export interface UserConnectedEvent extends BaseEvent {
  type: 'user.connected';
  payload: {
    userId: string;
    sessionId: string;
    username: string;
    avatar?: string;
    connectedAt: string;
    clientInfo: {
      userAgent: string;
      ip: string;
      location?: string;
    };
  };
}

export interface UserDisconnectedEvent extends BaseEvent {
  type: 'user.disconnected';
  payload: {
    userId: string;
    sessionId: string;
    username: string;
    disconnectedAt: string;
    duration: number;
    reason: 'logout' | 'timeout' | 'network_error' | 'server_shutdown';
  };
}

export interface UserPresenceEvent extends BaseEvent {
  type: 'user.presence';
  payload: {
    userId: string;
    username: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen: string;
    currentView: 'dashboard' | 'project' | 'task' | 'settings';
    activity?: string;
  };
}

export interface DashboardDataUpdatedEvent extends BaseEvent {
  type: 'dashboard.data.updated';
  payload: {
    dataType: 'overview' | 'projects' | 'tasks' | 'analytics' | 'notifications';
    updateType: 'full' | 'partial' | 'incremental';
    updatedAt: string;
    affectedUsers: string[];
    changes: {
      added: any[];
      updated: any[];
      removed: any[];
    };
    metadata: {
      source: 'user_action' | 'system_update' | 'scheduled_refresh';
      reason?: string;
    };
  };
}

export interface DashboardViewChangedEvent extends BaseEvent {
  type: 'dashboard.view.changed';
  payload: {
    userId: string;
    sessionId: string;
    previousView: 'overview' | 'projects' | 'tasks' | 'analytics' | 'settings';
    currentView: 'overview' | 'projects' | 'tasks' | 'analytics' | 'settings';
    changedAt: string;
    filters?: Record<string, any>;
    parameters?: Record<string, any>;
  };
}

export interface DashboardWidgetUpdatedEvent extends BaseEvent {
  type: 'dashboard.widget.updated';
  payload: {
    widgetId: string;
    userId: string;
    action: 'added' | 'updated' | 'removed' | 'moved' | 'resized';
    widget: {
      type: 'tasks' | 'projects' | 'analytics' | 'notifications' | 'calendar';
      title: string;
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      config: Record<string, any>;
    };
    updatedAt: string;
  };
}

export interface NotificationSentEvent extends BaseEvent {
  type: 'dashboard.notification.sent';
  payload: {
    notificationId: string;
    userId: string;
    type: 'task_assigned' | 'task_completed' | 'project_updated' | 'mention' | 'system';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    sentAt: string;
    actionUrl?: string;
    relatedItem?: {
      type: 'project' | 'task' | 'user' | 'comment';
      id: string;
      name: string;
    };
    metadata?: Record<string, any>;
  };
}

export interface NotificationReadEvent extends BaseEvent {
  type: 'dashboard.notification.read';
  payload: {
    notificationId: string;
    userId: string;
    readAt: string;
    sessionId: string;
  };
}

export interface ProjectUpdatedEvent extends BaseEvent {
  type: 'project.updated';
  payload: {
    projectId: string;
    name: string;
    action: 'created' | 'updated' | 'deleted' | 'archived' | 'restored';
    changes: {
      fields: string[];
      previous: Record<string, any>;
      current: Record<string, any>;
    };
    updatedBy: {
      userId: string;
      username: string;
    };
    updatedAt: string;
    affectedUsers: string[];
  };
}

export interface TaskUpdatedEvent extends BaseEvent {
  type: 'task.updated';
  payload: {
    taskId: string;
    title: string;
    action: 'updated' | 'status_changed' | 'assigned' | 'priority_changed' | 'due_date_changed';
    changes: {
      fields: string[];
      previous: Record<string, any>;
      current: Record<string, any>;
    };
    updatedBy: {
      userId: string;
      username: string;
    };
    updatedAt: string;
    affectedUsers: string[];
    projectId: string;
    projectName: string;
  };
}

export interface CollaborationCursorEvent extends BaseEvent {
  type: 'collaboration.cursor';
  payload: {
    userId: string;
    username: string;
    documentId: string;
    cursor: {
      line: number;
      column: number;
      selection?: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
    };
    timestamp: string;
  };
}

export interface CollaborationTypingEvent extends BaseEvent {
  type: 'collaboration.typing';
  payload: {
    userId: string;
    username: string;
    documentId: string;
    typing: boolean;
    timestamp: string;
  };
}

export interface SystemMaintenanceEvent extends BaseEvent {
  type: 'system.maintenance';
  payload: {
    maintenanceId: string;
    type: 'scheduled' | 'emergency' | 'update' | 'deployment';
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
    scheduledStart: string;
    estimatedDuration: number;
    affectedServices: string[];
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    notifiedAt: string;
  };
}

export interface SystemErrorEvent extends BaseEvent {
  type: 'system.error';
  payload: {
    errorId: string;
    type: 'service_unavailable' | 'database_error' | 'network_error' | 'authentication_error';
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    service: string;
    timestamp: string;
    affectedUsers: string[];
    resolution?: {
      status: 'investigating' | 'identified' | 'fixing' | 'resolved';
      eta?: string;
      workaround?: string;
    };
  };
}

export interface AnalyticsUpdatedEvent extends BaseEvent {
  type: 'analytics.updated';
  payload: {
    dataType: 'velocity' | 'quality' | 'performance' | 'team_activity';
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
    updatedAt: string;
    affectedProjects: string[];
    affectedUsers: string[];
    summary: {
      totalRecords: number;
      changedRecords: number;
      newRecords: number;
    };
    source: 'real_time' | 'batch_processing' | 'manual_update';
  };
}

export type DashboardEvent =
  | UserConnectedEvent
  | UserDisconnectedEvent
  | UserPresenceEvent
  | DashboardDataUpdatedEvent
  | DashboardViewChangedEvent
  | DashboardWidgetUpdatedEvent
  | NotificationSentEvent
  | NotificationReadEvent
  | ProjectUpdatedEvent
  | TaskUpdatedEvent
  | CollaborationCursorEvent
  | CollaborationTypingEvent
  | SystemMaintenanceEvent
  | SystemErrorEvent
  | AnalyticsUpdatedEvent;