import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
import { setupMiddleware } from './middleware/index.js';
import { setupRoutes } from './routes/index.js';
import { authMiddleware } from './middleware/auth.js';
import './types/fastify.js';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Create Fastify instance
const fastify = Fastify({
  logger: true,
  requestIdLogLabel: 'requestId',
  genReqId: () => crypto.randomUUID(),
});

// Add Prisma to Fastify instance
fastify.decorate('prisma', prisma);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await fastify.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    fastify.log.info('Database connected successfully');

    // Register JWT plugin
    await fastify.register(import('@fastify/jwt'), {
      secret: config.jwtSecret,
      sign: {
        algorithm: 'HS256',
      },
      verify: {
        algorithms: ['HS256'],
      },
    });

    // Setup middleware
    await setupMiddleware(fastify as any);
    
    // Setup authentication middleware
    await authMiddleware(fastify as any);
    
    // Setup routes
    await setupRoutes(fastify as any);

    // Start server
    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`API Gateway running at ${address}`);
  } catch (error) {
    fastify.log.error('Error starting server:', error);
    process.exit(1);
  }
};

// Import types for Fastify instance

start();