import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', {
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

  app.get('/detailed', {
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
    const systemHealth = await app.analyticsService.getSystemHealth();
    
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

  app.get('/dependencies', {
    schema: {
      summary: 'Dependencies health check',
      description: 'Check the health of all external dependencies',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            dependencies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  status: { 
                    type: 'string', 
                    enum: ['healthy', 'degraded', 'unhealthy'] 
                  },
                  responseTime: { type: 'number' },
                  lastCheck: { type: 'string', format: 'date-time' },
                  error: { type: 'string' },
                  metadata: { type: 'object' },
                },
                required: ['name', 'status', 'responseTime', 'lastCheck'],
              },
            },
            overall: {
              type: 'object',
              properties: {
                status: { 
                  type: 'string', 
                  enum: ['healthy', 'degraded', 'unhealthy'] 
                },
                healthyCount: { type: 'integer' },
                degradedCount: { type: 'integer' },
                unhealthyCount: { type: 'integer' },
              },
            },
          },
          required: ['dependencies', 'overall'],
        },
      },
    },
  }, async (request, reply) => {
    const healthStatus = app.mockDataService.getHealthStatus();
    
    const dependencies = [
      {
        name: 'Vector Database',
        status: healthStatus.dependencies.vectorDatabase,
        responseTime: Math.random() * 0.01 + 0.001,
        lastCheck: new Date(),
        metadata: {
          type: 'pinecone',
          version: '1.0.0',
          region: 'us-east-1',
        },
      },
      {
        name: 'Embedding Service',
        status: healthStatus.dependencies.embeddingService,
        responseTime: Math.random() * 0.05 + 0.01,
        lastCheck: new Date(),
        metadata: {
          type: 'openai',
          model: 'text-embedding-3-small',
          apiVersion: '2023-05-15',
        },
      },
      {
        name: 'Redis Cache',
        status: healthStatus.dependencies.redis,
        responseTime: Math.random() * 0.005 + 0.0005,
        lastCheck: new Date(),
        metadata: {
          type: 'redis',
          version: '7.0.0',
          mode: 'standalone',
        },
      },
      {
        name: 'Text Processor',
        status: healthStatus.dependencies.textProcessor,
        responseTime: Math.random() * 0.02 + 0.005,
        lastCheck: new Date(),
        metadata: {
          type: 'natural',
          version: '6.10.0',
          languages: ['en', 'es', 'fr'],
        },
      },
    ];

    const statusCounts = dependencies.reduce((acc, dep) => {
      acc[dep.status + 'Count']++;
      return acc;
    }, { healthyCount: 0, degradedCount: 0, unhealthyCount: 0 });

    const overall = {
      status: statusCounts.unhealthyCount > 0 ? 'unhealthy' : 
              statusCounts.degradedCount > 0 ? 'degraded' : 'healthy',
      ...statusCounts,
    };

    reply.send({ dependencies, overall });
  });
}