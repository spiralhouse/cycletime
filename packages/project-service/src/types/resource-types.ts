import { z } from 'zod';

// Resource Type
export const ResourceTypeSchema = z.enum(['human', 'financial', 'equipment', 'software']);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

// Capacity Planning Timeframe
export const CapacityTimeframeSchema = z.enum(['week', 'month', 'quarter']);
export type CapacityTimeframe = z.infer<typeof CapacityTimeframeSchema>;

// Resource Period Schema
export const ResourcePeriodSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});
export type ResourcePeriod = z.infer<typeof ResourcePeriodSchema>;

// Resource Schema
export const ResourceSchema = z.object({
  type: ResourceTypeSchema,
  name: z.string(),
  allocated: z.number().min(0),
  available: z.number().min(0),
  utilization: z.number().min(0),
  cost: z.number().min(0),
  period: ResourcePeriodSchema.optional()
});
export type Resource = z.infer<typeof ResourceSchema>;

// Resource Summary Schema
export const ResourceSummarySchema = z.object({
  totalBudget: z.number().min(0),
  usedBudget: z.number().min(0),
  remainingBudget: z.number(),
  totalHours: z.number().min(0),
  allocatedHours: z.number().min(0),
  availableHours: z.number().min(0),
  utilizationRate: z.number().min(0)
});
export type ResourceSummary = z.infer<typeof ResourceSummarySchema>;

// Resource Allocation Response Schema
export const ResourceAllocationResponseSchema = z.object({
  projectId: z.string().uuid(),
  resources: z.array(ResourceSchema),
  summary: ResourceSummarySchema
});
export type ResourceAllocationResponse = z.infer<typeof ResourceAllocationResponseSchema>;

// Allocate Resource Item Schema
export const AllocateResourceItemSchema = z.object({
  type: ResourceTypeSchema,
  name: z.string(),
  amount: z.number().min(0),
  cost: z.number().min(0),
  period: ResourcePeriodSchema.optional(),
  metadata: z.record(z.any()).optional()
});
export type AllocateResourceItem = z.infer<typeof AllocateResourceItemSchema>;

// Allocate Resources Request Schema
export const AllocateResourcesRequestSchema = z.object({
  resources: z.array(AllocateResourceItemSchema)
});
export type AllocateResourcesRequest = z.infer<typeof AllocateResourcesRequestSchema>;

// Team Member Capacity Schema
export const TeamMemberCapacitySchema = z.object({
  memberId: z.string().uuid(),
  memberName: z.string(),
  totalHours: z.number().min(0),
  allocatedHours: z.number().min(0),
  availableHours: z.number().min(0),
  skills: z.array(z.string())
});
export type TeamMemberCapacity = z.infer<typeof TeamMemberCapacitySchema>;

// Capacity Summary Schema
export const CapacitySummarySchema = z.object({
  totalCapacity: z.number().min(0),
  allocatedCapacity: z.number().min(0),
  availableCapacity: z.number().min(0),
  utilizationRate: z.number().min(0)
});
export type CapacitySummary = z.infer<typeof CapacitySummarySchema>;

// Capacity Forecast Item Schema
export const CapacityForecastItemSchema = z.object({
  period: z.string().date(),
  requiredCapacity: z.number().min(0),
  availableCapacity: z.number().min(0),
  gap: z.number(),
  recommendations: z.array(z.string())
});
export type CapacityForecastItem = z.infer<typeof CapacityForecastItemSchema>;

// Capacity Planning Response Schema
export const CapacityPlanningResponseSchema = z.object({
  projectId: z.string().uuid(),
  timeframe: CapacityTimeframeSchema,
  capacity: CapacitySummarySchema,
  teamCapacity: z.array(TeamMemberCapacitySchema),
  forecast: z.array(CapacityForecastItemSchema)
});
export type CapacityPlanningResponse = z.infer<typeof CapacityPlanningResponseSchema>;