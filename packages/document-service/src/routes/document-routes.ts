import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document-controller';

export function registerDocumentRoutes(
  server: FastifyInstance,
  documentController: DocumentController
): void {
  // Create document
  server.post('/api/v1/documents', {
    schema: {
      tags: ['Documents'],
      summary: 'Create a new document',
      description: 'Create a new document with metadata',
      body: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          type: { 
            type: 'string',
            enum: ['pdf', 'docx', 'txt', 'md', 'json', 'xml', 'html', 'csv', 'xlsx', 'pptx', 'image']
          },
          content: { type: 'string' },
          tags: { 
            type: 'array',
            items: { type: 'string' }
          },
          metadata: { type: 'object' },
          status: { 
            type: 'string',
            enum: ['draft', 'published'],
            default: 'draft'
          }
        }
      },
      response: {
        201: {
          description: 'Document created successfully',
          type: 'object',
          properties: {
            document: { type: 'object' },
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: (request, reply) => documentController.createDocument(request, reply)
  });

  // Get document
  server.get('/api/v1/documents/:documentId', {
    schema: {
      tags: ['Documents'],
      summary: 'Get document details',
      description: 'Get document details and metadata',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          includeContent: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          description: 'Document details',
          type: 'object',
          properties: {
            document: { type: 'object' },
            success: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: (request, reply) => documentController.getDocument(request, reply)
  });

  // Update document
  server.put('/api/v1/documents/:documentId', {
    schema: {
      tags: ['Documents'],
      summary: 'Update document',
      description: 'Update document metadata and content',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          content: { type: 'string' },
          tags: { 
            type: 'array',
            items: { type: 'string' }
          },
          metadata: { type: 'object' },
          status: { 
            type: 'string',
            enum: ['draft', 'published', 'archived']
          },
          version: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Document updated successfully',
          type: 'object',
          properties: {
            document: { type: 'object' },
            success: { type: 'boolean' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: (request, reply) => documentController.updateDocument(request, reply)
  });

  // Delete document
  server.delete('/api/v1/documents/:documentId', {
    schema: {
      tags: ['Documents'],
      summary: 'Delete document',
      description: 'Delete a document (soft delete by default)',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          permanent: { type: 'boolean', default: false }
        }
      },
      response: {
        204: {
          description: 'Document deleted successfully'
        }
      }
    },
    handler: (request, reply) => documentController.deleteDocument(request, reply)
  });

  // List documents
  server.get('/api/v1/documents', {
    schema: {
      tags: ['Documents'],
      summary: 'List documents',
      description: 'Get a paginated list of documents with optional filtering',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          type: { 
            type: 'string',
            enum: ['pdf', 'docx', 'txt', 'md', 'json', 'xml', 'html', 'csv', 'xlsx', 'pptx', 'image']
          },
          status: { 
            type: 'string',
            enum: ['draft', 'published', 'archived', 'deleted']
          },
          tag: { type: 'string' },
          author: { type: 'string', format: 'uuid' },
          sortBy: { 
            type: 'string',
            enum: ['createdAt', 'updatedAt', 'title', 'size', 'type'],
            default: 'updatedAt'
          },
          sortOrder: { 
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        }
      },
      response: {
        200: {
          description: 'List of documents',
          type: 'object',
          properties: {
            documents: { 
              type: 'array',
              items: { type: 'object' }
            },
            pagination: { type: 'object' },
            filters: { type: 'object' },
            facets: { type: 'object' },
            success: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: (request, reply) => documentController.listDocuments(request, reply)
  });

  // Get document content
  server.get('/api/v1/documents/:documentId/content', {
    schema: {
      tags: ['Documents'],
      summary: 'Get document content',
      description: 'Download document content',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          version: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Document content',
          type: 'string',
          format: 'binary'
        }
      }
    },
    handler: (request, reply) => documentController.getDocumentContent(request, reply)
  });
}