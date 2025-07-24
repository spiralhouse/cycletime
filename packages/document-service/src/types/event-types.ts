export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  version: string;
  correlationId?: string;
  metadata?: EventMetadata;
}

export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  projectId?: string;
  requestId?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface DocumentCreatedEvent extends BaseEvent {
  eventType: 'document.created';
  payload: {
    documentId: string;
    title: string;
    type: string;
    size: number;
    author: {
      id: string;
      name: string;
      email: string;
    };
    status: string;
    tags: string[];
    permissions: {
      public: boolean;
      readers: string[];
      writers: string[];
      admins: string[];
    };
  };
}

export interface DocumentUpdatedEvent extends BaseEvent {
  eventType: 'document.updated';
  payload: {
    documentId: string;
    title: string;
    previousVersion: string;
    newVersion: string;
    changes: Array<{
      field: string;
      oldValue: string;
      newValue: string;
    }>;
    updatedBy: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface DocumentDeletedEvent extends BaseEvent {
  eventType: 'document.deleted';
  payload: {
    documentId: string;
    title: string;
    type: string;
    size: number;
    deletedBy: {
      id: string;
      name: string;
      email: string;
    };
    permanent: boolean;
    retentionPeriod?: number;
  };
}

export interface DocumentVersionCreatedEvent extends BaseEvent {
  eventType: 'document.version.created';
  payload: {
    documentId: string;
    versionId: string;
    version: string;
    comment?: string;
    size: number;
    previousVersion?: string;
    changes: Array<{
      type: 'added' | 'removed' | 'modified';
      path: string;
      description: string;
    }>;
    createdBy: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface DocumentSharedEvent extends BaseEvent {
  eventType: 'document.shared';
  payload: {
    documentId: string;
    shareId: string;
    sharedBy: {
      id: string;
      name: string;
      email: string;
    };
    sharedWith: Array<{
      userId?: string;
      groupId?: string;
      permissions: string[];
    }>;
    permissions: string[];
    expiresAt?: Date;
    message?: string;
  };
}

export interface DocumentIndexedEvent extends BaseEvent {
  eventType: 'document.indexed';
  payload: {
    documentId: string;
    title: string;
    type: string;
    indexingStatus: 'indexed' | 'updated' | 'failed' | 'removed';
    indexingTime: number;
    extractedFields?: {
      text?: string;
      title?: string;
      keywords?: string[];
      entities?: string[];
      language?: string;
      pageCount?: number;
      wordCount?: number;
    };
    searchableFields?: string[];
    error?: string;
  };
}

export interface DocumentProcessedEvent extends BaseEvent {
  eventType: 'document.processed';
  payload: {
    documentId: string;
    processingType: 'text-extraction' | 'thumbnail-generation' | 'format-conversion' | 'virus-scan' | 'indexing';
    status: 'completed' | 'failed' | 'partial';
    processingTime: number;
    results?: {
      extractedText?: string;
      pageCount?: number;
      wordCount?: number;
      language?: string;
      thumbnailGenerated?: boolean;
      formatConverted?: boolean;
      virusScanResult?: 'clean' | 'infected' | 'failed';
      indexingResult?: 'indexed' | 'failed' | 'partial';
    };
    errors?: Array<{
      type: string;
      message: string;
      details?: Record<string, unknown>;
    }>;
  };
}

export interface DocumentUploadedEvent extends BaseEvent {
  eventType: 'document.uploaded';
  payload: {
    documentId: string;
    filename: string;
    originalName: string;
    type: string;
    mimeType: string;
    size: number;
    checksum: string;
    storageLocation: string;
    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
    uploadTime: number;
    virusScanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  };
}

export interface DocumentDownloadedEvent extends BaseEvent {
  eventType: 'document.downloaded';
  payload: {
    documentId: string;
    title: string;
    type: string;
    size: number;
    version: string;
    downloadedBy: {
      id: string;
      name: string;
      email: string;
    };
    downloadFormat: string;
    downloadMethod: 'direct' | 'link' | 'api';
    downloadTime: number;
  };
}

export interface DocumentCommentedEvent extends BaseEvent {
  eventType: 'document.commented';
  payload: {
    documentId: string;
    commentId: string;
    content: string;
    author: {
      id: string;
      name: string;
      email: string;
    };
    position?: {
      page?: number;
      x?: number;
      y?: number;
      selection?: string;
    };
    parentId?: string;
    threadLength: number;
  };
}

export interface DocumentVirusDetectedEvent extends BaseEvent {
  eventType: 'document.virus.detected';
  payload: {
    documentId: string;
    filename: string;
    size: number;
    uploadedBy: {
      id: string;
      name: string;
      email: string;
    };
    scanResult: {
      engine: string;
      virusName: string;
      threatLevel: 'low' | 'medium' | 'high' | 'critical';
      scanTime: Date;
    };
    actions: Array<'quarantined' | 'deleted' | 'blocked' | 'reported'>;
    notificationsSent: string[];
  };
}

export type DocumentEvent = 
  | DocumentCreatedEvent
  | DocumentUpdatedEvent
  | DocumentDeletedEvent
  | DocumentVersionCreatedEvent
  | DocumentSharedEvent
  | DocumentIndexedEvent
  | DocumentProcessedEvent
  | DocumentUploadedEvent
  | DocumentDownloadedEvent
  | DocumentCommentedEvent
  | DocumentVirusDetectedEvent;