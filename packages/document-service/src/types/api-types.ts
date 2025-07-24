import { Document, DocumentComment, DocumentVersion, DocumentMetadata, SearchResult } from './document-types';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
  timestamp: Date;
  path?: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  dependencies: {
    storage: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    documentIndexing: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    documentsCount: number;
    storageUsed: number;
    averageResponseTime: number;
  };
}

export interface DocumentResponse {
  document: Document;
  content?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters?: {
    type?: string;
    status?: string;
    tag?: string;
    author?: string;
    search?: string;
  };
  facets?: {
    types: Array<{ value: string; count: number }>;
    statuses: Array<{ value: string; count: number }>;
    tags: Array<{ value: string; count: number }>;
  };
}

export interface DocumentVersionResponse {
  version: DocumentVersion;
  content?: string;
}

export interface DocumentVersionListResponse {
  versions: DocumentVersion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface VersionComparisonResponse {
  fromVersion: string;
  toVersion: string;
  format: string;
  changes: Array<{
    type: 'added' | 'removed' | 'modified';
    lineNumber: number;
    content: string;
    previousContent?: string;
  }>;
  summary: {
    linesAdded: number;
    linesRemoved: number;
    linesModified: number;
    similarityScore: number;
  };
  diff: string;
}

export interface ShareResponse {
  shareId: string;
  shareLink: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
}

export interface DocumentPermissionsResponse {
  documentId: string;
  public: boolean;
  permissions: Array<{
    userId?: string;
    groupId?: string;
    permissions: string[];
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date;
  }>;
  inheritedPermissions?: Array<{
    source: 'folder' | 'workspace' | 'organization';
    permissions: string[];
  }>;
  effectivePermissions?: {
    currentUser: string[];
  };
}

export interface DocumentCommentResponse {
  comment: DocumentComment;
}

export interface DocumentCommentsResponse {
  comments: DocumentComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// SearchResponse is exported from document-types.ts to avoid duplicate exports

export interface DocumentMetadataResponse {
  documentId: string;
  metadata: Record<string, unknown>;
  systemMetadata: {
    extractedText?: string;
    language?: string;
    pageCount?: number;
    wordCount?: number;
    readingTime?: number;
    lastIndexed?: Date;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
  analytics: {
    viewCount: number;
    downloadCount: number;
    shareCount: number;
    commentCount: number;
    lastAccessed?: Date;
    topViewers: Array<{
      userId: string;
      viewCount: number;
      lastViewed: Date;
    }>;
  };
}

export interface DocumentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  tag?: string;
  author?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentVersionQuery {
  page?: number;
  limit?: number;
}

export interface DocumentCommentsQuery {
  page?: number;
  limit?: number;
}

export interface DocumentDownloadQuery {
  version?: string;
  format?: 'pdf' | 'docx' | 'txt' | 'html' | 'json';
}

export interface DocumentContentQuery {
  version?: string;
}

export interface DocumentQuery {
  includeContent?: boolean;
}