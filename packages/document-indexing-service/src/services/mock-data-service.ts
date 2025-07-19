import { v4 as uuidv4 } from 'uuid';
import { logger } from '@cycletime/shared-utils';

export interface DocumentIndex {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'creating' | 'updating' | 'deleting';
  documentCount: number;
  vectorDimensions: number;
  embeddingModel: string;
  createdAt: Date;
  updatedAt: Date;
  settings: {
    chunkSize: number;
    chunkOverlap: number;
    similarityThreshold: number;
    enableHybridSearch: boolean;
    enableKeywordSearch: boolean;
  };
}

export interface IndexedDocument {
  id: string;
  indexId: string;
  documentId: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  embeddings: number[];
  chunks: DocumentChunk[];
  status: 'indexed' | 'indexing' | 'failed' | 'pending';
  indexedAt: Date;
  version: string;
  checksum: string;
  extractedText: string;
  language: string;
  wordCount: number;
  keywords: string[];
  entities: string[];
  summary: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  embeddings: number[];
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
  metadata: Record<string, any>;
  keywords: string[];
  entities: string[];
  relevanceScore: number;
}

export interface SearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  highlights: string[];
  chunks: DocumentChunk[];
  similarity: number;
  relevanceScore: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
}

export interface EmbeddingResult {
  id: string;
  text: string;
  embeddings: number[];
  model: string;
  dimensions: number;
  tokens: number;
  processingTime: number;
  createdAt: Date;
}

