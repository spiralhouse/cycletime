import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document-controller';

export function registerMetadataRoutes(
  server: FastifyInstance,
  documentController: DocumentController
): void {
  // Get document metadata
  server.get('/api/v1/documents/:documentId/metadata', {
    schema: {
      tags: ['Metadata'],
      summary: 'Get document metadata',
      description: 'Get detailed metadata for a document',
      params: {
        type: 'object',
        required: ['documentId'],
        properties: {
          documentId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Document metadata',
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
            systemMetadata: {
              type: 'object',
              properties: {
                extractedText: { type: 'string' },
                language: { type: 'string' },
                pageCount: { type: 'integer' },
                wordCount: { type: 'integer' },
                readingTime: { type: 'integer' },
                lastIndexed: { type: 'string', format: 'date-time' },
                processingStatus: { 
                  type: 'string',
                  enum: ['pending', 'processing', 'completed', 'failed']
                }
              }
            },
            analytics: {
              type: 'object',
              properties: {
                viewCount: { type: 'integer' },
                downloadCount: { type: 'integer' },
                shareCount: { type: 'integer' },
                commentCount: { type: 'integer' },
                lastAccessed: { type: 'string', format: 'date-time' },
                topViewers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string', format: 'uuid' },
                      viewCount: { type: 'integer' },
                      lastViewed: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { documentId } = request.params;

      // Mock implementation
      const metadata = {
        documentId,
        metadata: {
          category: 'technical',
          priority: 'high',
          confidentiality: 'internal',
          department: 'engineering',
          project: 'cycletime',
          version: '2.1.0',
          lastReviewed: new Date(),
          reviewer: 'John Doe',
          approvalStatus: 'approved',
          keywords: ['api', 'documentation', 'rest', 'endpoints'],
          language: 'en',
          format: 'pdf',
          compliance: ['SOC2', 'ISO27001'],
          retention: '7 years',
          customFields: {
            businessUnit: 'Engineering',
            costCenter: 'R&D-001',
            owner: 'jane.smith@example.com'
          }
        },
        systemMetadata: {
          extractedText: 'This is a comprehensive API documentation that covers all REST endpoints...',
          language: 'en',
          pageCount: 45,
          wordCount: 12500,
          readingTime: 25,
          lastIndexed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          processingStatus: 'completed',
          fileSize: 2048000,
          mimeType: 'application/pdf',
          checksum: 'sha256:abc123def456',
          createdBy: 'upload-service',
          lastModified: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          encoding: 'UTF-8',
          contentType: 'application/pdf'
        },
        analytics: {
          viewCount: 247,
          downloadCount: 89,
          shareCount: 12,
          commentCount: 8,
          lastAccessed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          topViewers: [
            {
              userId: '550e8400-e29b-41d4-a716-446655440001',
              viewCount: 15,
              lastViewed: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
            },
            {
              userId: '550e8400-e29b-41d4-a716-446655440002',
              viewCount: 12,
              lastViewed: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            },
            {
              userId: '550e8400-e29b-41d4-a716-446655440003',
              viewCount: 8,
              lastViewed: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
            }
          ],
          viewsByDate: {
            '2024-01-20': 15,
            '2024-01-21': 23,
            '2024-01-22': 18,
            '2024-01-23': 31,
            '2024-01-24': 28
          },
          downloadsByDate: {
            '2024-01-20': 3,
            '2024-01-21': 8,
            '2024-01-22': 5,
            '2024-01-23': 12,
            '2024-01-24': 7
          }
        }
      };

      reply.send(metadata);
    }
  });

  // Update document metadata
  server.put('/api/v1/documents/:documentId/metadata', {
    schema: {
      tags: ['Metadata'],
      summary: 'Update document metadata',
      description: 'Update document metadata',
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
          metadata: { type: 'object' },
          systemMetadata: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              processingStatus: { 
                type: 'string',
                enum: ['pending', 'processing', 'completed', 'failed']
              }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Metadata updated successfully',
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
            systemMetadata: { type: 'object' },
            analytics: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { documentId } = request.params;
      const { metadata, systemMetadata } = request.body;

      // Mock implementation - merge with existing metadata
      const updatedMetadata = {
        documentId,
        metadata: {
          ...metadata,
          lastModified: new Date(),
          modifiedBy: 'current-user-id'
        },
        systemMetadata: {
          ...systemMetadata,
          lastUpdated: new Date(),
          processingStatus: systemMetadata?.processingStatus || 'completed'
        },
        analytics: {
          viewCount: 247,
          downloadCount: 89,
          shareCount: 12,
          commentCount: 8,
          lastAccessed: new Date()
        }
      };

      reply.send(updatedMetadata);
    }
  });

  // Get document analytics
  server.get('/api/v1/documents/:documentId/analytics', {
    schema: {
      tags: ['Metadata'],
      summary: 'Get document analytics',
      description: 'Get detailed analytics for a document',
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
          timeframe: { 
            type: 'string',
            enum: ['hour', 'day', 'week', 'month', 'year'],
            default: 'month'
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['views', 'downloads', 'shares', 'comments', 'collaborators']
            }
          }
        }
      },
      response: {
        200: {
          description: 'Document analytics',
          type: 'object',
          properties: {
            documentId: { type: 'string', format: 'uuid' },
            timeframe: { type: 'string' },
            metrics: { type: 'object' },
            trends: { type: 'object' },
            comparisons: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { documentId } = request.params;
      const { timeframe = 'month', metrics } = request.query;

      // Mock analytics data
      const analytics = {
        documentId,
        timeframe,
        metrics: {
          views: {
            total: 247,
            unique: 89,
            trend: 'up',
            changePercent: 15.3,
            byDate: {
              '2024-01-20': 15,
              '2024-01-21': 23,
              '2024-01-22': 18,
              '2024-01-23': 31,
              '2024-01-24': 28
            }
          },
          downloads: {
            total: 89,
            unique: 67,
            trend: 'up',
            changePercent: 8.7,
            byDate: {
              '2024-01-20': 3,
              '2024-01-21': 8,
              '2024-01-22': 5,
              '2024-01-23': 12,
              '2024-01-24': 7
            }
          },
          shares: {
            total: 12,
            unique: 8,
            trend: 'stable',
            changePercent: 0,
            byDate: {
              '2024-01-20': 1,
              '2024-01-21': 2,
              '2024-01-22': 1,
              '2024-01-23': 3,
              '2024-01-24': 2
            }
          },
          comments: {
            total: 8,
            unique: 5,
            trend: 'down',
            changePercent: -12.5,
            byDate: {
              '2024-01-20': 1,
              '2024-01-21': 2,
              '2024-01-22': 0,
              '2024-01-23': 3,
              '2024-01-24': 1
            }
          },
          collaborators: {
            total: 15,
            active: 8,
            trend: 'up',
            changePercent: 25.0,
            byDate: {
              '2024-01-20': 5,
              '2024-01-21': 7,
              '2024-01-22': 6,
              '2024-01-23': 8,
              '2024-01-24': 8
            }
          }
        },
        trends: {
          engagement: 'increasing',
          popularity: 'high',
          collaboration: 'active'
        },
        comparisons: {
          avgViews: 156,
          avgDownloads: 45,
          avgShares: 8,
          avgComments: 12,
          percentile: 85
        },
        topReferrers: [
          { source: 'search', count: 89 },
          { source: 'direct', count: 67 },
          { source: 'shared-link', count: 45 },
          { source: 'email', count: 23 }
        ],
        deviceTypes: [
          { type: 'desktop', count: 156 },
          { type: 'mobile', count: 67 },
          { type: 'tablet', count: 24 }
        ]
      };

      reply.send(analytics);
    }
  });

  // Get document audit log
  server.get('/api/v1/documents/:documentId/audit', {
    schema: {
      tags: ['Metadata'],
      summary: 'Get document audit log',
      description: 'Get audit log for document activities',
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
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          action: {
            type: 'string',
            enum: ['created', 'updated', 'viewed', 'downloaded', 'shared', 'commented', 'deleted']
          },
          userId: { type: 'string', format: 'uuid' },
          dateFrom: { type: 'string', format: 'date-time' },
          dateTo: { type: 'string', format: 'date-time' }
        }
      },
      response: {
        200: {
          description: 'Document audit log',
          type: 'object',
          properties: {
            auditLog: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  action: { type: 'string' },
                  userId: { type: 'string', format: 'uuid' },
                  userName: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                  details: { type: 'object' },
                  ipAddress: { type: 'string' },
                  userAgent: { type: 'string' }
                }
              }
            },
            pagination: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { documentId } = request.params;
      const { page = 1, limit = 20, action, userId, dateFrom, dateTo } = request.query;

      // Mock audit log data
      const auditLog = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          action: 'viewed',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          details: {
            page: 1,
            duration: 180,
            device: 'desktop'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          action: 'downloaded',
          userId: '550e8400-e29b-41d4-a716-446655440003',
          userName: 'Jane Smith',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          details: {
            format: 'pdf',
            size: 2048000,
            version: '1.0.0'
          },
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'commented',
          userId: '550e8400-e29b-41d4-a716-446655440004',
          userName: 'Bob Johnson',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          details: {
            commentId: '550e8400-e29b-41d4-a716-446655440005',
            content: 'This section needs review',
            page: 5,
            position: { x: 100, y: 200 }
          },
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          action: 'shared',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          details: {
            sharedWith: ['jane.smith@example.com', 'bob.johnson@example.com'],
            permissions: ['read', 'comment'],
            message: 'Please review this document'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          action: 'updated',
          userId: '550e8400-e29b-41d4-a716-446655440002',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          details: {
            changes: [
              { field: 'title', oldValue: 'Old Title', newValue: 'New Title' },
              { field: 'description', oldValue: 'Old description', newValue: 'New description' }
            ],
            version: '1.1.0'
          },
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      ];

      // Apply filters (mock implementation)
      let filteredLog = auditLog;
      if (action) {
        filteredLog = filteredLog.filter(entry => entry.action === action);
      }
      if (userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === userId);
      }

      // Apply pagination
      const total = filteredLog.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedLog = filteredLog.slice(start, end);

      reply.send({
        auditLog: paginatedLog,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: end < total,
          hasPrevious: start > 0
        }
      });
    }
  });
}