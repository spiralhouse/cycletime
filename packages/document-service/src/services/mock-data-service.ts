import { v4 as uuidv4 } from 'uuid';
import { 
  Document, 
  DocumentType, 
  DocumentStatus, 
  DocumentVersion, 
  DocumentComment, 
  DocumentMetadata, 
  DocumentAuthor,
  DocumentPermissions,
  DocumentStatistics,
  CommentStatus,
  ProcessingStatus,
  ProcessingResult,
  ProcessingType,
  UploadResult,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  SearchRequest,
  SearchResponse,
  SearchResult
} from '../types';
import { logger } from '../utils/logger';

export class MockDataService {
  private documents: Map<string, Document> = new Map();
  private versions: Map<string, DocumentVersion[]> = new Map();
  private comments: Map<string, DocumentComment[]> = new Map();
  private metadata: Map<string, DocumentMetadata> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Create some sample documents
    const sampleDocuments = [
      {
        title: 'Project Requirements Document',
        type: DocumentType.DOCX,
        description: 'Comprehensive requirements document for the new project',
        tags: ['requirements', 'project', 'planning'],
        status: DocumentStatus.PUBLISHED
      },
      {
        title: 'Technical Architecture Guide',
        type: DocumentType.PDF,
        description: 'System architecture and design patterns',
        tags: ['architecture', 'technical', 'design'],
        status: DocumentStatus.PUBLISHED
      },
      {
        title: 'API Documentation',
        type: DocumentType.MD,
        description: 'REST API documentation with examples',
        tags: ['api', 'documentation', 'rest'],
        status: DocumentStatus.PUBLISHED
      },
      {
        title: 'User Manual Draft',
        type: DocumentType.PDF,
        description: 'Draft version of the user manual',
        tags: ['manual', 'user', 'documentation'],
        status: DocumentStatus.DRAFT
      },
      {
        title: 'Meeting Notes',
        type: DocumentType.TXT,
        description: 'Weekly team meeting notes',
        tags: ['meeting', 'notes', 'team'],
        status: DocumentStatus.PUBLISHED
      }
    ];

    sampleDocuments.forEach(doc => {
      const document = this.createMockDocument(doc);
      this.documents.set(document.id, document);
      this.createMockVersions(document.id);
      this.createMockComments(document.id);
      this.createMockMetadata(document.id);
    });

