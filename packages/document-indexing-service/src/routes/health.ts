import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      summary: 'Health check',
      description: 'Check if the document indexing service is healthy and operational',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { 
              type: 'string', 
              enum: ['healthy', 'degraded', 'unhealthy'] 
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time' 
            },
            version: { 
              type: 'string' 
            },
            dependencies: {
              type: 'object',
              properties: {
                vectorDatabase: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                embeddingService: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                redis: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                textProcessor: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                indexCount: { type: 'integer' },
                totalDocuments: { type: 'integer' },
                averageResponseTime: { type: 'number' },
                memoryUsage: { type: 'number' },
                diskUsage: { type: 'number' },
              },
            },
          },
          required: ['status', 'timestamp', 'version'],
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = app.mockDataService.getHealthStatus();
    reply.send(healthStatus);
  });

  app.get('/health/detailed', {
    schema: {
      summary: 'Detailed health check',
      description: 'Get detailed health information including component status and metrics',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { 
              type: 'string', 
              enum: ['healthy', 'degraded', 'unhealthy'] 
            },
            timestamp: { 
              type: 'string', 
              format: 'date-time' 
            },
            version: { 
              type: 'string' 
            },
            uptime: { 
              type: 'number',
              description: 'Uptime in seconds'
            },
            components: {
              type: 'object',
              properties: {
                vectorDatabase: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    lastCheck: { type: 'string', format: 'date-time' },
                  },
                },
                embeddingService: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    lastCheck: { type: 'string', format: 'date-time' },
                  },
                },
                redis: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    lastCheck: { type: 'string', format: 'date-time' },
                  },
                },
                textProcessor: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    responseTime: { type: 'number' },
                    lastCheck: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
            metrics: {
              type: 'object',
              properties: {
                indexCount: { type: 'integer' },
                totalDocuments: { type: 'integer' },
                totalEmbeddings: { type: 'integer' },
                averageResponseTime: { type: 'number' },
                memoryUsage: { type: 'number' },
                diskUsage: { type: 'number' },
                cpuUsage: { type: 'number' },
                activeConnections: { type: 'integer' },
                queueLength: { type: 'integer' },
              },
            },
          },
          required: ['status', 'timestamp', 'version'],
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = app.mockDataService.getHealthStatus();
    const systemHealth = await app.analyticsService!.getSystemHealth();
    
    const detailedHealth = {
      ...healthStatus,
      uptime: systemHealth.uptime * 86400, // Convert to seconds
      components: {
        vectorDatabase: {
          status: healthStatus.dependencies.vectorDatabase,
          responseTime: Math.random() * 0.01 + 0.001,
          lastCheck: new Date(),
        },
        embeddingService: {
          status: healthStatus.dependencies.embeddingService,
          responseTime: Math.random() * 0.05 + 0.01,
          lastCheck: new Date(),
        },
        redis: {
          status: healthStatus.dependencies.redis,
          responseTime: Math.random() * 0.005 + 0.0005,
          lastCheck: new Date(),
        },
        textProcessor: {
          status: healthStatus.dependencies.textProcessor,
          responseTime: Math.random() * 0.02 + 0.005,
          lastCheck: new Date(),
        },
      },
      metrics: {
        ...healthStatus.metrics,
        totalEmbeddings: app.mockDataService.getEmbeddings().length,
        cpuUsage: systemHealth.resourceUsage.cpu,
        activeConnections: systemHealth.activeConnections,
        queueLength: systemHealth.queueLength,
      },
    };
    
    reply.send(detailedHealth);
  });

  app.get('/health/dependencies', {
    schema: {
      summary: 'Dependencies health check',
      description: 'Check the health of all external dependencies',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            dependencies: {
              type: 'object',
              properties: {
                vectorDatabase: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                embeddingService: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                redis: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                textProcessor: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
              },
            },
          },
          required: ['dependencies'],
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = app.mockDataService.getHealthStatus();
    
    // Return dependencies in the same format as the main health endpoint
    const dependencies = {
      vectorDatabase: healthStatus.dependencies.vectorDatabase,
      embeddingService: healthStatus.dependencies.embeddingService,
      redis: healthStatus.dependencies.redis,
      textProcessor: healthStatus.dependencies.textProcessor,
    };

    reply.send({ dependencies });
  });
}