export interface IndexStatistics {
  totalDocuments: number;
  totalEmbeddings: number;
  totalChunks: number;
  averageIndexingTime: number;
  vectorDimensions: number;
  storageUsed: number;
  queryCount: number;
  averageQueryTime: number;
  successRate: number;
  errorRate: number;
  lastIndexed: Date;
  popularQueries: string[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  dependencies: {
    vectorDatabase: 'healthy' | 'degraded' | 'unhealthy';
    embeddingService: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    textProcessor: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    indexCount: number;
    totalDocuments: number;
    averageResponseTime: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

export function createMockDataService() {
  // Mock data initialization
  const indices: DocumentIndex[] = [
    {
      id: 'idx-001',
      name: 'project-documents',
      description: 'Main project documentation index',
      status: 'active',
      documentCount: 1247,
      vectorDimensions: 1536,
      embeddingModel: 'text-embedding-3-small',
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date(),
      settings: {
        chunkSize: 1000,
        chunkOverlap: 100,
        similarityThreshold: 0.7,
        enableHybridSearch: true,
        enableKeywordSearch: true,
      },
    },
    {
      id: 'idx-002',
      name: 'code-repository',
      description: 'Source code and technical documentation',
      status: 'active',
      documentCount: 3421,
      vectorDimensions: 1536,
      embeddingModel: 'text-embedding-3-small',
      createdAt: new Date('2024-01-20T14:30:00Z'),
      updatedAt: new Date(),
      settings: {
        chunkSize: 800,
        chunkOverlap: 80,
        similarityThreshold: 0.75,
        enableHybridSearch: true,
        enableKeywordSearch: true,
      },
    },
    {
      id: 'idx-003',
      name: 'research-papers',
      description: 'Academic and research documentation',
      status: 'updating',
      documentCount: 892,
      vectorDimensions: 1536,
      embeddingModel: 'text-embedding-3-small',
      createdAt: new Date('2024-02-01T09:15:00Z'),
      updatedAt: new Date(),
      settings: {
        chunkSize: 1200,
        chunkOverlap: 120,
        similarityThreshold: 0.8,
        enableHybridSearch: true,
        enableKeywordSearch: false,
      },
    },
  ];

  const documents: IndexedDocument[] = [
    {
      id: 'doc-001',
      indexId: 'idx-001',
      documentId: 'external-doc-001',
      title: 'API Documentation Overview',
      content: 'This document provides a comprehensive overview of the CycleTime API...',
      metadata: {
        author: 'John Doe',
        category: 'documentation',
        tags: ['api', 'overview', 'guide'],
        version: '1.0.0',
        lastModified: '2024-01-15T12:00:00Z',
      },
      embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      chunks: [
        {
          id: 'chunk-001',
          content: 'This document provides a comprehensive overview of the CycleTime API',
          embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
          startIndex: 0,
          endIndex: 65,
          chunkIndex: 0,
          metadata: { section: 'introduction' },
          keywords: ['api', 'overview', 'cycletime'],
          entities: ['CycleTime', 'API'],
          relevanceScore: 0.95,
        },
      ],
      status: 'indexed',
      indexedAt: new Date('2024-01-15T12:05:00Z'),
      version: '1.0.0',
      checksum: 'sha256:abc123def456',
      extractedText: 'This document provides a comprehensive overview of the CycleTime API...',
      language: 'en',
      wordCount: 1250,
      keywords: ['api', 'documentation', 'cycletime', 'overview'],
      entities: ['CycleTime', 'API', 'REST'],
      summary: 'Comprehensive API documentation for CycleTime platform',
    },
    {
      id: 'doc-002',
      indexId: 'idx-002',
      documentId: 'external-doc-002',
      title: 'TypeScript Best Practices',
      content: 'This guide covers TypeScript best practices for enterprise applications...',
      metadata: {
        author: 'Jane Smith',
        category: 'guide',
        tags: ['typescript', 'best-practices', 'enterprise'],
        version: '2.1.0',
        lastModified: '2024-01-20T16:30:00Z',
      },
      embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      chunks: [
        {
          id: 'chunk-002',
          content: 'This guide covers TypeScript best practices for enterprise applications',
          embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
          startIndex: 0,
          endIndex: 68,
          chunkIndex: 0,
          metadata: { section: 'introduction' },
          keywords: ['typescript', 'best-practices', 'enterprise'],
          entities: ['TypeScript'],
          relevanceScore: 0.92,
        },
      ],
      status: 'indexed',
      indexedAt: new Date('2024-01-20T16:35:00Z'),
      version: '2.1.0',
      checksum: 'sha256:def456ghi789',
      extractedText: 'This guide covers TypeScript best practices for enterprise applications...',
      language: 'en',
      wordCount: 2100,
      keywords: ['typescript', 'best-practices', 'enterprise', 'guide'],
      entities: ['TypeScript', 'JavaScript'],
      summary: 'Best practices guide for TypeScript in enterprise development',
    },
  ];

  const embeddings: EmbeddingResult[] = [
    {
      id: 'emb-001',
      text: 'Document indexing with vector embeddings',
      embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      model: 'text-embedding-3-small',
      dimensions: 1536,
      tokens: 6,
      processingTime: 150,
      createdAt: new Date(),
    },
    {
      id: 'emb-002',
      text: 'Semantic search capabilities',
      embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
      model: 'text-embedding-3-small',
      dimensions: 1536,
      tokens: 4,
      processingTime: 120,
      createdAt: new Date(),
    },
  ];

  const statistics: IndexStatistics = {
    totalDocuments: 5560,
    totalEmbeddings: 8934,
    totalChunks: 23412,
    averageIndexingTime: 2.3,
    vectorDimensions: 1536,
    storageUsed: 1.2e9, // 1.2 GB
    queryCount: 12890,
    averageQueryTime: 0.15,
    successRate: 0.987,
    errorRate: 0.013,
    lastIndexed: new Date(),
    popularQueries: [
      'API documentation',
      'TypeScript best practices',
      'vector embeddings',
      'semantic search',
      'document indexing',
    ],
  };

  return {
    // Index management
    getIndices: () => indices,
    getIndex: (id: string) => indices.find(i => i.id === id),
    createIndex: (data: Partial<DocumentIndex>) => {
      const index: DocumentIndex = {
        id: uuidv4(),
        name: data.name || 'New Index',
        description: data.description || '',
        status: 'creating',
        documentCount: 0,
        vectorDimensions: data.vectorDimensions || 1536,
        embeddingModel: data.embeddingModel || 'text-embedding-3-small',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          chunkSize: 1000,
          chunkOverlap: 100,
          similarityThreshold: 0.7,
          enableHybridSearch: true,
          enableKeywordSearch: true,
          ...(data.settings || {}),
        },
      };
      indices.push(index);
      
      // Simulate async creation
      setTimeout(() => {
        index.status = 'active';
        index.updatedAt = new Date();
      }, 2000);
      
      return index;
    },
    updateIndex: (id: string, data: Partial<DocumentIndex>) => {
      const index = indices.find(i => i.id === id);
      if (index) {
        Object.assign(index, data, { updatedAt: new Date() });
        return index;
      }
      return null;
    },
    deleteIndex: (id: string) => {
      const index = indices.findIndex(i => i.id === id);
      if (index !== -1) {
        indices[index].status = 'deleting';
        setTimeout(() => {
          indices.splice(index, 1);
        }, 1000);
        return true;
      }
      return false;
    },

    // Document management
    getDocuments: (indexId?: string) => {
      return indexId ? documents.filter(d => d.indexId === indexId) : documents;
    },
    getDocument: (id: string) => documents.find(d => d.id === id),
    addDocument: (data: Partial<IndexedDocument>) => {
      const doc: IndexedDocument = {
        id: uuidv4(),
        indexId: data.indexId || 'idx-001',
        documentId: data.documentId || uuidv4(),
        title: data.title || 'Untitled Document',
        content: data.content || '',
        metadata: data.metadata || {},
        embeddings: data.embeddings || Array(1536).fill(0).map(() => Math.random() * 2 - 1),
        chunks: data.chunks || [],
        status: 'indexing',
        indexedAt: new Date(),
        version: data.version || '1.0.0',
        checksum: `sha256:${Math.random().toString(36).substring(2, 15)}`,
        extractedText: data.extractedText || data.content || '',
        language: data.language || 'en',
        wordCount: data.wordCount || (data.content || '').split(' ').length,
        keywords: data.keywords || [],
        entities: data.entities || [],
        summary: data.summary || '',
      };
      documents.push(doc);
      
      // Simulate async indexing
      setTimeout(() => {
        doc.status = 'indexed';
        const index = indices.find(i => i.id === doc.indexId);
        if (index) {
          index.documentCount++;
          index.updatedAt = new Date();
        }
      }, 1500);
      
      return doc;
    },
    updateDocument: (id: string, data: Partial<IndexedDocument>) => {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        Object.assign(doc, data, { indexedAt: new Date() });
        return doc;
      }
      return null;
    },
    deleteDocument: (id: string) => {
      const docIndex = documents.findIndex(d => d.id === id);
      if (docIndex !== -1) {
        const doc = documents[docIndex];
        const index = indices.find(i => i.id === doc.indexId);
        if (index) {
          index.documentCount--;
          index.updatedAt = new Date();
        }
        documents.splice(docIndex, 1);
        return true;
      }
      return false;
    },

    // Search functionality
    searchDocuments: (query: string, options: {
      indexId?: string;
      limit?: number;
      threshold?: number;
      searchType?: 'semantic' | 'keyword' | 'hybrid';
    } = {}) => {
      const { indexId, limit = 10, threshold = 0.7, searchType = 'semantic' } = options;
      
      let filteredDocs = documents;
      if (indexId) {
        filteredDocs = documents.filter(d => d.indexId === indexId);
      }
      
      // Mock search results based on query
      const results: SearchResult[] = filteredDocs
        .map(doc => ({
          id: doc.id,
          documentId: doc.documentId,
          title: doc.title,
          content: doc.content,
          metadata: doc.metadata,
          score: Math.random() * 0.3 + 0.7, // Random score between 0.7-1.0
          highlights: [`...${query}...`],
          chunks: doc.chunks,
          similarity: Math.random() * 0.3 + 0.7,
          relevanceScore: Math.random() * 0.3 + 0.7,
          matchType: searchType,
        }))
        .filter(result => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      return {
        query,
        results,
        total: results.length,
        searchType,
        processingTime: Math.random() * 0.1 + 0.05, // 50-150ms
      };
    },

    // Embedding functionality
    getEmbeddings: () => embeddings,
    getEmbedding: (id: string) => embeddings.find(e => e.id === id),
    createEmbedding: (text: string, model: string = 'text-embedding-3-small') => {
      const embedding: EmbeddingResult = {
        id: uuidv4(),
        text,
        embeddings: Array(1536).fill(0).map(() => Math.random() * 2 - 1),
        model,
        dimensions: 1536,
        tokens: text.split(' ').length,
        processingTime: Math.random() * 200 + 100,
        createdAt: new Date(),
      };
      embeddings.push(embedding);
      return embedding;
    },
    compareEmbeddings: (embedding1: number[], embedding2: number[]) => {
      // Cosine similarity calculation
      const dotProduct = embedding1.reduce((sum, a, i) => sum + a * embedding2[i], 0);
      const norm1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
      const norm2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));
      return dotProduct / (norm1 * norm2);
    },

    // Statistics and analytics
    getStatistics: () => statistics,
    getIndexStatistics: (indexId: string) => {
      const index = indices.find(i => i.id === indexId);
      if (!index) return null;
      
      return {
        ...statistics,
        totalDocuments: index.documentCount,
        indexName: index.name,
        lastUpdated: index.updatedAt,
      };
    },

    // Health status
    getHealthStatus: (): HealthStatus => {
      const totalDocs = documents.length;
      const activeIndices = indices.filter(i => i.status === 'active').length;
      
      return {
        status: activeIndices > 0 ? 'healthy' : 'degraded',
        timestamp: new Date(),
        version: '1.0.0',
        dependencies: {
          vectorDatabase: 'healthy',
          embeddingService: 'healthy',
          redis: 'healthy',
          textProcessor: 'healthy',
        },
        metrics: {
          indexCount: indices.length,
          totalDocuments: totalDocs,
          averageResponseTime: 0.15,
          memoryUsage: 0.75,
          diskUsage: 0.45,
        },
      };
    },

    // Utility functions
    generateMockEmbedding: (dimensions: number = 1536) => {
      return Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
    },
    
    calculateSimilarity: (query: string, document: IndexedDocument) => {
      // Simple mock similarity based on common words
      const queryWords = query.toLowerCase().split(' ');
      const docWords = document.content.toLowerCase().split(' ');
      const commonWords = queryWords.filter(word => docWords.includes(word));
      return commonWords.length / Math.max(queryWords.length, docWords.length);
    },
  };
}