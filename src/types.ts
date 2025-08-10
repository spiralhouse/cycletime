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
  initialize(): Promise<void>;
  createSession(projectPath: string): Promise<Session>;
  getActiveSession(): Promise<Session | null>;
  updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
  addTask(sessionId: string, task: Omit<TaskItem, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>): Promise<TaskItem>;
  getTasks(sessionId: string): Promise<TaskItem[]>;
  updateTask(taskId: string, updates: Partial<TaskItem>): Promise<void>;
}