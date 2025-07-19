import { z } from 'zod';

export const ServiceDependencySchema = z.object({
  service: z.string(),
  type: z.enum(['synchronous', 'asynchronous', 'eventual']),
  endpoints: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const ServiceCapabilitySchema = z.object({
  name: z.string(),
  description: z.string(),
  endpoints: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
});

export const ServiceIntegrationSchema = z.object({
  service: z.string(),
  pattern: z.enum(['request-response', 'event-driven', 'pub-sub', 'streaming']),
  protocol: z.enum(['http', 'websocket', 'grpc', 'message-queue']),
  authentication: z.enum(['none', 'api-key', 'jwt', 'oauth2', 'mutual-tls']),
});

export const SystemBoundariesSchema = z.object({
  service: z.string(),
  dependencies: z.array(ServiceDependencySchema),
  provides: z.array(ServiceCapabilitySchema),
  integrations: z.array(ServiceIntegrationSchema).optional(),
});

export const ServiceBoundarySchema = z.object({
  service: z.string(),
  responsibilities: z.array(z.string()),
  dataOwnership: z.array(z.string()).optional(),
  securityScope: z.enum(['public', 'internal', 'restricted', 'private']),
  scalingCharacteristics: z.object({
    pattern: z.enum(['cpu-bound', 'io-bound', 'memory-bound', 'mixed']).optional(),
    expectedLoad: z.enum(['low', 'medium', 'high', 'variable']).optional(),
  }).optional(),
});

export const ServiceInteractionSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['synchronous', 'asynchronous', 'batch', 'streaming']),
  protocol: z.string(),
  dataFlow: z.string().optional(),
  frequency: z.enum(['rare', 'occasional', 'frequent', 'constant']).optional(),
  consistency: z.enum(['strong', 'eventual', 'weak']).optional(),
});

// Type definitions
export type ServiceDependency = z.infer<typeof ServiceDependencySchema>;
export type ServiceCapability = z.infer<typeof ServiceCapabilitySchema>;
export type ServiceIntegration = z.infer<typeof ServiceIntegrationSchema>;
export type SystemBoundaries = z.infer<typeof SystemBoundariesSchema>;
export type ServiceBoundary = z.infer<typeof ServiceBoundarySchema>;
export type ServiceInteraction = z.infer<typeof ServiceInteractionSchema>;

// Service definition structure
export interface ServiceDefinition {
  id: string;
  name: string;
  type: 'rest-api' | 'event-driven' | 'hybrid' | 'cli' | 'web-ui';
  description: string;
  requirements: string;
  architecture: string;
  dependencies: ServiceDependency[];
  provides: ServiceCapability[];
  integrations: ServiceIntegration[];
  boundaries: SystemBoundaries;
  createdAt: Date;
  updatedAt: Date;
  version: string;
  status: 'draft' | 'active' | 'deprecated' | 'archived';
}