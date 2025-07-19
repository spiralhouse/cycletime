import { z } from 'zod';

export const BoundaryRecommendationTypeEnum = z.enum([
  'split-service',
  'merge-services',
  'extract-shared-component',
  'add-gateway',
  'add-cache'
]);

export const BoundaryAnalysisOptionsSchema = z.object({
  includeDataFlow: z.boolean().default(true),
  includeSecurityBoundaries: z.boolean().default(true),
  includePerformanceRequirements: z.boolean().default(false),
});

export const BoundaryRecommendationSchema = z.object({
  type: BoundaryRecommendationTypeEnum,
  description: z.string(),
  rationale: z.string(),
  impact: z.enum(['low', 'medium', 'high']),
  effort: z.enum(['low', 'medium', 'high']),
});

export const BoundaryAnalysisRequestSchema = z.object({
  services: z.array(z.string()),
  architecture: z.string().optional(),
  requirements: z.string().optional(),
  options: BoundaryAnalysisOptionsSchema.optional(),
});

export const BoundaryAnalysisResponseSchema = z.object({
  analysisId: z.string(),
  services: z.array(z.any()), // ServiceBoundary array
  interactions: z.array(z.any()), // ServiceInteraction array
  recommendations: z.array(BoundaryRecommendationSchema),
  generatedAt: z.string(),
});

// Type definitions
export type BoundaryRecommendationType = z.infer<typeof BoundaryRecommendationTypeEnum>;
export type BoundaryAnalysisOptions = z.infer<typeof BoundaryAnalysisOptionsSchema>;
export type BoundaryRecommendation = z.infer<typeof BoundaryRecommendationSchema>;
export type BoundaryAnalysisRequest = z.infer<typeof BoundaryAnalysisRequestSchema>;
export type BoundaryAnalysisResponse = z.infer<typeof BoundaryAnalysisResponseSchema>;

// Boundary analysis context
export interface BoundaryAnalysisContext {
  analysisId: string;
  requestedServices: string[];
  architecture?: string;
  requirements?: string;
  options: BoundaryAnalysisOptions;
  timestamp: Date;
}

// Service boundary patterns
export const BOUNDARY_PATTERNS = {
  'database-per-service': {
    name: 'Database per Service',
    description: 'Each service owns its data and database',
    benefits: ['Data isolation', 'Independent scaling', 'Technology diversity'],
    challenges: ['Data consistency', 'Query complexity', 'Transaction management'],
  },
  'shared-database': {
    name: 'Shared Database',
    description: 'Multiple services share the same database',
    benefits: ['Simple queries', 'ACID transactions', 'Consistency'],
    challenges: ['Coupling', 'Scaling bottlenecks', 'Schema evolution'],
  },
  'api-gateway': {
    name: 'API Gateway',
    description: 'Single entry point for all client requests',
    benefits: ['Request routing', 'Authentication', 'Rate limiting'],
    challenges: ['Single point of failure', 'Latency', 'Complexity'],
  },
  'event-driven': {
    name: 'Event-Driven',
    description: 'Services communicate through events',
    benefits: ['Loose coupling', 'Scalability', 'Resilience'],
    challenges: ['Eventual consistency', 'Complexity', 'Event ordering'],
  },
  'saga-pattern': {
    name: 'Saga Pattern',
    description: 'Distributed transaction management',
    benefits: ['Consistency', 'Fault tolerance', 'Scalability'],
    challenges: ['Complexity', 'Compensation logic', 'State management'],
  },
} as const;

export type BoundaryPattern = keyof typeof BOUNDARY_PATTERNS;

// Service interaction types
export const INTERACTION_TYPES = {
  synchronous: {
    name: 'Synchronous',
    description: 'Request-response pattern with immediate response',
    protocols: ['HTTP', 'gRPC', 'WebSocket'],
    useCases: ['User interfaces', 'Real-time queries', 'Immediate feedback'],
  },
  asynchronous: {
    name: 'Asynchronous',
    description: 'Fire-and-forget pattern with eventual response',
    protocols: ['Message Queue', 'Event Bus', 'Webhook'],
    useCases: ['Background processing', 'Batch operations', 'Notifications'],
  },
  streaming: {
    name: 'Streaming',
    description: 'Continuous data flow between services',
    protocols: ['WebSocket', 'Server-Sent Events', 'Message Streams'],
    useCases: ['Real-time data', 'Live updates', 'Monitoring'],
  },
  batch: {
    name: 'Batch',
    description: 'Periodic bulk data processing',
    protocols: ['File Transfer', 'Bulk API', 'ETL Pipeline'],
    useCases: ['Data migration', 'Reports', 'Analytics'],
  },
} as const;

export type InteractionType = keyof typeof INTERACTION_TYPES;

// Boundary analysis algorithms
export interface BoundaryAnalysisAlgorithm {
  id: string;
  name: string;
  description: string;
  analyze: (context: BoundaryAnalysisContext) => Promise<BoundaryAnalysisResponse>;
}

// Data flow analysis
export interface DataFlowAnalysis {
  serviceId: string;
  incomingDataTypes: string[];
  outgoingDataTypes: string[];
  dataTransformations: string[];
  dataStorage: string[];
  dataRetention: string[];
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
}

// Performance analysis
export interface PerformanceAnalysis {
  serviceId: string;
  expectedThroughput: number;
  expectedLatency: number;
  scalingRequirements: string[];
  resourceRequirements: {
    cpu: string;
    memory: string;
    storage: string;
    network: string;
  };
  bottlenecks: string[];
}