    logger.info('Mock data initialized', { documentCount: this.documents.size });
  }

  private createMockDocument(partial: Partial<Document>): Document {
    const id = uuidv4();
    const now = new Date();
    
    return {
      id,
      title: partial.title || 'Untitled Document',
      description: partial.description || 'No description provided',
      type: partial.type || DocumentType.PDF,
      mimeType: this.getMimeType(partial.type || DocumentType.PDF),
      size: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
      status: partial.status || DocumentStatus.DRAFT,
      version: '1.0.0',
      checksum: this.generateChecksum(),
      tags: partial.tags || [],
      metadata: partial.metadata || {},
      storageLocation: `documents/${id}`,
      author: this.createMockAuthor(),
      permissions: this.createMockPermissions(),
      statistics: this.createMockStatistics(),
      createdAt: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      updatedAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
      deletedAt: partial.status === DocumentStatus.DELETED ? new Date() : undefined
    };
  }

  private createMockAuthor(): DocumentAuthor {
    const authors = [
      { name: 'John Doe', email: 'john.doe@example.com' },
      { name: 'Jane Smith', email: 'jane.smith@example.com' },
      { name: 'Bob Johnson', email: 'bob.johnson@example.com' },
      { name: 'Alice Brown', email: 'alice.brown@example.com' }
    ];
    
    const author = authors[Math.floor(Math.random() * authors.length)];
    return {
      id: uuidv4(),
      ...author
    };
  }

  private createMockPermissions(): DocumentPermissions {
    return {
      public: Math.random() > 0.7,
      readers: this.generateUserIds(2, 5),
      writers: this.generateUserIds(1, 3),
      admins: this.generateUserIds(1, 2)
    };
  }

  private createMockStatistics(): DocumentStatistics {
    return {
      viewCount: Math.floor(Math.random() * 1000),
      downloadCount: Math.floor(Math.random() * 100),
      commentCount: Math.floor(Math.random() * 20),
      lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    };
  }

  private createMockVersions(documentId: string): void {
    const versionCount = Math.floor(Math.random() * 5) + 1;
    const versions: DocumentVersion[] = [];

    for (let i = 0; i < versionCount; i++) {
      const version: DocumentVersion = {
        id: `v${i + 1}`,
        version: `1.${i}.0`,
        comment: `Version ${i + 1} - ${this.getRandomComment()}`,
        size: Math.floor(Math.random() * 1000000) + 50000,
        checksum: this.generateChecksum(),
        author: this.createMockAuthor(),
        changes: this.generateMockChanges(),
        createdAt: new Date(Date.now() - (versionCount - i) * 24 * 60 * 60 * 1000)
      };
      versions.push(version);
    }

    this.versions.set(documentId, versions);
  }

  private createMockComments(documentId: string): void {
    const commentCount = Math.floor(Math.random() * 10);
    const comments: DocumentComment[] = [];

    for (let i = 0; i < commentCount; i++) {
      const comment: DocumentComment = {
        id: uuidv4(),
        content: this.getRandomCommentContent(),
        author: this.createMockAuthor(),
        position: Math.random() > 0.5 ? {
          page: Math.floor(Math.random() * 10) + 1,
          x: Math.random() * 100,
          y: Math.random() * 100,
          selection: 'Selected text example'
        } : undefined,
        thread: this.generateMockThread(),
        status: Math.random() > 0.2 ? CommentStatus.ACTIVE : CommentStatus.RESOLVED,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
      comments.push(comment);
    }

    this.comments.set(documentId, comments);
  }

  private createMockMetadata(documentId: string): void {
    const metadata: DocumentMetadata = {
      documentId,
      metadata: {
        category: 'technical',
        priority: 'high',
        confidentiality: 'internal',
        department: 'engineering',
        project: 'cycletime'
      },
      systemMetadata: {
        extractedText: 'This is mock extracted text content from the document...',
        language: 'en',
        pageCount: Math.floor(Math.random() * 50) + 1,
        wordCount: Math.floor(Math.random() * 10000) + 500,
        readingTime: Math.floor(Math.random() * 30) + 5,
        lastIndexed: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        processingStatus: ProcessingStatus.COMPLETED
      },
      analytics: {
        viewCount: Math.floor(Math.random() * 500),
        downloadCount: Math.floor(Math.random() * 50),
        shareCount: Math.floor(Math.random() * 10),
        commentCount: Math.floor(Math.random() * 15),
        lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        topViewers: this.generateTopViewers()
      }
    };

    this.metadata.set(documentId, metadata);
  }

  private generateUserIds(min: number, max: number): string[] {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const ids: string[] = [];
    
    for (let i = 0; i < count; i++) {
      ids.push(uuidv4());
    }
    
    return ids;
  }

  private generateMockChanges() {
    const changes = [
      { type: 'added' as const, path: '/content/section1', description: 'Added new section' },
      { type: 'modified' as const, path: '/title', description: 'Updated title' },
      { type: 'removed' as const, path: '/content/deprecated', description: 'Removed deprecated content' }
    ];

    return changes.slice(0, Math.floor(Math.random() * 3) + 1);
  }

  private generateMockThread() {
    const threadLength = Math.floor(Math.random() * 3);
    const thread = [];

    for (let i = 0; i < threadLength; i++) {
      thread.push({
        id: uuidv4(),
        content: this.getRandomCommentContent(),
        author: this.createMockAuthor(),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
      });
    }

    return thread;
  }

  private generateTopViewers() {
    const viewerCount = Math.floor(Math.random() * 5) + 1;
    const viewers = [];

    for (let i = 0; i < viewerCount; i++) {
      viewers.push({
        userId: uuidv4(),
        viewCount: Math.floor(Math.random() * 50) + 1,
        lastViewed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    return viewers.sort((a, b) => b.viewCount - a.viewCount);
  }

  private getMimeType(type: DocumentType): string {
    const mimeTypes = {
      [DocumentType.PDF]: 'application/pdf',
      [DocumentType.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [DocumentType.TXT]: 'text/plain',
      [DocumentType.MD]: 'text/markdown',
      [DocumentType.JSON]: 'application/json',
      [DocumentType.XML]: 'application/xml',
      [DocumentType.HTML]: 'text/html',
      [DocumentType.CSV]: 'text/csv',
      [DocumentType.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [DocumentType.PPTX]: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [DocumentType.IMAGE]: 'image/jpeg'
    };

    return mimeTypes[type] || 'application/octet-stream';
  }

  private generateChecksum(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private getRandomComment(): string {
    const comments = [
      'Updated content based on feedback',
      'Added new sections',
      'Fixed typos and formatting',
      'Incorporated review comments',
      'Updated with latest requirements'
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  private getRandomCommentContent(): string {
    const contents = [
      'This section needs more detail about the implementation.',
      'Great work on this analysis! Very thorough.',
      'Could we add some examples here?',
      'I think we should revise this approach.',
      'This looks good to me. Ready for approval.',
      'Please clarify the requirements in this section.',
      'The formatting looks off in this paragraph.',
      'Excellent documentation. Very clear and comprehensive.'
    ];
    return contents[Math.floor(Math.random() * contents.length)];
  }

  // Public methods for the document service

  createDocument(request: CreateDocumentRequest, authorId: string): Document {
    const document = this.createMockDocument({
      title: request.title,
      description: request.description,
      type: request.type,
      tags: request.tags,
      metadata: request.metadata,
      status: request.status
    });

    document.author.id = authorId;
    this.documents.set(document.id, document);
    this.createMockVersions(document.id);
    this.createMockComments(document.id);
    this.createMockMetadata(document.id);

    return document;
  }

  getDocument(documentId: string): Document | null {
    return this.documents.get(documentId) || null;
  }

  updateDocument(documentId: string, request: UpdateDocumentRequest, userId: string): Document | null {
    const document = this.documents.get(documentId);
    if (!document) return null;

    // Update document fields
    if (request.title) document.title = request.title;
    if (request.description !== undefined) document.description = request.description;
    if (request.tags) document.tags = request.tags;
    if (request.metadata) document.metadata = { ...document.metadata, ...request.metadata };
    if (request.status) document.status = request.status;

    // Update version and timestamp
    const versionParts = document.version.split('.');
    versionParts[1] = (parseInt(versionParts[1]) + 1).toString();
    document.version = versionParts.join('.');
    document.updatedAt = new Date();

    this.documents.set(documentId, document);
    return document;
  }

  deleteDocument(documentId: string, userId: string, permanent: boolean): boolean {
    const document = this.documents.get(documentId);
    if (!document) return false;

    if (permanent) {
      this.documents.delete(documentId);
      this.versions.delete(documentId);
      this.comments.delete(documentId);
      this.metadata.delete(documentId);
    } else {
      document.status = DocumentStatus.DELETED;
      document.deletedAt = new Date();
      this.documents.set(documentId, document);
    }

    return true;
  }

  listDocuments(
    filters: Record<string, any> = {},
    pagination: { page: number; limit: number }
  ): { documents: Document[]; total: number } {
    let documents = Array.from(this.documents.values());

    // Apply filters
    if (filters.type) {
      documents = documents.filter(doc => doc.type === filters.type);
    }
    if (filters.status) {
      documents = documents.filter(doc => doc.status === filters.status);
    }
    if (filters.tag) {
      documents = documents.filter(doc => doc.tags.includes(filters.tag));
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      documents = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.description?.toLowerCase().includes(searchTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';
    
    documents.sort((a, b) => {
      let aValue = a[sortBy as keyof Document];
      let bValue = b[sortBy as keyof Document];

      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const total = documents.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedDocuments = documents.slice(start, end);

    return {
      documents: paginatedDocuments,
      total
    };
  }

  searchDocuments(request: SearchRequest): SearchResponse {
    const { query, filters, pagination = { page: 1, limit: 20 } } = request;
    
    let documents = Array.from(this.documents.values());

    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase();
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.description?.toLowerCase().includes(searchTerm) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (filters?.type) {
      documents = documents.filter(doc => filters.type!.includes(doc.type));
    }
    if (filters?.status) {
      documents = documents.filter(doc => filters.status!.includes(doc.status));
    }
    if (filters?.tags) {
      documents = documents.filter(doc => 
        doc.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    // Create search results with mock scores
    const results: SearchResult[] = documents.map(doc => ({
      document: doc,
      score: Math.random() * 100,
      highlights: query ? {
        title: [`Mock highlighted ${query} in title`],
        content: [`Mock highlighted ${query} in content`]
      } : undefined
    }));

    // Sort by relevance score
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const total = results.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedResults = results.slice(start, end);

    return {
      query,
      results: paginatedResults,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: end < total,
        hasPrevious: start > 0
      },
      facets: this.generateFacets(documents),
      statistics: {
        totalDocuments: this.documents.size,
        searchTime: Math.random() * 500 + 50,
        maxScore: Math.max(...results.map(r => r.score))
      }
    };
  }

  private generateFacets(documents: Document[]) {
    const facets: Record<string, Array<{ value: string; count: number }>> = {};

    // Type facets
    const typeCounts = new Map<string, number>();
    documents.forEach(doc => {
      typeCounts.set(doc.type, (typeCounts.get(doc.type) || 0) + 1);
    });
    facets.types = Array.from(typeCounts.entries()).map(([value, count]) => ({ value, count }));

    // Status facets
    const statusCounts = new Map<string, number>();
    documents.forEach(doc => {
      statusCounts.set(doc.status, (statusCounts.get(doc.status) || 0) + 1);
    });
    facets.statuses = Array.from(statusCounts.entries()).map(([value, count]) => ({ value, count }));

    // Tag facets
    const tagCounts = new Map<string, number>();
    documents.forEach(doc => {
      doc.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    facets.tags = Array.from(tagCounts.entries()).map(([value, count]) => ({ value, count }));

    return facets;
  }

  uploadDocument(
    fileBuffer: Buffer,
    filename: string,
    metadata: Record<string, any>,
    userId: string
  ): UploadResult {
    const documentId = uuidv4();
    const checksum = this.generateChecksum();
    const storageLocation = `uploads/${documentId}/${filename}`;

    return {
      documentId,
      filename,
      originalName: filename,
      size: fileBuffer.length,
      checksum,
      storageLocation,
      processingStatus: ProcessingStatus.PENDING
    };
  }

  downloadDocument(
    documentId: string,
    version?: string,
    format?: string
  ): { buffer: Buffer; filename: string; mimeType: string } | null {
    const document = this.documents.get(documentId);
    if (!document) return null;

    // Mock file content
    const content = `Mock content for document: ${document.title}`;
    const buffer = Buffer.from(content);

    return {
      buffer,
      filename: `${document.title}.${format || 'pdf'}`,
      mimeType: this.getMimeType(document.type)
    };
  }

  createDocumentVersion(
    documentId: string,
    comment: string,
    content: string,
    userId: string
  ): DocumentVersion | null {
    const document = this.documents.get(documentId);
    if (!document) return null;

    const versions = this.versions.get(documentId) || [];
    const versionNumber = versions.length + 1;
    
    const version: DocumentVersion = {
      id: `v${versionNumber}`,
      version: `1.${versionNumber}.0`,
      comment,
      size: content.length,
      checksum: this.generateChecksum(),
      author: {
        id: userId,
        name: 'Mock User',
        email: 'mock@example.com'
      },
      changes: this.generateMockChanges(),
      createdAt: new Date()
    };

    versions.push(version);
    this.versions.set(documentId, versions);

    return version;
  }

  getDocumentVersions(
    documentId: string,
    pagination: { page: number; limit: number }
  ): { versions: DocumentVersion[]; total: number } {
    const versions = this.versions.get(documentId) || [];
    const total = versions.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedVersions = versions.slice(start, end);

    return {
      versions: paginatedVersions,
      total
    };
  }

  compareDocumentVersions(
    documentId: string,
    fromVersion: string,
    toVersion: string
  ): any {
    return {
      fromVersion,
      toVersion,
      format: 'unified',
      changes: [
        {
          type: 'added',
          lineNumber: 10,
          content: '+ New line added in version 2',
          previousContent: null
        },
        {
          type: 'modified',
          lineNumber: 15,
          content: '~ Modified line in version 2',
          previousContent: 'Original line in version 1'
        },
        {
          type: 'removed',
          lineNumber: 20,
          content: '- Removed line from version 1',
          previousContent: 'Line that was removed'
        }
      ],
      summary: {
        linesAdded: 5,
        linesRemoved: 2,
        linesModified: 3,
        similarityScore: 0.85
      },
      diff: '@@ -12,7 +12,7 @@\n line 1\n line 2\n-old line\n+new line\n line 4'
    };
  }

  shareDocument(
    documentId: string,
    sharedWith: string[],
    permissions: string[],
    userId: string
  ): { shareId: string; shareLink: string } {
    const shareId = uuidv4();
    const shareLink = `https://app.cycletime.dev/documents/${documentId}/share/${shareId}`;

    return {
      shareId,
      shareLink
    };
  }

  addDocumentComment(
    documentId: string,
    content: string,
    position: any,
    userId: string,
    parentId?: string
  ): DocumentComment | null {
    const document = this.documents.get(documentId);
    if (!document) return null;

    const comments = this.comments.get(documentId) || [];
    
    const comment: DocumentComment = {
      id: uuidv4(),
      content,
      author: {
        id: userId,
        name: 'Mock User',
        email: 'mock@example.com'
      },
      position,
      thread: [],
      status: CommentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    comments.push(comment);
    this.comments.set(documentId, comments);

    return comment;
  }

  getDocumentComments(
    documentId: string,
    pagination: { page: number; limit: number }
  ): { comments: DocumentComment[]; total: number } {
    const comments = this.comments.get(documentId) || [];
    const total = comments.length;
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    const paginatedComments = comments.slice(start, end);

    return {
      comments: paginatedComments,
      total
    };
  }

  getDocumentMetadata(documentId: string): DocumentMetadata | null {
    return this.metadata.get(documentId) || null;
  }

  updateDocumentMetadata(
    documentId: string,
    metadata: Record<string, any>,
    userId: string
  ): DocumentMetadata | null {
    const existing = this.metadata.get(documentId);
    if (!existing) return null;

    existing.metadata = { ...existing.metadata, ...metadata };
    this.metadata.set(documentId, existing);

    return existing;
  }

  processDocument(documentId: string, processingType: string): ProcessingResult {
    const document = this.documents.get(documentId);
    const processingTime = Math.random() * 5000 + 1000; // 1-6 seconds

    return {
      documentId,
      processingType: processingType as ProcessingType,
      status: ProcessingStatus.COMPLETED,
      processingTime,
      results: {
        extractedText: 'Mock extracted text from document processing',
        pageCount: 15,
        wordCount: 2500,
        language: 'en',
        thumbnailGenerated: true,
        formatConverted: false,
        virusScanResult: 'clean',
        indexingResult: 'indexed'
      }
    };
  }

  getTotalDocuments(): number {
    return this.documents.size;
  }

  getTotalStorageUsed(): number {
    return Array.from(this.documents.values())
      .reduce((total, doc) => total + doc.size, 0);
  }
}