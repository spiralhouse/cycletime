import { createMockDataService, EmbeddingResult } from './mock-data-service';
import { createEventService } from './event-service';
import { logger } from '@cycletime/shared-utils';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  batchSize?: number;
  normalize?: boolean;
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  options?: EmbeddingOptions;
}

export interface BatchEmbeddingResult {
  batchId: string;
  embeddings: EmbeddingResult[];
  totalTexts: number;
  successCount: number;
  failureCount: number;
  processingTime: number;
  errors?: string[];
}

export interface EmbeddingComparison {
  similarity: number;
  distance: number;
  method: 'cosine' | 'euclidean' | 'manhattan';
  metadata?: Record<string, any>;
}

export interface EmbeddingCluster {
  id: string;
  centroid: number[];
  members: string[];
  averageSimilarity: number;
  size: number;
}

export function createEmbeddingService(
  mockDataService: ReturnType<typeof createMockDataService>,
  eventService: ReturnType<typeof createEventService>
) {
  const generateEmbedding = async (
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> => {
    const startTime = Date.now();
    
    try {
      logger.info('Generating embedding', { textLength: text.length, options });
      
      // Validate input
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }
      
      if (text.length > 8192) {
        throw new Error('Text too long (max 8192 characters)');
      }

      const {
        model = 'text-embedding-3-small',
        dimensions = 1536,
        normalize = true,
        metadata = {},
      } = options;

      // Generate mock embedding
      let embeddings = mockDataService.generateMockEmbedding(dimensions);
      
      // Normalize if requested
      if (normalize) {
        embeddings = normalizeVector(embeddings);
      }

      const processingTime = Date.now() - startTime;
      
      const result: EmbeddingResult = {
        id: `emb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        embeddings,
        model,
        dimensions,
        tokens: estimateTokens(text),
        processingTime,
        createdAt: new Date(),
      };

      // Store the embedding
      const storedEmbedding = mockDataService.createEmbedding(text, model);
      result.id = storedEmbedding.id;

      // Publish event
      await eventService.publishEmbeddingGenerated(text, embeddings, {
        model,
        dimensions,
        processingTime,
        metadata,
      });

      logger.info('Embedding generated successfully', { 
        embeddingId: result.id,
        textLength: text.length,
        dimensions,
        processingTime 
      });

      return result;
    } catch (error) {
      logger.error('Embedding generation failed', error as Error, { text: text.substring(0, 100) });
      throw error;
    }
  };

  const generateBatchEmbeddings = async (
    request: BatchEmbeddingRequest
  ): Promise<BatchEmbeddingResult> => {
    const startTime = Date.now();
    const batchId = `batch-${Date.now()}`;
    
    logger.info('Starting batch embedding generation', { 
      batchId,
      textCount: request.texts.length,
      options: request.options 
    });

    const results: EmbeddingResult[] = [];
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    const { batchSize = 10 } = request.options || {};
    
    // Process in batches
    for (let i = 0; i < request.texts.length; i += batchSize) {
      const batch = request.texts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (text, index) => {
        try {
          const embedding = await generateEmbedding(text, request.options);
          results.push(embedding);
          successCount++;
          return embedding;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Text ${i + index}: ${errorMessage}`);
          failureCount++;
          return null;
        }
      });

      await Promise.all(batchPromises);
    }

    const processingTime = Date.now() - startTime;
    
    const batchResult: BatchEmbeddingResult = {
      batchId,
      embeddings: results,
      totalTexts: request.texts.length,
      successCount,
      failureCount,
      processingTime,
      errors: errors.length > 0 ? errors : undefined,
    };

    logger.info('Batch embedding generation completed', { 
      batchId,
      totalTexts: request.texts.length,
      successCount,
      failureCount,
      processingTime 
    });

    return batchResult;
  };

  const compareEmbeddings = async (
    embedding1: number[],
    embedding2: number[],
    method: 'cosine' | 'euclidean' | 'manhattan' = 'cosine'
  ): Promise<EmbeddingComparison> => {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    let similarity: number;
    let distance: number;

    switch (method) {
      case 'cosine':
        similarity = calculateCosineSimilarity(embedding1, embedding2);
        distance = 1 - similarity;
        break;
      case 'euclidean':
        distance = calculateEuclideanDistance(embedding1, embedding2);
        similarity = 1 / (1 + distance);
        break;
      case 'manhattan':
        distance = calculateManhattanDistance(embedding1, embedding2);
        similarity = 1 / (1 + distance);
        break;
      default:
        throw new Error(`Unsupported comparison method: ${method}`);
    }

    return {
      similarity,
      distance,
      method,
      metadata: {
        dimensions: embedding1.length,
        comparedAt: new Date(),
      },
    };
  };

  const findSimilarEmbeddings = async (
    targetEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      method?: 'cosine' | 'euclidean' | 'manhattan';
    } = {}
  ): Promise<Array<EmbeddingResult & { similarity: number }>> => {
    const {
      limit = 10,
      threshold = 0.7,
      method = 'cosine',
    } = options;

    const allEmbeddings = mockDataService.getEmbeddings();
    const similarities: Array<EmbeddingResult & { similarity: number }> = [];

    for (const embedding of allEmbeddings) {
      const comparison = await compareEmbeddings(targetEmbedding, embedding.embeddings, method);
      
      if (comparison.similarity >= threshold) {
        similarities.push({
          ...embedding,
          similarity: comparison.similarity,
        });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  };

  const clusterEmbeddings = async (
    embeddings: Array<{ id: string; embeddings: number[] }>,
    options: {
      numClusters?: number;
      maxIterations?: number;
      threshold?: number;
    } = {}
  ): Promise<EmbeddingCluster[]> => {
    const {
      numClusters = Math.min(5, Math.ceil(embeddings.length / 10)),
      maxIterations = 100,
      threshold = 0.01,
    } = options;

    logger.info('Starting embedding clustering', { 
      embeddingCount: embeddings.length,
      numClusters,
      maxIterations 
    });

    // Initialize clusters with random centroids
    const clusters: EmbeddingCluster[] = [];
    const dimensions = embeddings[0]?.embeddings.length || 1536;

    for (let i = 0; i < numClusters; i++) {
      clusters.push({
        id: `cluster-${i}`,
        centroid: mockDataService.generateMockEmbedding(dimensions),
        members: [],
        averageSimilarity: 0,
        size: 0,
      });
    }

    // K-means clustering simulation (simplified)
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Clear previous assignments
      clusters.forEach(cluster => {
        cluster.members = [];
      });

      // Assign embeddings to nearest clusters
      for (const embedding of embeddings) {
        let bestCluster = clusters[0];
        let bestSimilarity = 0;

        for (const cluster of clusters) {
          const similarity = mockDataService.compareEmbeddings(
            embedding.embeddings,
            cluster.centroid
          );

          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCluster = cluster;
          }
        }

        bestCluster.members.push(embedding.id);
      }

      // Update centroids (simplified - in reality would compute actual centroids)
      clusters.forEach(cluster => {
        cluster.size = cluster.members.length;
        if (cluster.size > 0) {
          // Mock centroid update
          cluster.centroid = mockDataService.generateMockEmbedding(dimensions);
          cluster.averageSimilarity = Math.random() * 0.3 + 0.7;
        }
      });
    }

    logger.info('Clustering completed', { 
      clustersCreated: clusters.length,
      clusterSizes: clusters.map(c => c.size)
    });

    return clusters.filter(cluster => cluster.size > 0);
  };

  const getEmbeddingStats = async () => {
    const allEmbeddings = mockDataService.getEmbeddings();
    
    return {
      totalEmbeddings: allEmbeddings.length,
      uniqueModels: [...new Set(allEmbeddings.map(e => e.model))],
      averageDimensions: allEmbeddings.length > 0 ? 
        allEmbeddings.reduce((sum, e) => sum + e.dimensions, 0) / allEmbeddings.length : 0,
      averageProcessingTime: allEmbeddings.length > 0 ? 
        allEmbeddings.reduce((sum, e) => sum + e.processingTime, 0) / allEmbeddings.length : 0,
      totalTokens: allEmbeddings.reduce((sum, e) => sum + e.tokens, 0),
      oldestEmbedding: allEmbeddings.length > 0 ? 
        allEmbeddings.reduce((oldest, e) => e.createdAt < oldest.createdAt ? e : oldest) : null,
      newestEmbedding: allEmbeddings.length > 0 ? 
        allEmbeddings.reduce((newest, e) => e.createdAt > newest.createdAt ? e : newest) : null,
    };
  };

  const deleteEmbedding = async (embeddingId: string): Promise<boolean> => {
    const embeddings = mockDataService.getEmbeddings();
    const index = embeddings.findIndex(e => e.id === embeddingId);
    
    if (index !== -1) {
      embeddings.splice(index, 1);
      logger.info('Embedding deleted', { embeddingId });
      return true;
    }
    
    return false;
  };

  const updateEmbedding = async (
    embeddingId: string,
    updates: Partial<EmbeddingResult>
  ): Promise<EmbeddingResult | null> => {
    const embeddings = mockDataService.getEmbeddings();
    const embedding = embeddings.find(e => e.id === embeddingId);
    
    if (embedding) {
      Object.assign(embedding, updates);
      logger.info('Embedding updated', { embeddingId, updates: Object.keys(updates) });
      return embedding;
    }
    
    return null;
  };

  // Helper functions
  const normalizeVector = (vector: number[]): number[] => {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  };

  const calculateCosineSimilarity = (a: number[], b: number[]): number => {
    return mockDataService.compareEmbeddings(a, b);
  };

  const calculateEuclideanDistance = (a: number[], b: number[]): number => {
    const sum = a.reduce((acc, val, i) => acc + Math.pow(val - b[i], 2), 0);
    return Math.sqrt(sum);
  };

  const calculateManhattanDistance = (a: number[], b: number[]): number => {
    return a.reduce((acc, val, i) => acc + Math.abs(val - b[i]), 0);
  };

  const estimateTokens = (text: string): number => {
    // Simple token estimation - in reality would use proper tokenizer
    return Math.ceil(text.length / 4);
  };

  const validateEmbedding = (embedding: number[]): boolean => {
    return Array.isArray(embedding) && 
           embedding.length > 0 && 
           embedding.every(val => typeof val === 'number' && !isNaN(val));
  };

  return {
    generateEmbedding,
    generateBatchEmbeddings,
    compareEmbeddings,
    findSimilarEmbeddings,
    clusterEmbeddings,
    getEmbeddingStats,
    deleteEmbedding,
    updateEmbedding,
    
    // Utility methods
    normalizeVector,
    validateEmbedding,
    estimateTokens,
    
    // Analysis methods
    analyzeEmbeddingQuality: async (embedding: number[]) => {
      const stats = {
        dimensions: embedding.length,
        magnitude: Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)),
        mean: embedding.reduce((sum, val) => sum + val, 0) / embedding.length,
        std: 0,
        min: Math.min(...embedding),
        max: Math.max(...embedding),
        sparsity: embedding.filter(val => Math.abs(val) < 0.01).length / embedding.length,
      };
      
      // Calculate standard deviation
      const variance = embedding.reduce((sum, val) => sum + Math.pow(val - stats.mean, 2), 0) / embedding.length;
      stats.std = Math.sqrt(variance);
      
      return {
        ...stats,
        isNormalized: Math.abs(stats.magnitude - 1) < 0.01,
        quality: stats.sparsity < 0.5 ? 'good' : 'poor',
        distribution: stats.std > 0.1 ? 'well-distributed' : 'concentrated',
      };
    },
    
    // Model management
    getSupportedModels: () => [
      {
        id: 'text-embedding-3-small',
        name: 'Text Embedding 3 Small',
        dimensions: 1536,
        maxTokens: 8192,
        costPerToken: 0.00002,
        description: 'High-performance embedding model for most use cases',
      },
      {
        id: 'text-embedding-3-large',
        name: 'Text Embedding 3 Large',
        dimensions: 3072,
        maxTokens: 8192,
        costPerToken: 0.00013,
        description: 'Highest quality embedding model',
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada 002',
        dimensions: 1536,
        maxTokens: 8192,
        costPerToken: 0.0001,
        description: 'Legacy embedding model',
      },
    ],
    
    // Batch operations
    estimateBatchCost: (texts: string[], model: string = 'text-embedding-3-small') => {
      const totalTokens = texts.reduce((sum, text) => sum + estimateTokens(text), 0);
      const costPerToken = model.includes('large') ? 0.00013 : 0.00002;
      return totalTokens * costPerToken;
    },
    
    // Performance monitoring
    getPerformanceMetrics: () => ({
      averageProcessingTime: 150,
      throughput: 1000, // embeddings per minute
      errorRate: 0.01,
      cacheHitRate: 0.85,
      queueLength: Math.floor(Math.random() * 10),
    }),
  };
}