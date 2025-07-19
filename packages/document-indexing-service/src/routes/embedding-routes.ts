import { FastifyInstance } from 'fastify';

export async function embeddingRoutes(app: FastifyInstance) {
  // Generate embeddings
  app.post('/', {
    schema: {
      summary: 'Generate embeddings',
      description: 'Generate embeddings for text content',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          model: { type: 'string', default: 'text-embedding-3-small' },
          dimensions: { type: 'integer', default: 1536 },
          normalize: { type: 'boolean', default: true },
          metadata: { type: 'object' },
        },
        required: ['text'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            embedding: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                embeddings: {
                  type: 'array',
                  items: { type: 'number' },
                },
                model: { type: 'string' },
                dimensions: { type: 'integer' },
                tokens: { type: 'integer' },
                processingTime: { type: 'number' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { text, model, dimensions, normalize, metadata } = request.body as any;
    
    try {
      const embedding = await app.embeddingService.generateEmbedding(text, {
        model,
        dimensions,
        normalize,
        metadata,
      });
      
      reply.send({ embedding });
    } catch (error) {
      reply.code(400).send({
        error: 'Embedding Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Generate batch embeddings
  app.post('/batch', {
    schema: {
      summary: 'Generate batch embeddings',
      description: 'Generate embeddings for multiple texts',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          texts: {
            type: 'array',
            items: { type: 'string' },
          },
          options: {
            type: 'object',
            properties: {
              model: { type: 'string', default: 'text-embedding-3-small' },
              dimensions: { type: 'integer', default: 1536 },
              batchSize: { type: 'integer', default: 10 },
              normalize: { type: 'boolean', default: true },
              metadata: { type: 'object' },
            },
          },
        },
        required: ['texts'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            batchId: { type: 'string' },
            embeddings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  embeddings: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                  model: { type: 'string' },
                  dimensions: { type: 'integer' },
                  tokens: { type: 'integer' },
                  processingTime: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            totalTexts: { type: 'integer' },
            successCount: { type: 'integer' },
            failureCount: { type: 'integer' },
            processingTime: { type: 'number' },
            errors: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { texts, options } = request.body as any;
    
    try {
      const result = await app.embeddingService.generateBatchEmbeddings({
        texts,
        options,
      });
      
      reply.send(result);
    } catch (error) {
      reply.code(400).send({
        error: 'Batch Embedding Generation Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Compare embeddings
  app.post('/compare', {
    schema: {
      summary: 'Compare embeddings',
      description: 'Compare two embeddings and get similarity score',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          embedding1: {
            type: 'array',
            items: { type: 'number' },
          },
          embedding2: {
            type: 'array',
            items: { type: 'number' },
          },
          method: { 
            type: 'string', 
            enum: ['cosine', 'euclidean', 'manhattan'],
            default: 'cosine'
          },
        },
        required: ['embedding1', 'embedding2'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            similarity: { type: 'number' },
            distance: { type: 'number' },
            method: { type: 'string' },
            metadata: {
              type: 'object',
              properties: {
                dimensions: { type: 'integer' },
                comparedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { embedding1, embedding2, method } = request.body as any;
    
    try {
      const comparison = await app.embeddingService.compareEmbeddings(
        embedding1,
        embedding2,
        method
      );
      
      reply.send(comparison);
    } catch (error) {
      reply.code(400).send({
        error: 'Embedding Comparison Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Find similar embeddings
  app.post('/similar', {
    schema: {
      summary: 'Find similar embeddings',
      description: 'Find embeddings similar to a target embedding',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          targetEmbedding: {
            type: 'array',
            items: { type: 'number' },
          },
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 100, 
            default: 10 
          },
          threshold: { 
            type: 'number', 
            minimum: 0, 
            maximum: 1, 
            default: 0.7 
          },
          method: { 
            type: 'string', 
            enum: ['cosine', 'euclidean', 'manhattan'],
            default: 'cosine'
          },
        },
        required: ['targetEmbedding'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            similar: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  text: { type: 'string' },
                  embeddings: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                  model: { type: 'string' },
                  dimensions: { type: 'integer' },
                  tokens: { type: 'integer' },
                  processingTime: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                  similarity: { type: 'number' },
                },
              },
            },
            total: { type: 'integer' },
            method: { type: 'string' },
            processingTime: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { targetEmbedding, limit, threshold, method } = request.body as any;
    
    try {
      const startTime = Date.now();
      const similar = await app.embeddingService.findSimilarEmbeddings(targetEmbedding, {
        limit,
        threshold,
        method,
      });
      const processingTime = Date.now() - startTime;
      
      reply.send({
        similar,
        total: similar.length,
        method: method || 'cosine',
        processingTime,
      });
    } catch (error) {
      reply.code(400).send({
        error: 'Find Similar Embeddings Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Cluster embeddings
  app.post('/cluster', {
    schema: {
      summary: 'Cluster embeddings',
      description: 'Cluster a set of embeddings using K-means',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          embeddings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                embeddings: {
                  type: 'array',
                  items: { type: 'number' },
                },
              },
              required: ['id', 'embeddings'],
            },
          },
          options: {
            type: 'object',
            properties: {
              numClusters: { type: 'integer', minimum: 2, maximum: 50 },
              maxIterations: { type: 'integer', default: 100 },
              threshold: { type: 'number', default: 0.01 },
            },
          },
        },
        required: ['embeddings'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            clusters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  centroid: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                  members: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  averageSimilarity: { type: 'number' },
                  size: { type: 'integer' },
                },
              },
            },
            totalClusters: { type: 'integer' },
            totalEmbeddings: { type: 'integer' },
            processingTime: { type: 'number' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { embeddings, options } = request.body as any;
    
    try {
      const startTime = Date.now();
      const clusters = await app.embeddingService.clusterEmbeddings(embeddings, options);
      const processingTime = Date.now() - startTime;
      
      reply.send({
        clusters,
        totalClusters: clusters.length,
        totalEmbeddings: embeddings.length,
        processingTime,
      });
    } catch (error) {
      reply.code(400).send({
        error: 'Embedding Clustering Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get embedding statistics
  app.get('/stats', {
    schema: {
      summary: 'Get embedding statistics',
      description: 'Get statistics about stored embeddings',
      tags: ['Embedding Management'],
      response: {
        200: {
          type: 'object',
          properties: {
            totalEmbeddings: { type: 'integer' },
            uniqueModels: {
              type: 'array',
              items: { type: 'string' },
            },
            averageDimensions: { type: 'number' },
            averageProcessingTime: { type: 'number' },
            totalTokens: { type: 'integer' },
            oldestEmbedding: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            newestEmbedding: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            modelDistribution: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
            dimensionDistribution: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const stats = await app.embeddingService.getEmbeddingStats();
    const modelDistribution: Record<string, number> = {};
    const dimensionDistribution: Record<string, number> = {};
    
    // Mock additional statistics
    stats.uniqueModels.forEach(model => {
      modelDistribution[model] = Math.floor(Math.random() * 1000) + 100;
    });
    
    [1536, 3072, 768].forEach(dim => {
      dimensionDistribution[dim.toString()] = Math.floor(Math.random() * 500) + 50;
    });
    
    reply.send({
      ...stats,
      modelDistribution,
      dimensionDistribution,
    });
  });

  // Get supported models
  app.get('/models', {
    schema: {
      summary: 'Get supported embedding models',
      description: 'Get list of supported embedding models',
      tags: ['Embedding Management'],
      response: {
        200: {
          type: 'object',
          properties: {
            models: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  dimensions: { type: 'integer' },
                  maxTokens: { type: 'integer' },
                  costPerToken: { type: 'number' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const models = app.embeddingService.getSupportedModels();
    reply.send({ models });
  });

  // Analyze embedding quality
  app.post('/analyze', {
    schema: {
      summary: 'Analyze embedding quality',
      description: 'Analyze the quality and characteristics of an embedding',
      tags: ['Embedding Management'],
      body: {
        type: 'object',
        properties: {
          embedding: {
            type: 'array',
            items: { type: 'number' },
          },
        },
        required: ['embedding'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            dimensions: { type: 'integer' },
            magnitude: { type: 'number' },
            mean: { type: 'number' },
            std: { type: 'number' },
            min: { type: 'number' },
            max: { type: 'number' },
            sparsity: { type: 'number' },
            isNormalized: { type: 'boolean' },
            quality: { type: 'string', enum: ['good', 'poor'] },
            distribution: { type: 'string', enum: ['well-distributed', 'concentrated'] },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { embedding } = request.body as any;
    
    try {
      const analysis = await app.embeddingService.analyzeEmbeddingQuality(embedding);
      reply.send(analysis);
    } catch (error) {
      reply.code(400).send({
        error: 'Embedding Analysis Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Delete embedding
  app.delete('/:embeddingId', {
    schema: {
      summary: 'Delete embedding',
      description: 'Delete a stored embedding',
      tags: ['Embedding Management'],
      params: {
        type: 'object',
        properties: {
          embeddingId: { type: 'string' },
        },
        required: ['embeddingId'],
      },
      response: {
        204: {
          type: 'null',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { embeddingId } = request.params as { embeddingId: string };
    
    try {
      const success = await app.embeddingService.deleteEmbedding(embeddingId);
      
      if (!success) {
        return reply.code(404).send({
          error: 'Embedding Not Found',
          message: `Embedding with id ${embeddingId} not found`,
          timestamp: new Date().toISOString(),
        });
      }
      
      reply.code(204).send();
    } catch (error) {
      reply.code(404).send({
        error: 'Embedding Not Found',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get performance metrics
  app.get('/performance', {
    schema: {
      summary: 'Get embedding performance metrics',
      description: 'Get performance metrics for embedding operations',
      tags: ['Embedding Management'],
      response: {
        200: {
          type: 'object',
          properties: {
            averageProcessingTime: { type: 'number' },
            throughput: { type: 'number' },
            errorRate: { type: 'number' },
            cacheHitRate: { type: 'number' },
            queueLength: { type: 'integer' },
            memoryUsage: { type: 'number' },
            batchEfficiency: { type: 'number' },
            modelPerformance: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  averageTime: { type: 'number' },
                  throughput: { type: 'number' },
                  errorRate: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const metrics = app.embeddingService.getPerformanceMetrics();
    
    reply.send({
      ...metrics,
      memoryUsage: Math.random() * 0.5 + 0.3,
      batchEfficiency: Math.random() * 0.2 + 0.8,
      modelPerformance: {
        'text-embedding-3-small': {
          averageTime: 150,
          throughput: 1200,
          errorRate: 0.005,
        },
        'text-embedding-3-large': {
          averageTime: 250,
          throughput: 800,
          errorRate: 0.003,
        },
      },
    });
  });
}