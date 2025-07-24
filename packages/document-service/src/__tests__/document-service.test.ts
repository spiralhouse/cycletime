import { describe, it, expect, beforeEach } from '@jest/globals';
import { DocumentService } from '../services/document-service';
import { StorageService } from '../services/storage-service';
import { EventService } from '../services/event-service';
import { MockDataService } from '../services/mock-data-service';
import { DocumentType, DocumentStatus } from '../types';

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockStorageService: StorageService;
  let mockEventService: EventService;
  let mockDataService: MockDataService;

  beforeEach(() => {
    // Create mock services
    mockStorageService = {
      uploadFile: jest.fn(),
      downloadFile: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      getFileInfo: jest.fn(),
      listFiles: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    mockEventService = {
      publishDocumentCreated: jest.fn(),
      publishDocumentUpdated: jest.fn(),
      publishDocumentDeleted: jest.fn(),
      publishDocumentUploaded: jest.fn(),
      publishDocumentDownloaded: jest.fn(),
      publishDocumentVersionCreated: jest.fn(),
      publishDocumentShared: jest.fn(),
      publishDocumentCommented: jest.fn(),
      publishDocumentSearchPerformed: jest.fn(),
      publishDocumentMetadataUpdated: jest.fn(),
      publishDocumentProcessed: jest.fn(),
      publishDocumentIndexed: jest.fn(),
      publishDocumentVersionsCompared: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    mockDataService = new MockDataService();
    documentService = new DocumentService(
      mockStorageService,
      mockEventService,
      mockDataService
    );
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const request = {
        title: 'Test Document',
        description: 'Test description',
        type: DocumentType.PDF,
        tags: ['test', 'document'],
        metadata: { category: 'test' }
      };

      const result = await documentService.createDocument(request, 'user-123');

      expect(result).toBeDefined();
      expect(result.title).toBe(request.title);
      expect(result.description).toBe(request.description);
      expect(result.type).toBe(request.type);
      expect(result.tags).toEqual(request.tags);
      expect(result.author.id).toBe('user-123');
      expect(mockEventService.publishDocumentCreated).toHaveBeenCalledWith(result);
    });

    it('should create a document with default status', async () => {
      const request = {
        title: 'Test Document',
        type: DocumentType.PDF
      };

      const result = await documentService.createDocument(request, 'user-123');

      expect(result.status).toBe(DocumentStatus.DRAFT);
    });
  });

  describe('getDocument', () => {
    it('should retrieve an existing document', async () => {
      const document = await documentService.createDocument({
        title: 'Test Document',
        type: DocumentType.PDF
      }, 'user-123');

      const result = await documentService.getDocument(document.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(document.id);
      expect(result?.title).toBe(document.title);
    });

    it('should return null for non-existent document', async () => {
      const result = await documentService.getDocument('non-existent-id');

      expect(result).toBeNull();
    });

    it('should include content when requested', async () => {
      const document = await documentService.createDocument({
        title: 'Test Document',
        type: DocumentType.PDF
      }, 'user-123');

      const result = await documentService.getDocument(document.id, true);

      expect(result).toBeDefined();
      expect((result as any).content).toBeDefined();
    });
  });

  describe('updateDocument', () => {
    it('should update an existing document', async () => {
      const document = await documentService.createDocument({
        title: 'Original Title',
        type: DocumentType.PDF
      }, 'user-123');

      const updateRequest = {
        title: 'Updated Title',
        description: 'Updated description',
        status: DocumentStatus.PUBLISHED
      };

      const result = await documentService.updateDocument(
        document.id,
        updateRequest,
        'user-123'
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe(updateRequest.title);
      expect(result?.description).toBe(updateRequest.description);
      expect(result?.status).toBe(updateRequest.status);
      expect(mockEventService.publishDocumentUpdated).toHaveBeenCalledWith(
        result,
        'user-123'
      );
    });

    it('should return null for non-existent document', async () => {
      const result = await documentService.updateDocument(
        'non-existent-id',
        { title: 'Updated Title' },
        'user-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete a document by default', async () => {
      const document = await documentService.createDocument({
        title: 'Test Document',
        type: DocumentType.PDF
      }, 'user-123');

      const result = await documentService.deleteDocument(
        document.id,
        'user-123',
        false
      );

      expect(result).toBe(true);
      expect(mockEventService.publishDocumentDeleted).toHaveBeenCalledWith(
        document.id,
        'user-123',
        false
      );
    });

    it('should permanently delete a document when requested', async () => {
      const document = await documentService.createDocument({
        title: 'Test Document',
        type: DocumentType.PDF
      }, 'user-123');

      const result = await documentService.deleteDocument(
        document.id,
        'user-123',
        true
      );

      expect(result).toBe(true);
      expect(mockEventService.publishDocumentDeleted).toHaveBeenCalledWith(
        document.id,
        'user-123',
        true
      );
    });

    it('should return false for non-existent document', async () => {
      const result = await documentService.deleteDocument(
        'non-existent-id',
        'user-123'
      );

      expect(result).toBe(false);
    });
  });

  describe('listDocuments', () => {
    beforeEach(async () => {
      // Create some test documents
      await documentService.createDocument({
        title: 'PDF Document',
        type: DocumentType.PDF,
        tags: ['pdf', 'test']
      }, 'user-123');

      await documentService.createDocument({
        title: 'Word Document',
        type: DocumentType.DOCX,
        tags: ['docx', 'test']
      }, 'user-123');

      await documentService.createDocument({
        title: 'Text Document',
        type: DocumentType.TXT,
        tags: ['txt', 'test']
      }, 'user-123');
    });

    it('should list all documents', async () => {
      const result = await documentService.listDocuments();

      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter documents by type', async () => {
      const result = await documentService.listDocuments(
        { type: DocumentType.PDF },
        { page: 1, limit: 20 }
      );

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach(doc => {
        expect(doc.type).toBe(DocumentType.PDF);
      });
    });

    it('should filter documents by search term', async () => {
      const result = await documentService.listDocuments(
        { search: 'PDF' },
        { page: 1, limit: 20 }
      );

      expect(result.documents.length).toBeGreaterThan(0);
      result.documents.forEach(doc => {
        expect(doc.title.toLowerCase()).toContain('pdf');
      });
    });

    it('should apply pagination', async () => {
      const result = await documentService.listDocuments(
        {},
        { page: 1, limit: 2 }
      );

      expect(result.documents.length).toBeLessThanOrEqual(2);
    });
  });

  describe('searchDocuments', () => {
    it('should search documents by query', async () => {
      const request = {
        query: 'test',
        pagination: { page: 1, limit: 10 }
      };

      const result = await documentService.searchDocuments(request);

      expect(result).toBeDefined();
      expect(result.query).toBe(request.query);
      expect(result.results).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(mockEventService.publishDocumentSearchPerformed).toHaveBeenCalledWith(
        request,
        result.results.length
      );
    });

    it('should apply filters in search', async () => {
      const request = {
        query: 'test',
        filters: {
          type: [DocumentType.PDF],
          status: [DocumentStatus.PUBLISHED]
        }
      };

      const result = await documentService.searchDocuments(request);

      expect(result).toBeDefined();
      expect(result.query).toBe(request.query);
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document', async () => {
      const fileBuffer = Buffer.from('test file content');
      const filename = 'test.pdf';
      const metadata = { category: 'test' };

      const result = await documentService.uploadDocument(
        fileBuffer,
        filename,
        metadata,
        'user-123'
      );

      expect(result).toBeDefined();
      expect(result.filename).toBe(filename);
      expect(result.size).toBe(fileBuffer.length);
      expect(mockEventService.publishDocumentUploaded).toHaveBeenCalledWith(
        result,
        'user-123'
      );
    });
  });

  describe('downloadDocument', () => {
    it('should download a document', async () => {
      const document = await documentService.createDocument({
        title: 'Test Document',
        type: DocumentType.PDF
      }, 'user-123');

      const result = await documentService.downloadDocument(
        document.id,
        'user-123'
      );

      expect(result).toBeDefined();
      expect(result?.buffer).toBeDefined();
      expect(result?.filename).toBeDefined();
      expect(result?.mimeType).toBeDefined();
      expect(mockEventService.publishDocumentDownloaded).toHaveBeenCalledWith(
        document,
        'user-123',
        'original'
      );
    });

    it('should return null for non-existent document', async () => {
      const result = await documentService.downloadDocument(
        'non-existent-id',
        'user-123'
      );

      expect(result).toBeNull();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const result = await documentService.getHealthStatus();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });
});