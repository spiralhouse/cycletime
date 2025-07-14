/**
 * Prisma client instance configuration for AI service
 * References the generated client from the root project
 */

// Import the generated Prisma client from the root project
import { PrismaClient } from '../../../generated/prisma';

// Create singleton instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

export { prisma };
export type { PrismaClient };