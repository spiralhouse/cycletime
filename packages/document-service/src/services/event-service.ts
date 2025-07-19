import { createClient, RedisClientType } from 'redis';
import { 
  Document, 
  DocumentEvent, 
  DocumentCreatedEvent, 
  DocumentUpdatedEvent, 
  DocumentDeletedEvent,
  DocumentVersionCreatedEvent,
  DocumentSharedEvent,
  DocumentIndexedEvent,
  DocumentProcessedEvent,
  DocumentUploadedEvent,
  DocumentDownloadedEvent,
  DocumentCommentedEvent,
  DocumentVersion,
  DocumentComment,
  ProcessingResult,
  UploadResult,
  SearchRequest,
  RedisConfig
} from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class EventService {
  private client: RedisClientType;
  private isConnected = false;

  constructor(config: RedisConfig) {
    this.client = createClient({
      url: `redis://${config.host}:${config.port}`,
      password: config.password,
      database: config.db || 0
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error });
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Connected to Redis');
    });

    this.client.on('disconnect', () => {
      this.isConnected = false;
      logger.warn('Disconnected from Redis');
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis client connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  private async publishEvent(channel: string, event: DocumentEvent): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping event publication', { channel, eventType: event.eventType });
      return;
    }

    try {
      const eventData = JSON.stringify(event);
      await this.client.publish(channel, eventData);
      
      logger.info('Event published successfully', { 
        channel, 
        eventType: event.eventType, 
        eventId: event.eventId 
      });
    } catch (error) {
      logger.error('Failed to publish event', { error, channel, eventType: event.eventType });
      throw error;
    }
  }

  private createBaseEvent(eventType: string, correlationId?: string): Partial<DocumentEvent> {
    return {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date(),
      source: 'document-service',
      version: '1.0.0',
      correlationId,
      metadata: {
        // These would be populated from request context in a real implementation
        userId: 'current-user-id',
        sessionId: 'current-session-id',
        projectId: 'current-project-id',
        requestId: 'current-request-id'
      }
    };
  }

  async publishDocumentCreated(document: Document, correlationId?: string): Promise<void> {
    const event: DocumentCreatedEvent = {
      ...this.createBaseEvent('document.created', correlationId),
      eventType: 'document.created',
      payload: {
        documentId: document.id,
        title: document.title,
        type: document.type,
        size: document.size,
        author: document.author,
        status: document.status,
        tags: document.tags,
        permissions: document.permissions
      }
    } as DocumentCreatedEvent;

    await this.publishEvent('documents/created', event);
  }

  async publishDocumentUpdated(document: Document, userId: string, correlationId?: string): Promise<void> {
    const event: DocumentUpdatedEvent = {
      ...this.createBaseEvent('document.updated', correlationId),
      eventType: 'document.updated',
      payload: {
        documentId: document.id,
        title: document.title,
        previousVersion: '1.0.0', // Mock previous version
        newVersion: document.version,
        changes: [
          {
            field: 'title',
            oldValue: 'Old Title',
            newValue: document.title
          }
        ],
        updatedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        }
      }
    } as DocumentUpdatedEvent;

    await this.publishEvent('documents/updated', event);
  }

  async publishDocumentDeleted(documentId: string, userId: string, permanent: boolean, correlationId?: string): Promise<void> {
    const event: DocumentDeletedEvent = {
      ...this.createBaseEvent('document.deleted', correlationId),
      eventType: 'document.deleted',
      payload: {
        documentId,
        title: 'Deleted Document',
        type: 'pdf',
        size: 1024,
        deletedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        permanent,
        retentionPeriod: permanent ? undefined : 30
      }
    } as DocumentDeletedEvent;

    await this.publishEvent('documents/deleted', event);
  }

  async publishDocumentVersionCreated(version: DocumentVersion, documentId: string, correlationId?: string): Promise<void> {
    const event: DocumentVersionCreatedEvent = {
      ...this.createBaseEvent('document.version.created', correlationId),
      eventType: 'document.version.created',
      payload: {
        documentId,
        versionId: version.id,
        version: version.version,
        comment: version.comment,
        size: version.size,
        previousVersion: '1.0.0',
        changes: version.changes,
        createdBy: version.author
      }
    } as DocumentVersionCreatedEvent;

    await this.publishEvent('documents/version/created', event);
  }

  async publishDocumentShared(
    documentId: string, 
    shareId: string, 
    sharedWith: string[], 
    permissions: string[], 
    userId: string,
    correlationId?: string
  ): Promise<void> {
    const event: DocumentSharedEvent = {
      ...this.createBaseEvent('document.shared', correlationId),
      eventType: 'document.shared',
      payload: {
        documentId,
        shareId,
        sharedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        sharedWith: sharedWith.map(id => ({ userId: id, permissions })),
        permissions,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        message: 'Document shared via API'
      }
    } as DocumentSharedEvent;

    await this.publishEvent('documents/shared', event);
  }

  async publishDocumentIndexed(
    documentId: string, 
    title: string, 
    type: string, 
    indexingStatus: 'indexed' | 'updated' | 'failed' | 'removed',
    correlationId?: string
  ): Promise<void> {
    const event: DocumentIndexedEvent = {
      ...this.createBaseEvent('document.indexed', correlationId),
      eventType: 'document.indexed',
      payload: {
        documentId,
        title,
        type,
        indexingStatus,
        indexingTime: 1500, // Mock indexing time
        extractedFields: {
          text: 'Mock extracted text content',
          title,
          keywords: ['mock', 'document', 'test'],
          entities: ['Organization', 'Person'],
          language: 'en',
          pageCount: 10,
          wordCount: 1000
        },
        searchableFields: ['title', 'content', 'tags', 'metadata']
      }
    } as DocumentIndexedEvent;

    await this.publishEvent('documents/indexed', event);
  }

  async publishDocumentProcessed(result: ProcessingResult, correlationId?: string): Promise<void> {
    const event: DocumentProcessedEvent = {
      ...this.createBaseEvent('document.processed', correlationId),
      eventType: 'document.processed',
      payload: {
        documentId: result.documentId,
        processingType: result.processingType,
        status: result.status,
        processingTime: result.processingTime,
        results: result.results,
        errors: result.errors
      }
    } as DocumentProcessedEvent;

    await this.publishEvent('documents/processed', event);
  }

  async publishDocumentUploaded(uploadResult: UploadResult, userId: string, correlationId?: string): Promise<void> {
    const event: DocumentUploadedEvent = {
      ...this.createBaseEvent('document.uploaded', correlationId),
      eventType: 'document.uploaded',
      payload: {
        documentId: uploadResult.documentId,
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        type: 'pdf', // Mock type
        mimeType: 'application/pdf',
        size: uploadResult.size,
        checksum: uploadResult.checksum,
        storageLocation: uploadResult.storageLocation,
        uploadedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        uploadTime: 2000, // Mock upload time
        virusScanStatus: 'pending'
      }
    } as DocumentUploadedEvent;

    await this.publishEvent('documents/uploaded', event);
  }

  async publishDocumentDownloaded(
    document: Document, 
    userId: string, 
    downloadFormat: string,
    correlationId?: string
  ): Promise<void> {
    const event: DocumentDownloadedEvent = {
      ...this.createBaseEvent('document.downloaded', correlationId),
      eventType: 'document.downloaded',
      payload: {
        documentId: document.id,
        title: document.title,
        type: document.type,
        size: document.size,
        version: document.version,
        downloadedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        downloadFormat,
        downloadMethod: 'api',
        downloadTime: 1000 // Mock download time
      }
    } as DocumentDownloadedEvent;

    await this.publishEvent('documents/downloaded', event);
  }

  async publishDocumentCommented(comment: DocumentComment, documentId: string, correlationId?: string): Promise<void> {
    const event: DocumentCommentedEvent = {
      ...this.createBaseEvent('document.commented', correlationId),
      eventType: 'document.commented',
      payload: {
        documentId,
        commentId: comment.id,
        content: comment.content,
        author: comment.author,
        position: comment.position,
        parentId: comment.thread.length > 0 ? comment.thread[0].id : undefined,
        threadLength: comment.thread.length + 1
      }
    } as DocumentCommentedEvent;

    await this.publishEvent('documents/commented', event);
  }

  async publishDocumentVersionsCompared(
    documentId: string, 
    fromVersion: string, 
    toVersion: string, 
    userId: string,
    correlationId?: string
  ): Promise<void> {
    const event = {
      ...this.createBaseEvent('document.versions.compared', correlationId),
      eventType: 'document.versions.compared',
      payload: {
        documentId,
        fromVersion,
        toVersion,
        comparedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        changesCount: 5,
        similarityScore: 0.85
      }
    };

    await this.publishEvent('documents/version/compared', event);
  }

  async publishDocumentSearchPerformed(
    request: SearchRequest, 
    resultCount: number,
    correlationId?: string
  ): Promise<void> {
    const event = {
      ...this.createBaseEvent('document.search.performed', correlationId),
      eventType: 'document.search.performed',
      payload: {
        query: request.query,
        filters: request.filters,
        resultCount,
        searchTime: 150, // Mock search time
        searchedBy: {
          id: 'current-user-id',
          name: 'Mock User',
          email: 'mock@example.com'
        },
        topResults: [], // Mock top results
        facetsUsed: request.facets || []
      }
    };

    await this.publishEvent('documents/search/performed', event);
  }

  async publishDocumentMetadataUpdated(
    documentId: string, 
    metadata: Record<string, any>, 
    userId: string,
    correlationId?: string
  ): Promise<void> {
    const event = {
      ...this.createBaseEvent('document.metadata.updated', correlationId),
      eventType: 'document.metadata.updated',
      payload: {
        documentId,
        updatedBy: {
          id: userId,
          name: 'Mock User',
          email: 'mock@example.com'
        },
        previousMetadata: {},
        newMetadata: metadata,
        changes: [
          {
            field: 'description',
            oldValue: 'Old description',
            newValue: 'New description',
            operation: 'updated'
          }
        ]
      }
    };

    await this.publishEvent('documents/metadata/updated', event);
  }

  async subscribe(channel: string, handler: (event: DocumentEvent) => void): Promise<void> {
    if (!this.isConnected) {
      logger.warn('Redis not connected, cannot subscribe to channel', { channel });
      return;
    }

    try {
      await this.client.subscribe(channel, (message) => {
        try {
          const event = JSON.parse(message) as DocumentEvent;
          handler(event);
          
          logger.info('Event received and processed', { 
            channel, 
            eventType: event.eventType, 
            eventId: event.eventId 
          });
        } catch (error) {
          logger.error('Failed to process received event', { error, channel, message });
        }
      });

      logger.info('Subscribed to channel', { channel });
    } catch (error) {
      logger.error('Failed to subscribe to channel', { error, channel });
      throw error;
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.unsubscribe(channel);
      logger.info('Unsubscribed from channel', { channel });
    } catch (error) {
      logger.error('Failed to unsubscribe from channel', { error, channel });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      logger.info('Redis client disconnected');
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      await this.client.ping();
      return { healthy: true };
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}