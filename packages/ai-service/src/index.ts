/**
 * CycleTime AI Service - Provider Abstraction Layer
 * 
 * Phase 1: Core Infrastructure for Multi-Provider AI Integration
 */

// Core Types and Interfaces
export * from './interfaces/ai-types';

// Provider Abstraction Layer
export { BaseAIProvider } from './providers/base-ai-provider';
export { ClaudeProvider } from './providers/claude-provider';

// Service Layer
export { AIProviderManager } from './services/ai-provider-manager';
export { DatabaseService } from './services/database-service';
export { ProviderRegistry } from './services/provider-registry';

// Database Integration
export { prisma, type PrismaClient } from './lib/prisma';

// Re-export types for convenience
export type {
  ProviderDiscoveryResult,
  ProviderCapability,
  ProviderHealthResult,
} from './services/provider-registry';