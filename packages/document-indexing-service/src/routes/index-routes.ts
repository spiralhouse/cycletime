import { FastifyInstance } from 'fastify';

export async function indexRoutes(app: FastifyInstance) {
  // List indices
  app.get('/', {
    schema: {
      summary: 'List indices',
      description: 'Get a list of all document indices',
      tags: ['Index Management'],
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'creating', 'updating', 'deleting'],
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            indices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  status: { 
                    type: 'string', 
                    enum: ['active', 'inactive', 'creating', 'updating', 'deleting'] 
                  },
                  documentCount: { type: 'integer' },
                  vectorDimensions: { type: 'integer' },
                  embeddingModel: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  settings: {
                    type: 'object',
                    properties: {
                      chunkSize: { type: 'integer' },
                      chunkOverlap: { type: 'integer' },
                      similarityThreshold: { type: 'number' },
                      enableHybridSearch: { type: 'boolean' },
                      enableKeywordSearch: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            total: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    
    let indices = app.mockDataService.getIndices();
    
    if (status) {
      indices = indices.filter((index: any) => index.status === status);
    }
    
    reply.send({
      indices,
      total: indices.length,
    });
  });

  // Create index
  app.post('/', {
    schema: {
      summary: 'Create index',
      description: 'Create a new document index',
      tags: ['Index Management'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          vectorDimensions: { type: 'integer', default: 1536 },
          embeddingModel: { type: 'string', default: 'text-embedding-3-small' },
          settings: {
            type: 'object',
            properties: {
              chunkSize: { type: 'integer', default: 1000 },
              chunkOverlap: { type: 'integer', default: 100 },
              similarityThreshold: { type: 'number', default: 0.7 },
              enableHybridSearch: { type: 'boolean', default: true },
              enableKeywordSearch: { type: 'boolean', default: true },
            },
          },
        },
        required: ['name'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            index: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                documentCount: { type: 'integer' },
                vectorDimensions: { type: 'integer' },
                embeddingModel: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                settings: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const data = request.body as any;
    
    const index = app.mockDataService.createIndex(data);
    
    // Publish index creation event
    await app.eventService.publishIndexUpdated(index.id, 'created', {
      name: index.name,
      description: index.description,
      vectorDimensions: index.vectorDimensions,
      embeddingModel: index.embeddingModel,
    });
    
    reply.code(201).send({ index });
  });

  // Get index
  app.get('/:indexId', {
    schema: {
      summary: 'Get index',
      description: 'Get details of a specific index',
      tags: ['Index Management'],
      params: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
        },
        required: ['indexId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            index: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                documentCount: { type: 'integer' },
                vectorDimensions: { type: 'integer' },
                embeddingModel: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                settings: { type: 'object' },
              },
            },
          },
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
    const { indexId } = request.params as { indexId: string };
    
    const index = app.mockDataService.getIndex(indexId);
    
    if (!index) {
      return reply.code(404).send({
        error: 'Index Not Found',
        message: `Index with id ${indexId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    reply.send({ index });
  });

  // Update index
  app.put('/:indexId', {
    schema: {
      summary: 'Update index',
      description: 'Update index configuration',
      tags: ['Index Management'],
      params: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
        },
        required: ['indexId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          settings: {
            type: 'object',
            properties: {
              chunkSize: { type: 'integer' },
              chunkOverlap: { type: 'integer' },
              similarityThreshold: { type: 'number' },
              enableHybridSearch: { type: 'boolean' },
              enableKeywordSearch: { type: 'boolean' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            index: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                status: { type: 'string' },
                documentCount: { type: 'integer' },
                vectorDimensions: { type: 'integer' },
                embeddingModel: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                settings: { type: 'object' },
              },
            },
          },
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
    const { indexId } = request.params as { indexId: string };
    const data = request.body as any;
    
    const index = app.mockDataService.updateIndex(indexId, data);
    
    if (!index) {
      return reply.code(404).send({
        error: 'Index Not Found',
        message: `Index with id ${indexId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Publish index update event
    await app.eventService.publishIndexUpdated(index.id, 'updated', {
      name: index.name,
      description: index.description,
      vectorDimensions: index.vectorDimensions,
      embeddingModel: index.embeddingModel,
    });
    
    reply.send({ index });
  });

  // Delete index
  app.delete('/:indexId', {
    schema: {
      summary: 'Delete index',
      description: 'Delete an index and all its documents',
      tags: ['Index Management'],
      params: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
        },
        required: ['indexId'],
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
    const { indexId } = request.params as { indexId: string };
    
    const success = app.mockDataService.deleteIndex(indexId);
    
    if (!success) {
      return reply.code(404).send({
        error: 'Index Not Found',
        message: `Index with id ${indexId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Publish index deletion event
    await app.eventService.publishIndexUpdated(indexId, 'deleted');
    
    reply.code(204).send();
  });

  // Get index statistics
  app.get('/:indexId/stats', {
    schema: {
      summary: 'Get index statistics',
      description: 'Get statistics for a specific index',
      tags: ['Index Management'],
      params: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
        },
        required: ['indexId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            indexId: { type: 'string' },
            statistics: {
              type: 'object',
              properties: {
                totalDocuments: { type: 'integer' },
                totalEmbeddings: { type: 'integer' },
                totalChunks: { type: 'integer' },
                averageIndexingTime: { type: 'number' },
                vectorDimensions: { type: 'integer' },
                storageUsed: { type: 'integer' },
                queryCount: { type: 'integer' },
                averageQueryTime: { type: 'number' },
                successRate: { type: 'number' },
                errorRate: { type: 'number' },
                lastIndexed: { type: 'string', format: 'date-time' },
                popularQueries: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
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
    const { indexId } = request.params as { indexId: string };
    
    const statistics = app.mockDataService.getIndexStatistics(indexId);
    
    if (!statistics) {
      return reply.code(404).send({
        error: 'Index Not Found',
        message: `Index with id ${indexId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    reply.send({
      indexId,
      statistics,
    });
  });
}