import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Health status schema
const healthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  version: z.string(),
  uptime: z.number(),
  dependencies: z.object({
    database: z.enum(['healthy', 'unhealthy']),
    github_api: z.enum(['healthy', 'unhealthy']),
  }),
  metrics: z.object({
    uptime_seconds: z.number(),
    memory_usage_mb: z.number(),
    active_connections: z.number(),
  }),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const healthRoutes = async (fastify: FastifyInstance) => {
  // Basic health check
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    
    // Check database connectivity
    let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      // Only check database if Prisma is available
      if (fastify.prisma) {
        await fastify.prisma.$queryRaw`SELECT 1`;
      } else {
        // In test environment or when database is not configured, mark as healthy
        databaseStatus = 'healthy';
      }
    } catch (error) {
      databaseStatus = 'unhealthy';
      request.log.error('Database health check failed', error);
    }

    // Check GitHub API (basic connectivity)
    let githubApiStatus: 'healthy' | 'unhealthy' = 'healthy';
    
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (!response.ok) {
        githubApiStatus = 'unhealthy';
      }
    } catch (error) {
      githubApiStatus = 'unhealthy';
      request.log.warn('GitHub API health check failed', error);
    }

    // Calculate memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (databaseStatus === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (githubApiStatus === 'unhealthy') {
      overallStatus = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      dependencies: {
        database: databaseStatus,
        github_api: githubApiStatus,
      },
      metrics: {
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: memoryUsageMB,
        active_connections: 0, // Will be implemented with connection tracking
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return reply.status(statusCode).send(healthStatus);
  });

  // Readiness probe (for Kubernetes)
  fastify.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if we can connect to the database
      await fastify.prisma.$queryRaw`SELECT 1`;
      
      return reply.status(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Readiness check failed', error);
      return reply.status(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // Liveness probe (for Kubernetes)
  fastify.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Version endpoint
  fastify.get('/version', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      version: process.env.npm_package_version || '0.1.0',
      name: '@cycletime/api-gateway',
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  });
};