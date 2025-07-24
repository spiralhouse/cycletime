import { FastifyInstance } from 'fastify';

export async function documentRoutes(app: FastifyInstance) {
  // List documents
  app.get('/', {
    schema: {
      summary: 'List documents',
      description: 'Get a list of indexed documents',
      tags: ['Document Management'],
      querystring: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
          status: { type: 'string', enum: ['indexed', 'indexing', 'failed', 'pending'] },
          offset: { type: 'integer', default: 0 },
          limit: { type: 'integer', default: 50 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  documentId: { type: 'string' },
                  title: { type: 'string' },
                  content: { type: 'string' },
                  metadata: { type: 'object' },
                  status: { type: 'string' },
                  indexedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'integer' },
            offset: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { indexId, status, offset = 0, limit = 50 } = request.query as any;
    
    let documents = app.mockDataService.getDocuments();
    
    if (indexId) {
      documents = documents.filter((doc: any) => doc.indexId === indexId);
    }
    
    if (status) {
      documents = documents.filter((doc: any) => doc.status === status);
    }
    
    // Apply pagination
    const paginatedDocuments = documents.slice(offset, offset + limit);
    
    reply.send({
      documents: paginatedDocuments,
      total: documents.length,
      offset,
      limit,
    });
  });

  // Index document
  app.post('/', {
    schema: {
      summary: 'Index document',
      description: 'Index a new document',
      tags: ['Document Indexing'],
      body: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
          indexId: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          metadata: { type: 'object' },
          options: {
            type: 'object',
            properties: {
              chunkSize: { type: 'integer' },
              chunkOverlap: { type: 'integer' },
              generateEmbeddings: { type: 'boolean', default: true },
              embeddingModel: { type: 'string' },
              extractKeywords: { type: 'boolean', default: true },
              extractEntities: { type: 'boolean', default: true },
              generateSummary: { type: 'boolean', default: true },
              priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high'],
                default: 'medium' 
              },
            },
          },
        },
        required: ['documentId', 'indexId', 'content'],
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            indexId: { type: 'string' },
            documentId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object' },
            status: { type: 'string' },
            indexedAt: { type: 'string', format: 'date-time' },
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
    const { documentId, indexId, content, metadata = {}, title, options = {} } = request.body as any;
    
    try {
      const result = await app.indexingService!.indexDocument(
        documentId,
        indexId,
        content,
        metadata,
        options
      );
      
      // Create and return the document object instead of just the result
      const document = app.mockDataService.addDocument({
        documentId,
        indexId,
        title: title || 'Untitled Document',
        content,
        metadata,
        status: 'indexed',
      });
      
      reply.code(201).send(document);
    } catch (error) {
      reply.code(400).send({
        error: 'Indexing Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get document
  app.get('/:documentId', {
    schema: {
      summary: 'Get document',
      description: 'Get details of a specific indexed document',
      tags: ['Document Management'],
      params: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
        },
        required: ['documentId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            documentId: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object' },
            status: { type: 'string' },
            indexedAt: { type: 'string', format: 'date-time' },
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
    const { documentId } = request.params as { documentId: string };
    
    const document = app.mockDataService.getDocument(documentId);
    
    if (!document) {
      return reply.code(404).send({
        error: 'Document Not Found',
        message: `Document with id ${documentId} not found`,
        timestamp: new Date().toISOString(),
      });
    }
    
    reply.send(document);
  });

  // Bulk index documents
  app.post('/bulk', {
    schema: {
      summary: 'Bulk index documents',
      description: 'Index multiple documents in a single operation',
      tags: ['Document Indexing'],
      body: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
          documents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
                content: { type: 'string' },
                metadata: { type: 'object' },
              },
              required: ['documentId', 'content'],
            },
          },
          options: {
            type: 'object',
            properties: {
              chunkSize: { type: 'integer' },
              chunkOverlap: { type: 'integer' },
              generateEmbeddings: { type: 'boolean', default: true },
              embeddingModel: { type: 'string' },
              extractKeywords: { type: 'boolean', default: true },
              extractEntities: { type: 'boolean', default: true },
              generateSummary: { type: 'boolean', default: true },
              priority: { 
                type: 'string', 
                enum: ['low', 'medium', 'high'],
                default: 'medium' 
              },
            },
          },
        },
        required: ['indexId', 'documents'],
      },
      response: {
        202: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: {
                batchId: { type: 'string' },
                totalDocuments: { type: 'integer' },
                successCount: { type: 'integer' },
                failureCount: { type: 'integer' },
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      documentId: { type: 'string' },
                      indexId: { type: 'string' },
                      status: { type: 'string' },
                      processingTime: { type: 'number' },
                      chunksCreated: { type: 'integer' },
                      embeddingsGenerated: { type: 'integer' },
                      keywordsExtracted: { type: 'integer' },
                      entitiesExtracted: { type: 'integer' },
                      errors: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      metadata: { type: 'object' },
                    },
                  },
                },
                processingTime: { type: 'number' },
                errors: {
                  type: 'array',
                  items: { type: 'string' },
                },
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
    const { indexId, documents, options = {} } = request.body as any;
    
    try {
      const result = await app.indexingService!.bulkIndex(documents, indexId, options);
      
      reply.code(202).send({ result });
    } catch (error) {
      reply.code(400).send({
        error: 'Bulk Indexing Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Reindex document
  app.put('/:documentId', {
    schema: {
      summary: 'Reindex document',
      description: 'Reindex an existing document',
      tags: ['Document Indexing'],
      params: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
        },
        required: ['documentId'],
      },
      body: {
        type: 'object',
        properties: {
          indexId: { type: 'string' },
          content: { type: 'string' },
          metadata: { type: 'object' },
          options: {
            type: 'object',
            properties: {
              forceReindex: { type: 'boolean', default: false },
              compareChecksums: { type: 'boolean', default: true },
              preserveMetadata: { type: 'boolean', default: true },
              updateEmbeddings: { type: 'boolean', default: true },
            },
          },
        },
        required: ['indexId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
                indexId: { type: 'string' },
                status: { 
                  type: 'string', 
                  enum: ['success', 'failed', 'partial'] 
                },
                processingTime: { type: 'number' },
                chunksCreated: { type: 'integer' },
                embeddingsGenerated: { type: 'integer' },
                keywordsExtracted: { type: 'integer' },
                entitiesExtracted: { type: 'integer' },
                errors: {
                  type: 'array',
                  items: { type: 'string' },
                },
                metadata: { type: 'object' },
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
    const { documentId } = request.params as { documentId: string };
    const { indexId, content, metadata = {}, options = {} } = request.body as any;
    
    try {
      const result = await app.indexingService!.reindexDocument(
        documentId,
        indexId,
        content,
        metadata,
        options
      );
      
      reply.send({ result });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404).send({
          error: 'Document Not Found',
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        reply.code(400).send({
          error: 'Reindexing Failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Remove document from index
  app.delete('/:documentId', {
    schema: {
      summary: 'Remove document from index',
      description: 'Remove a document from the index',
      tags: ['Document Indexing'],
      params: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
        },
        required: ['documentId'],
      },
      querystring: {
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
    const { documentId } = request.params as { documentId: string };
    const { indexId } = request.query as { indexId: string };
    
    try {
      const success = await app.indexingService!.removeFromIndex(documentId, indexId);
      
      if (!success) {
        return reply.code(404).send({
          error: 'Document Not Found',
          message: `Document ${documentId} not found in index ${indexId}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      reply.code(204).send();
    } catch (error) {
      reply.code(404).send({
        error: 'Document Not Found',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get indexing status
  app.get('/:documentId/status', {
    schema: {
      summary: 'Get indexing status',
      description: 'Get the indexing status of a document',
      tags: ['Document Indexing'],
      params: {
        type: 'object',
        properties: {
          documentId: { type: 'string' },
        },
        required: ['documentId'],
      },
      querystring: {
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
            documentId: { type: 'string' },
            indexId: { type: 'string' },
            status: { 
              type: 'string', 
              enum: ['indexed', 'indexing', 'failed', 'pending'] 
            },
            indexedAt: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            checksum: { type: 'string' },
            chunksCount: { type: 'integer' },
            hasEmbeddings: { type: 'boolean' },
            keywordsCount: { type: 'integer' },
            entitiesCount: { type: 'integer' },
            wordCount: { type: 'integer' },
            language: { type: 'string' },
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
    const { documentId } = request.params as { documentId: string };
    const { indexId } = request.query as { indexId: string };
    
    try {
      const status = await app.indexingService!.getIndexingStatus(documentId, indexId);
      
      if (!status) {
        return reply.code(404).send({
          error: 'Document Not Found',
          message: `Document ${documentId} not found in index ${indexId}`,
          timestamp: new Date().toISOString(),
        });
      }
      
      reply.send(status);
    } catch (error) {
      reply.code(404).send({
        error: 'Document Not Found',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get indexing queue status
  app.get('/queue/status', {
    schema: {
      summary: 'Get indexing queue status',
      description: 'Get the current status of the indexing queue',
      tags: ['Document Indexing'],
      response: {
        200: {
          type: 'object',
          properties: {
            pending: { type: 'integer' },
            processing: { type: 'integer' },
            completed: { type: 'integer' },
            failed: { type: 'integer' },
            totalCapacity: { type: 'integer' },
            averageProcessingTime: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const queueStatus = app.indexingService!.getIndexingQueue();
    
    reply.send({
      ...queueStatus,
      totalCapacity: 100,
      averageProcessingTime: 2.5,
    });
  });
}