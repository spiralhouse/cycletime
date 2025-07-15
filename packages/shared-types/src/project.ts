/**
 * Project and document types
 */

import { BaseEntity, BaseEntityWithSoftDelete } from './common';

/**
 * Project entity
 */
export interface Project extends BaseEntityWithSoftDelete {
  name: string;
  description?: string;
  ownerId: string;
  githubRepositoryUrl?: string;
  githubRepositoryId?: number;
  linearProjectId?: string;
  settings: ProjectSettings;
  isActive: boolean;
}

/**
 * Project settings
 */
export interface ProjectSettings {
  aiProvider?: string;
  aiModel?: string;
  enableGithubIntegration: boolean;
  enableLinearIntegration: boolean;
  enableDocumentGeneration: boolean;
  webhookUrl?: string;
  notifications: {
    email: boolean;
    slack: boolean;
    discord: boolean;
  };
}

/**
 * Document entity
 */
export interface Document extends BaseEntityWithSoftDelete {
  projectId: string;
  userId: string;
  title: string;
  content: string;
  type: DocumentType;
  format: DocumentFormat;
  metadata: DocumentMetadata;
  version: number;
  isPublished: boolean;
  tags: string[];
}

/**
 * Document types
 */
export enum DocumentType {
  PRD = 'PRD',
  TECHNICAL_SPEC = 'TECHNICAL_SPEC',
  API_DOCS = 'API_DOCS',
  USER_GUIDE = 'USER_GUIDE',
  CHANGELOG = 'CHANGELOG',
  README = 'README',
  NOTES = 'NOTES',
  MEETING_NOTES = 'MEETING_NOTES',
  REQUIREMENTS = 'REQUIREMENTS',
  ARCHITECTURE = 'ARCHITECTURE'
}

/**
 * Document formats
 */
export enum DocumentFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  TEXT = 'text',
  JSON = 'json'
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  wordCount?: number;
  estimatedReadingTime?: number;
  lastEditedBy?: string;
  source?: 'manual' | 'ai_generated' | 'imported';
  aiGenerationPrompt?: string;
  linkedIssues?: string[];
  linkedPullRequests?: string[];
  reviewers?: string[];
  approvalStatus?: 'draft' | 'review' | 'approved' | 'rejected';
}

/**
 * Document version history
 */
export interface DocumentVersion extends BaseEntity {
  documentId: string;
  version: number;
  title: string;
  content: string;
  changeLog?: string;
  editedBy: string;
  metadata: DocumentMetadata;
}

/**
 * Task entity (for Linear/GitHub integration)
 */
export interface Task extends BaseEntity {
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  reporterId: string;
  labels: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: Date | string;
  linearIssueId?: string;
  githubIssueId?: number;
  githubPullRequestId?: number;
  metadata: {
    linearUrl?: string;
    githubUrl?: string;
    externalReferences?: string[];
  };
}

/**
 * Task status
 */
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

/**
 * Task priority
 */
export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

/**
 * Integration webhook payload
 */
export interface WebhookPayload {
  event: string;
  source: 'github' | 'linear';
  projectId: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}