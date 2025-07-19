import { z } from 'zod';
import { OpenAPIV3 } from 'openapi-types';

export const ServiceTypeEnum = z.enum(['rest-api', 'event-driven', 'hybrid', 'cli', 'web-ui']);
export const ContractStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);
export const GenerationStageStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);
export const OutputFormatEnum = z.enum(['json', 'yaml', 'both']);
export const SpecificationFormatEnum = z.enum(['openapi', 'asyncapi', 'combined']);

export const ParameterSpecSchema = z.object({
  name: z.string(),
  in: z.enum(['query', 'path', 'header', 'cookie']),
  description: z.string().optional(),
  required: z.boolean().optional(),
  schema: z.record(z.any()).optional(),
});

export const EndpointSpecSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  description: z.string(),
  requestSchema: z.record(z.any()).optional(),
  responseSchema: z.record(z.any()).optional(),
  parameters: z.array(ParameterSpecSchema).optional(),
});

export const EventSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.record(z.any()).optional(),
  type: z.enum(['published', 'consumed']),
});

export const GenerationOptionsSchema = z.object({
  includeExamples: z.boolean().default(true),
  includeMockData: z.boolean().default(true),
  validateOutput: z.boolean().default(true),
  outputFormat: OutputFormatEnum.default('both'),
});

export const ContractGenerationRequestSchema = z.object({
  serviceName: z.string(),
  serviceType: ServiceTypeEnum,
  requirements: z.string(),
  architecture: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  endpoints: z.array(EndpointSpecSchema).optional(),
  events: z.array(EventSpecSchema).optional(),
  options: GenerationOptionsSchema.optional(),
});

export const GenerationStageSchema = z.object({
  name: z.string(),
  status: GenerationStageStatusEnum,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  message: z.string().optional(),
});

export const ContractGenerationResponseSchema = z.object({
  contractId: z.string(),
  status: ContractStatusEnum,
  estimatedCompletion: z.string().optional(),
  message: z.string().optional(),
});

export const ContractStatusSchema = z.object({
  contractId: z.string(),
  status: ContractStatusEnum,
  progress: z.number().min(0).max(100),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
  stages: z.array(GenerationStageSchema).optional(),
});

export const ContractMetadataSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  requirements: z.string().optional(),
  architecture: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ContractSpecificationSchema = z.object({
  contractId: z.string(),
  serviceName: z.string(),
  openapi: z.record(z.any()).optional(),
  asyncapi: z.record(z.any()).optional(),
  boundaries: z.record(z.any()).optional(),
  metadata: ContractMetadataSchema.optional(),
});

export const ContractRefinementSchema = z.object({
  type: z.enum(['add-endpoint', 'modify-endpoint', 'remove-endpoint', 'add-event', 'modify-event', 'remove-event', 'update-schema']),
  path: z.string(),
  operation: z.record(z.any()).optional(),
  description: z.string().optional(),
});

export const RefinementOptionsSchema = z.object({
  preserveExamples: z.boolean().default(true),
  validateResult: z.boolean().default(true),
  updateVersion: z.boolean().default(true),
});

export const ContractRefinementRequestSchema = z.object({
  refinements: z.array(ContractRefinementSchema),
  options: RefinementOptionsSchema.optional(),
});

export const ContractRefinementResponseSchema = z.object({
  contractId: z.string(),
  applied: z.number(),
  skipped: z.number(),
  errors: z.array(z.any()).optional(),
  updatedAt: z.string(),
});

// Type definitions
export type ServiceType = z.infer<typeof ServiceTypeEnum>;
export type ContractStatus = z.infer<typeof ContractStatusEnum>;
export type GenerationStageStatus = z.infer<typeof GenerationStageStatusEnum>;
export type OutputFormat = z.infer<typeof OutputFormatEnum>;
export type SpecificationFormat = z.infer<typeof SpecificationFormatEnum>;

export type ParameterSpec = z.infer<typeof ParameterSpecSchema>;
export type EndpointSpec = z.infer<typeof EndpointSpecSchema>;
export type EventSpec = z.infer<typeof EventSpecSchema>;
export type GenerationOptions = z.infer<typeof GenerationOptionsSchema>;
export type ContractGenerationRequest = z.infer<typeof ContractGenerationRequestSchema>;
export type GenerationStage = z.infer<typeof GenerationStageSchema>;
export type ContractGenerationResponse = z.infer<typeof ContractGenerationResponseSchema>;
export type ContractStatusResponse = z.infer<typeof ContractStatusSchema>;
export type ContractMetadata = z.infer<typeof ContractMetadataSchema>;
export type ContractSpecification = z.infer<typeof ContractSpecificationSchema>;
export type ContractRefinement = z.infer<typeof ContractRefinementSchema>;
export type RefinementOptions = z.infer<typeof RefinementOptionsSchema>;
export type ContractRefinementRequest = z.infer<typeof ContractRefinementRequestSchema>;
export type ContractRefinementResponse = z.infer<typeof ContractRefinementResponseSchema>;

// Contract generation stages
export const CONTRACT_GENERATION_STAGES = [
  'requirements-analysis',
  'architecture-parsing',
  'openapi-generation',
  'asyncapi-generation',
  'boundary-analysis',
  'validation',
  'stub-generation',
  'finalization',
] as const;

export type ContractGenerationStage = typeof CONTRACT_GENERATION_STAGES[number];

// Contract storage structure
export interface StoredContract {
  id: string;
  serviceName: string;
  serviceType: ServiceType;
  status: ContractStatus;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  stages: GenerationStage[];
  specification?: {
    openapi?: OpenAPIV3.Document;
    asyncapi?: any;
    boundaries?: any;
  };
  metadata?: ContractMetadata;
  originalRequest: ContractGenerationRequest;
}

// Event payloads
export interface ContractGeneratedEvent {
  contractId: string;
  serviceName: string;
  serviceType: ServiceType;
  openapi?: OpenAPIV3.Document;
  asyncapi?: any;
  boundaries?: any;
  generatedAt: string;
  generatedBy: string;
  metadata?: any;
}

export interface ContractValidatedEvent {
  contractId: string;
  serviceName: string;
  valid: boolean;
  score: number;
  errors: any[];
  warnings: any[];
  validatedAt: string;
  validatedBy: string;
}

export interface ContractFailedEvent {
  contractId: string;
  serviceName: string;
  error: string;
  errorCode: string;
  stage: string;
  details?: any;
  failedAt: string;
  retryable: boolean;
  retryCount: number;
}