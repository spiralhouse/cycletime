import { PrismaClient } from '@prisma/client';
import './jwt.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}