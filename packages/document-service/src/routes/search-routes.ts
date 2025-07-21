import { FastifyInstance } from 'fastify';
import { DocumentController } from '../controllers/document-controller';

export function registerSearchRoutes(
  server: FastifyInstance,
  documentController: DocumentController
): void {
  // Advanced document search
  server.post('/api/v1/documents/search', {
    schema: {
      tags: ['Search'],
      summary: 'Search documents',
      description: 'Advanced document search with filters and facets',
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { 
            type: 'string',
            description: 'Search query'
          },
          filters: {
            type: 'object',
            properties: {
              type: { 
                type: 'array',
                items: { type: 'string' }
              },
              status: { 
                type: 'array',
                items: { type: 'string' }
              },
              tags: { 
                type: 'array',
                items: { type: 'string' }
              },
              author: { 
                type: 'array',
                items: { type: 'string', format: 'uuid' }
              },
              dateRange: {
                type: 'object',
                properties: {
                  from: { type: 'string', format: 'date-time' },
                  to: { type: 'string', format: 'date-time' }
                }
              }
            }
          },
          facets: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['type', 'status', 'tags', 'author', 'createdAt']
            }
          },
          sort: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['relevance', 'createdAt', 'updatedAt', 'title', 'size']
              },
              order: {
                type: 'string',
                enum: ['asc', 'desc']
              }
            }
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1, default: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
            }
          },
          highlight: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              fields: { 
                type: 'array',
                items: { type: 'string' }
              },
              fragmentSize: { type: 'integer', default: 150 },
              maxFragments: { type: 'integer', default: 3 }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Search results',
          type: 'object',
          properties: {
            query: { type: 'string' },
            results: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  document: { type: 'object' },
                  score: { type: 'number' },
                  highlights: { type: 'object' }
                }
              }
            },
            pagination: { type: 'object' },
            facets: { type: 'object' },
            statistics: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { query, filters, pagination = { page: 1, limit: 20 } } = request.body as {
        query: string;
        filters?: any;
        pagination?: { page: number; limit: number };
      };

      // Mock search implementation
      const mockResults = [
        {
          document: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Project Requirements Document',
            description: 'Comprehensive requirements for the new project',
            type: 'pdf',
            size: 1024000,
            status: 'published',
            tags: ['requirements', 'project'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          score: 95.5,
          highlights: {
            title: [`Project <em>${query}</em> Document`],
            content: [`This document contains the <em>${query}</em> for the project...`]
          }
        },
        {
          document: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            title: 'Technical Architecture Guide',
            description: 'System architecture and design patterns',
            type: 'docx',
            size: 2048000,
            status: 'published',
            tags: ['architecture', 'technical'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          score: 87.2,
          highlights: {
            title: [`Technical Architecture Guide`],
            content: [`The architecture includes <em>${query}</em> components...`]
          }
        }
      ];

      // Apply filters (mock implementation)
      let filteredResults = mockResults;
      if (filters?.type) {
        filteredResults = filteredResults.filter(result => 
          filters.type.includes(result.document.type)
        );
      }
      if (filters?.status) {
        filteredResults = filteredResults.filter(result => 
          filters.status.includes(result.document.status)
        );
      }
      if (filters?.tags) {
        filteredResults = filteredResults.filter(result => 
          result.document.tags.some(tag => filters.tags.includes(tag))
        );
      }

      // Apply pagination
      const total = filteredResults.length;
      const start = (pagination.page - 1) * pagination.limit;
      const end = start + pagination.limit;
      const paginatedResults = filteredResults.slice(start, end);

      reply.send({
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
        facets: {
          types: [
            { value: 'pdf', count: 15 },
            { value: 'docx', count: 8 },
            { value: 'txt', count: 5 }
          ],
          statuses: [
            { value: 'published', count: 20 },
            { value: 'draft', count: 8 }
          ],
          tags: [
            { value: 'requirements', count: 12 },
            { value: 'technical', count: 10 },
            { value: 'architecture', count: 8 }
          ]
        },
        statistics: {
          totalDocuments: 150,
          searchTime: 125,
          maxScore: 95.5
        }
      });
    }
  });

  // Get search suggestions
  server.get('/api/v1/documents/search/suggestions', {
    schema: {
      tags: ['Search'],
      summary: 'Get search suggestions',
      description: 'Get search query suggestions based on input',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', minLength: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 }
        }
      },
      response: {
        200: {
          description: 'Search suggestions',
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  type: { type: 'string', enum: ['query', 'title', 'tag', 'author'] },
                  score: { type: 'number' }
                }
              }
            },
            query: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { q, limit = 10 } = request.query as { q?: string; limit?: number };

      // Mock suggestions
      const suggestions = [
        { text: `${q} requirements`, type: 'query', score: 10 },
        { text: `${q} documentation`, type: 'query', score: 8 },
        { text: `Project ${q} Document`, type: 'title', score: 7 },
        { text: `${q}`, type: 'tag', score: 6 },
        { text: `Technical ${q}`, type: 'title', score: 5 }
      ].slice(0, limit);

      reply.send({
        suggestions,
        query: q
      });
    }
  });

  // Get popular searches
  server.get('/api/v1/documents/search/popular', {
    schema: {
      tags: ['Search'],
      summary: 'Get popular searches',
      description: 'Get popular/trending search queries',
      querystring: {
        type: 'object',
        properties: {
          timeframe: { 
            type: 'string',
            enum: ['hour', 'day', 'week', 'month'],
            default: 'week'
          },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 }
        }
      },
      response: {
        200: {
          description: 'Popular searches',
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  count: { type: 'integer' },
                  trend: { type: 'string', enum: ['up', 'down', 'stable'] }
                }
              }
            },
            timeframe: { type: 'string' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { timeframe = 'week', limit = 10 } = request.query as { timeframe?: string; limit?: number };

      // Mock popular searches
      const queries = [
        { query: 'requirements', count: 45, trend: 'up' },
        { query: 'architecture', count: 38, trend: 'stable' },
        { query: 'api documentation', count: 32, trend: 'up' },
        { query: 'user manual', count: 28, trend: 'down' },
        { query: 'technical design', count: 24, trend: 'stable' },
        { query: 'meeting notes', count: 20, trend: 'up' },
        { query: 'project plan', count: 18, trend: 'stable' },
        { query: 'test cases', count: 15, trend: 'down' },
        { query: 'deployment guide', count: 12, trend: 'up' },
        { query: 'security policy', count: 10, trend: 'stable' }
      ].slice(0, limit);

      reply.send({
        queries,
        timeframe
      });
    }
  });

  // Save search
  server.post('/api/v1/documents/search/save', {
    schema: {
      tags: ['Search'],
      summary: 'Save search',
      description: 'Save a search query for later use',
      body: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string' },
          name: { type: 'string' },
          filters: { type: 'object' },
          notifications: { type: 'boolean', default: false }
        }
      },
      response: {
        201: {
          description: 'Search saved successfully',
          type: 'object',
          properties: {
            savedSearch: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                query: { type: 'string' },
                filters: { type: 'object' },
                notifications: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { query, name, filters, notifications } = request.body as {
        query: string;
        name: string;
        filters?: any;
        notifications?: any;
      };

      // Mock implementation
      const savedSearch = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: name || `Search: ${query}`,
        query,
        filters: filters || {},
        notifications: notifications || false,
        createdAt: new Date()
      };

      reply.code(201).send({ savedSearch });
    }
  });

  // Get saved searches
  server.get('/api/v1/documents/search/saved', {
    schema: {
      tags: ['Search'],
      summary: 'Get saved searches',
      description: 'Get user\'s saved searches',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
        }
      },
      response: {
        200: {
          description: 'Saved searches',
          type: 'object',
          properties: {
            savedSearches: {
              type: 'array',
              items: { type: 'object' }
            },
            pagination: { type: 'object' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

      // Mock implementation
      const savedSearches = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Project Requirements',
          query: 'requirements',
          filters: { type: ['pdf', 'docx'] },
          notifications: true,
          createdAt: new Date()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Technical Docs',
          query: 'technical architecture',
          filters: { tags: ['technical', 'architecture'] },
          notifications: false,
          createdAt: new Date()
        }
      ];

      reply.send({
        savedSearches,
        pagination: {
          page,
          limit,
          total: savedSearches.length,
          totalPages: Math.ceil(savedSearches.length / limit),
          hasNext: false,
          hasPrevious: false
        }
      });
    }
  });
}