import { createMockDataService, IndexedDocument } from './mock-data-service';
import { createEventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

export interface IndexingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  generateEmbeddings?: boolean;
  embeddingModel?: string;
  extractKeywords?: boolean;
  extractEntities?: boolean;
  generateSummary?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export interface IndexingResult {
  documentId: string;
  indexId: string;
  status: 'success' | 'failed' | 'partial';
  processingTime: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  keywordsExtracted: number;
  entitiesExtracted: number;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface BulkIndexingResult {
  batchId: string;
  totalDocuments: number;
  successCount: number;
  failureCount: number;
  results: IndexingResult[];
  processingTime: number;
  errors?: string[];
}

export interface ReindexingOptions {
  forceReindex?: boolean;
  compareChecksums?: boolean;
  preserveMetadata?: boolean;
  updateEmbeddings?: boolean;
}

export function createIndexingService(
  mockDataService: ReturnType<typeof createMockDataService>,
  eventService: ReturnType<typeof createEventService>
) {
  const indexDocument = async (
    documentId: string,
    indexId: string,
    content: string,
    metadata: Record<string, any> = {},
    options: IndexingOptions = {}
  ): Promise<IndexingResult> => {
    const startTime = Date.now();
    
    try {
      logger.info('Starting document indexing', { documentId, indexId });
      
      // Validate index exists
      const index = mockDataService.getIndex(indexId);
      if (!index) {
        throw new Error(`Index ${indexId} not found`);
      }

      // Check if document already exists
      const existingDoc = mockDataService.getDocuments(indexId).find(d => d.documentId === documentId);
      if (existingDoc) {
        throw new Error(`Document ${documentId} already exists in index ${indexId}`);
      }

      // Process content into chunks
      const chunkSize = options.chunkSize || index.settings.chunkSize;
      const chunkOverlap = options.chunkOverlap || index.settings.chunkOverlap;
      const chunks = createChunks(content, chunkSize, chunkOverlap);
      
      // Generate embeddings if requested
      const embeddings = options.generateEmbeddings !== false ? 
        mockDataService.generateMockEmbedding(index.vectorDimensions) : [];
      
      // Extract keywords and entities (mock implementation)
      const keywords = options.extractKeywords !== false ? 
        extractKeywords(content) : [];
      const entities = options.extractEntities !== false ? 
        extractEntities(content) : [];
      
      // Generate summary (mock implementation)
      const summary = options.generateSummary !== false ? 
        generateSummary(content) : '';

      // Create document
      const document = mockDataService.addDocument({
        documentId,
        indexId,
        title: metadata.title || `Document ${documentId}`,
        content,
        metadata,
        embeddings,
        chunks,
        extractedText: content,
        keywords,
        entities,
        summary,
        language: metadata.language || 'en',
        wordCount: content.split(' ').length,
        version: metadata.version || '1.0.0',
      });

      const processingTime = Date.now() - startTime;
      
      const result: IndexingResult = {
        documentId,
        indexId,
        status: 'success',
        processingTime,
        chunksCreated: chunks.length,
        embeddingsGenerated: embeddings.length > 0 ? 1 : 0,
        keywordsExtracted: keywords.length,
        entitiesExtracted: entities.length,
        metadata: {
          documentId: document.id,
          checksum: document.checksum,
          version: document.version,
        },
      };

      // Publish event
      await eventService.publishDocumentIndexed(documentId, indexId, {
        result,
        options,
        processingTime,
      });

      logger.info('Document indexed successfully', { documentId, indexId, processingTime });
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const result: IndexingResult = {
        documentId,
        indexId,
        status: 'failed',
        processingTime,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        keywordsExtracted: 0,
        entitiesExtracted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };

      // Publish error event
      await eventService.publishIndexingError(documentId, {
        type: 'indexing_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'IDX_001',
      }, { indexId });

      logger.error('Document indexing failed', error as Error, { documentId, indexId });
      
      return result;
    }
  };

  const reindexDocument = async (
    documentId: string,
    indexId: string,
    newContent?: string,
    metadata: Record<string, any> = {},
    options: ReindexingOptions = {}
  ): Promise<IndexingResult> => {
    const startTime = Date.now();
    
    try {
      logger.info('Starting document reindexing', { documentId, indexId });
      
      // Find existing document
      const existingDoc = mockDataService.getDocuments(indexId).find(d => d.documentId === documentId);
      if (!existingDoc) {
        throw new Error(`Document ${documentId} not found in index ${indexId}`);
      }

      // Check if reindexing is needed
      const content = newContent || existingDoc.content;
      const newChecksum = `sha256:${Math.random().toString(36).substring(2, 15)}`;
      
      if (!options.forceReindex && options.compareChecksums && existingDoc.checksum === newChecksum) {
        logger.info('Document unchanged, skipping reindexing', { documentId, indexId });
        return {
          documentId,
          indexId,
          status: 'success',
          processingTime: Date.now() - startTime,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          keywordsExtracted: 0,
          entitiesExtracted: 0,
          metadata: { skipped: true, reason: 'no_changes' },
        };
      }

      // Get index settings
      const index = mockDataService.getIndex(indexId)!;
      
      // Reprocess content
      const chunks = createChunks(content, index.settings.chunkSize, index.settings.chunkOverlap);
      const embeddings = options.updateEmbeddings !== false ? 
        mockDataService.generateMockEmbedding(index.vectorDimensions) : existingDoc.embeddings;
      
      const keywords = extractKeywords(content);
      const entities = extractEntities(content);
      const summary = generateSummary(content);

      // Update document
      const updatedDoc = mockDataService.updateDocument(existingDoc.id, {
        content,
        metadata: options.preserveMetadata ? { ...existingDoc.metadata, ...metadata } : metadata,
        embeddings,
        chunks,
        keywords,
        entities,
        summary,
        checksum: newChecksum,
        version: metadata.version || incrementVersion(existingDoc.version),
        wordCount: content.split(' ').length,
      });

      const processingTime = Date.now() - startTime;
      
      const result: IndexingResult = {
        documentId,
        indexId,
        status: 'success',
        processingTime,
        chunksCreated: chunks.length,
        embeddingsGenerated: options.updateEmbeddings !== false ? 1 : 0,
        keywordsExtracted: keywords.length,
        entitiesExtracted: entities.length,
        metadata: {
          documentId: updatedDoc!.id,
          checksum: updatedDoc!.checksum,
          version: updatedDoc!.version,
          previousVersion: existingDoc.version,
        },
      };

      // Publish event
      await eventService.publishDocumentReindexed(documentId, indexId, {
        result,
        options,
        processingTime,
      });

      logger.info('Document reindexed successfully', { documentId, indexId, processingTime });
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const result: IndexingResult = {
        documentId,
        indexId,
        status: 'failed',
        processingTime,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        keywordsExtracted: 0,
        entitiesExtracted: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };

      await eventService.publishIndexingError(documentId, {
        type: 'reindexing_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'IDX_002',
      }, { indexId });

      logger.error('Document reindexing failed', error as Error, { documentId, indexId });
      
      return result;
    }
  };

  const removeFromIndex = async (documentId: string, indexId: string): Promise<boolean> => {
    try {
      logger.info('Removing document from index', { documentId, indexId });
      
      const existingDoc = mockDataService.getDocuments(indexId).find(d => d.documentId === documentId);
      if (!existingDoc) {
        throw new Error(`Document ${documentId} not found in index ${indexId}`);
      }

      const success = mockDataService.deleteDocument(existingDoc.id);
      
      if (success) {
        await eventService.publishDocumentRemoved(documentId, indexId);
        logger.info('Document removed from index successfully', { documentId, indexId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to remove document from index', error as Error, { documentId, indexId });
      return false;
    }
  };

  const bulkIndex = async (
    documents: Array<{
      documentId: string;
      content: string;
      metadata?: Record<string, any>;
    }>,
    indexId: string,
    options: IndexingOptions = {}
  ): Promise<BulkIndexingResult> => {
    const startTime = Date.now();
    const batchId = `batch-${Date.now()}`;
    
    logger.info('Starting bulk indexing', { batchId, indexId, documentCount: documents.length });
    
    const results: IndexingResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const doc of documents) {
      try {
        const result = await indexDocument(
          doc.documentId,
          indexId,
          doc.content,
          doc.metadata || {},
          options
        );
        
        results.push(result);
        
        if (result.status === 'success') {
          successCount++;
        } else {
          failureCount++;
          if (result.errors) {
            errors.push(...result.errors);
          }
        }
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMessage);
        
        results.push({
          documentId: doc.documentId,
          indexId,
          status: 'failed',
          processingTime: 0,
          chunksCreated: 0,
          embeddingsGenerated: 0,
          keywordsExtracted: 0,
          entitiesExtracted: 0,
          errors: [errorMessage],
        });
      }
    }

    const processingTime = Date.now() - startTime;
    
    const bulkResult: BulkIndexingResult = {
      batchId,
      totalDocuments: documents.length,
      successCount,
      failureCount,
      results,
      processingTime,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Publish bulk operation event
    await eventService.publishBulkOperationCompleted('bulk_index', results, {
      batchId,
      indexId,
      processingTime,
    });

    logger.info('Bulk indexing completed', { 
      batchId, 
      indexId, 
      totalDocuments: documents.length,
      successCount,
      failureCount,
      processingTime 
    });
    
    return bulkResult;
  };

  const getIndexingStatus = async (documentId: string, indexId: string) => {
    const doc = mockDataService.getDocuments(indexId).find(d => d.documentId === documentId);
    if (!doc) {
      return null;
    }

    return {
      documentId,
      indexId,
      status: doc.status,
      indexedAt: doc.indexedAt,
      version: doc.version,
      checksum: doc.checksum,
      chunksCount: doc.chunks.length,
      hasEmbeddings: doc.embeddings.length > 0,
      keywordsCount: doc.keywords.length,
      entitiesCount: doc.entities.length,
      wordCount: doc.wordCount,
      language: doc.language,
    };
  };

  // Helper functions
  const createChunks = (content: string, chunkSize: number, chunkOverlap: number) => {
    const chunks = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      const chunkContent = content.substring(startIndex, endIndex);
      
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: chunkContent,
        embeddings: mockDataService.generateMockEmbedding(1536),
        startIndex,
        endIndex,
        chunkIndex,
        metadata: {},
        keywords: extractKeywords(chunkContent),
        entities: extractEntities(chunkContent),
        relevanceScore: Math.random() * 0.3 + 0.7,
      });

      startIndex = Math.max(endIndex - chunkOverlap, startIndex + 1);
      chunkIndex++;
    }

    return chunks;
  };

  const extractKeywords = (content: string): string[] => {
    // Mock keyword extraction - in real implementation would use NLP
    const words = content.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    const uniqueWords = Array.from(new Set(words));
    return uniqueWords.slice(0, 10); // Return top 10 keywords
  };

  const extractEntities = (content: string): string[] => {
    // Mock entity extraction - in real implementation would use NER
    const entities: string[] = [];
    const patterns = [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Names
      /\b[A-Z][a-z]+\b/g, // Proper nouns
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        entities.push(...matches);
      }
    });

    return Array.from(new Set(entities)).slice(0, 5);
  };

  const generateSummary = (content: string): string => {
    // Mock summary generation - in real implementation would use AI
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() || '';
    return firstSentence.length > 100 ? firstSentence : content.substring(0, 100) + '...';
  };

  const incrementVersion = (version: string): string => {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  };

  return {
    indexDocument,
    reindexDocument,
    removeFromIndex,
    bulkIndex,
    getIndexingStatus,
    
    // Utility methods
    validateContent: (content: string) => {
      if (!content || content.trim().length === 0) {
        throw new Error('Content cannot be empty');
      }
      if (content.length > 1000000) { // 1MB limit
        throw new Error('Content too large (max 1MB)');
      }
      return true;
    },
    
    estimateProcessingTime: (content: string, options: IndexingOptions = {}) => {
      const baseTime = 100; // 100ms base
      const contentFactor = content.length / 1000; // 1ms per 1000 chars
      const embeddingFactor = options.generateEmbeddings !== false ? 500 : 0;
      return baseTime + contentFactor + embeddingFactor;
    },
    
    getIndexingQueue: () => {
      // Mock queue status
      return {
        pending: Math.floor(Math.random() * 10),
        processing: Math.floor(Math.random() * 3),
        completed: Math.floor(Math.random() * 100) + 50,
        failed: Math.floor(Math.random() * 5),
      };
    },
  };
}