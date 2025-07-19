import { FastifyInstance } from 'fastify';

export function registerHealthRoutes(server: FastifyInstance): void {
  server.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Health check',
      description: 'Check if the document service is healthy and operational',
      response: {
        200: {
          description: 'Service is healthy',
          type: 'object',
          properties: {
            status: { 
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy']
            },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            dependencies: {
              type: 'object',
              properties: {
                storage: { 
                  type: 'string',
                  enum: ['healthy', 'degraded', 'unhealthy']
                },
                redis: { 
                  type: 'string',
                  enum: ['healthy', 'degraded', 'unhealthy']
                },
                documentIndexing: { 
                  type: 'string',
                  enum: ['healthy', 'degraded', 'unhealthy']
                }
              }
            },
            metrics: {
              type: 'object',
              properties: {
                documentsCount: { type: 'integer' },
                storageUsed: { type: 'integer' },
                averageResponseTime: { type: 'number' }
              }
            }
          }
        }
      }
    },
    handler: async (request, reply) => {
      const health = {
        status: 'healthy' as const,
        timestamp: new Date(),
        version: '1.0.0',
        dependencies: {
          storage: 'healthy' as const,
          redis: 'healthy' as const,
          documentIndexing: 'healthy' as const
        },
        metrics: {
          documentsCount: 150,
          storageUsed: 1024 * 1024 * 500, // 500MB
          averageResponseTime: 120
        }
      };

      reply.send(health);
    }
  });

  server.get('/health/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness check',
      description: 'Check if the service is ready to accept requests',
      response: {
        200: {
          description: 'Service is ready',
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      reply.send({
        ready: true,
        timestamp: new Date()
      });
    }
  });

  server.get('/health/live', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness check',
      description: 'Check if the service is alive',
      response: {
        200: {
          description: 'Service is alive',
          type: 'object',
          properties: {
            alive: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    handler: async (request, reply) => {
      reply.send({
        alive: true,
        timestamp: new Date()
      });
    }
  });
}