import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document-controller';

export function registerCollaborationRoutes(
  server: FastifyInstance,
  documentController: DocumentController
): void {
  // Share document
  server.post('/api/v1/documents/:documentId/share', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Share document',
      description: 'Share a document with users or groups',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['permissions'],
        properties: {
          users: { 
            type: 'array',
            items: { type: 'string', format: 'uuid' }
          },
          groups: { 
            type: 'array',
            items: { type: 'string', format: 'uuid' }
          },
          permissions: { 
            type: 'array',
            items: { 
              type: 'string',
              enum: ['read', 'write', 'admin']
            }
          },
          expiresAt: { type: 'string', format: 'date-time' },
          message: { type: 'string' },
          allowDownload: { type: 'boolean', default: true },
          allowComments: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          description: 'Document shared successfully',
          type: 'object',
          properties: {
            shareId: { type: 'string', format: 'uuid' },
            shareLink: { type: 'string', format: 'uri' },
            permissions: { type: 'array' },
            expiresAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.send({
        shareId: '550e8400-e29b-41d4-a716-446655440000',
        shareLink: 'https://app.cycletime.dev/documents/123/share/550e8400-e29b-41d4-a716-446655440000',
        permissions: ['read', 'write'],
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      });
    }
  });

  // Get document permissions
  server.get('/api/v1/documents/:documentId/permissions', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Get document permissions',
      description: 'Get permissions for a document',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Document permissions',
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            public: { type: 'boolean' },
            permissions: { type: 'array' },
            inheritedPermissions: { type: 'array' },
            effectivePermissions: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.send({
        documentId: request.params.documentId,
        public: false,
        permissions: [
          {
            userId: '550e8400-e29b-41d4-a716-446655440001',
            permissions: ['read', 'write'],
            grantedBy: '550e8400-e29b-41d4-a716-446655440002',
            grantedAt: new Date()
          }
        ],
        inheritedPermissions: [],
        effectivePermissions: {
          currentUser: ['read', 'write', 'admin']
        }
      });
    }
  });

  // Get document comments
  server.get('/api/v1/documents/:documentId/comments', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Get document comments',
      description: 'Get comments for a document',
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
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          description: 'Document comments',
          type: 'object',
          properties: {
            comments: { type: 'array', items: { type: 'object' } },
            pagination: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.send({
        comments: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            content: 'This section looks good!',
            author: {
              id: '550e8400-e29b-41d4-a716-446655440001',
              name: 'John Doe',
              email: 'john@example.com'
            },
            position: {
              page: 1,
              x: 100,
              y: 200,
              selection: 'Selected text'
            },
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      });
    }
  });

  // Add document comment
  server.post('/api/v1/documents/:documentId/comments', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Add document comment',
      description: 'Add a comment to a document',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          position: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              x: { type: 'number' },
              y: { type: 'number' },
              selection: { type: 'string' }
            }
          },
          parentId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          description: 'Comment added successfully',
          type: 'object',
          properties: {
            comment: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.code(201).send({
        comment: {
          id: '550e8400-e29b-41d4-a716-446655440004',
          content: request.body.content,
          author: {
            id: 'current-user-id',
            name: 'Current User',
            email: 'user@example.com'
          },
          position: request.body.position,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  });

  // Update document comment
  server.put('/api/v1/documents/:documentId/comments/:commentId', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Update document comment',
      description: 'Update a document comment',
      params: {
        type: 'object',
        required: ['documentId', 'commentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          commentId: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['active', 'resolved']
          }
        }
      },
      response: {
        200: {
          description: 'Comment updated successfully',
          type: 'object',
          properties: {
            comment: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.send({
        comment: {
          id: request.params.commentId,
          content: request.body.content,
          status: request.body.status || 'active',
          updatedAt: new Date()
        }
      });
    }
  });

  // Delete document comment
  server.delete('/api/v1/documents/:documentId/comments/:commentId', {
    schema: {
      tags: ['Collaboration'],
      summary: 'Delete document comment',
      description: 'Delete a document comment',
      params: {
        type: 'object',
        required: ['documentId', 'commentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' },
          commentId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        204: {
          description: 'Comment deleted successfully'
        }
      }
    },
    handler: async (request, reply) => {
      // Mock implementation
      reply.code(204).send();
    }
  });
}