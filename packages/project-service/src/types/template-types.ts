import { z } from 'zod';

// Template Category
export const TemplateCategorySchema = z.enum(['agile', 'waterfall', 'kanban', 'scrum', 'custom']);
export type TemplateCategory = z.infer<typeof TemplateCategorySchema>;

// Template Visibility
export const TemplateVisibilitySchema = z.enum(['public', 'private', 'organization']);
export type TemplateVisibility = z.infer<typeof TemplateVisibilitySchema>;

// Template Phase Schema
export const TemplatePhaseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  dependencies: z.array(z.string()).default([])
});
export type TemplatePhase = z.infer<typeof TemplatePhaseSchema>;

// Template Task Schema
export const TemplateTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  estimatedHours: z.number().min(0).optional(),
  phase: z.string().optional(),
  dependencies: z.array(z.string()).default([])
});
export type TemplateTask = z.infer<typeof TemplateTaskSchema>;

// Template Role Schema
export const TemplateRoleSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()).default([]),
  defaultAllocation: z.number().min(0).max(100).optional()
});
export type TemplateRole = z.infer<typeof TemplateRoleSchema>;

// Template Configuration Schema
export const TemplateConfigurationSchema = z.object({
  phases: z.array(TemplatePhaseSchema).default([]),
  taskTemplates: z.array(TemplateTaskSchema).default([]),
  roles: z.array(TemplateRoleSchema).default([])
});
export type TemplateConfiguration = z.infer<typeof TemplateConfigurationSchema>;

// Template Metadata Schema
export const TemplateMetadataSchema = z.object({
  author: z.string().optional(),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
  usageCount: z.number().int().non_negative().default(0)
});
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

// Template Audit Schema
export const TemplateAuditSchema = z.object({
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedBy: z.string().uuid(),
  updatedAt: z.string().datetime()
});
export type TemplateAudit = z.infer<typeof TemplateAuditSchema>;

// Project Template Schema
export const ProjectTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  category: TemplateCategorySchema,
  visibility: TemplateVisibilitySchema,
  configuration: TemplateConfigurationSchema,
  metadata: TemplateMetadataSchema.optional(),
  audit: TemplateAuditSchema
});
export type ProjectTemplate = z.infer<typeof ProjectTemplateSchema>;

// Create Template Request Schema
export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: TemplateCategorySchema,
  visibility: TemplateVisibilitySchema.default('private'),
  configuration: TemplateConfigurationSchema,
  metadata: z.object({
    tags: z.array(z.string()).default([])
  }).optional()
});
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;

// Update Template Request Schema
export const UpdateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: TemplateCategorySchema.optional(),
  visibility: TemplateVisibilitySchema.optional(),
  configuration: TemplateConfigurationSchema.optional(),
  metadata: TemplateMetadataSchema.optional()
});
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>;

// Apply Template Request Schema
export const ApplyTemplateRequestSchema = z.object({
  templateId: z.string().uuid(),
  configuration: z.object({
    preserveExisting: z.boolean().default(false),
    phaseMapping: z.record(z.string()).optional(),
    customizations: z.record(z.any()).optional()
  }).optional()
});
export type ApplyTemplateRequest = z.infer<typeof ApplyTemplateRequestSchema>;

// Template Recommendation Schema
export const TemplateRecommendationSchema = z.object({
  template: ProjectTemplateSchema,
  score: z.number().min(0).max(1),
  reasons: z.array(z.string())
});
export type TemplateRecommendation = z.infer<typeof TemplateRecommendationSchema>;

// Template Response Schema
export const TemplateResponseSchema = z.object({
  template: ProjectTemplateSchema
});
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>;

// Template List Response Schema
export const TemplateListResponseSchema = z.object({
  templates: z.array(ProjectTemplateSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().non_negative(),
    totalPages: z.number().int().non_negative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean()
  })
});
export type TemplateListResponse = z.infer<typeof TemplateListResponseSchema>;

// Project Templates Response Schema
export const ProjectTemplatesResponseSchema = z.object({
  projectId: z.string().uuid(),
  templates: z.array(ProjectTemplateSchema),
  recommendations: z.array(TemplateRecommendationSchema).optional()
});
export type ProjectTemplatesResponse = z.infer<typeof ProjectTemplatesResponseSchema>;