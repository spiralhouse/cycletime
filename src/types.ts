/**
 * Core JCVD Types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  source: string;
  context?: Record<string, unknown>;
}

export interface ProjectConfig {
  name: string;
  description?: string;
  version?: string;
  type?: 'node' | 'web' | 'library' | 'other';
}

export interface Session {
  id: string;
  projectPath: string;
  startTime: Date;
  lastActivity: Date;
  status: 'active' | 'completed' | 'abandoned';
}

export interface TaskItem {
  id: string;
  sessionId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface StoreInterface {
  initialize: () => Promise<void>;
  createSession: (_projectPath: string) => Promise<Session>;
  getActiveSession: () => Promise<Session | null>;
  updateSession: (_sessionId: string, _updates: Partial<Session>) => Promise<void>;
  addTask: (
    _sessionId: string,
    _task: Omit<TaskItem, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>
  ) => Promise<TaskItem>;
  getTasks: (_sessionId: string) => Promise<TaskItem[]>;
  updateTask: (_taskId: string, _updates: Partial<TaskItem>) => Promise<void>;
}
