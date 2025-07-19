import { z } from 'zod';

// Project Status
export const ProjectStatusSchema = z.enum(['active', 'archived', 'on_hold', 'planning', 'completed']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// Project Visibility
export const ProjectVisibilitySchema = z.enum(['public', 'private', 'internal']);
export type ProjectVisibility = z.infer<typeof ProjectVisibilitySchema>;

// Project Priority
export const ProjectPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>;

// Team Member Role
export const TeamMemberRoleSchema = z.enum(['owner', 'admin', 'member', 'contributor', 'viewer']);
export type TeamMemberRole = z.infer<typeof TeamMemberRoleSchema>;

// Team Member Permissions
export const TeamMemberPermissionSchema = z.enum(['read', 'write', 'delete', 'manage_team', 'manage_settings']);
export type TeamMemberPermission = z.infer<typeof TeamMemberPermissionSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email()
});
export type User = z.infer<typeof UserSchema>;

// Timeline Schema
export const TimelineSchema = z.object({
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  milestones: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    dueDate: z.string().datetime(),
    completed: z.boolean()
  })).optional()
});
export type Timeline = z.infer<typeof TimelineSchema>;

// Resources Schema
export const ResourcesSchema = z.object({
  budget: z.number().nullable().optional(),
  budgetUsed: z.number().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  actualHours: z.number().nullable().optional()
});
export type Resources = z.infer<typeof ResourcesSchema>;

// Integration Schema
export const IntegrationsSchema = z.object({
  github: z.object({
    repository: z.string().nullable().optional(),
    enabled: z.boolean().default(false)
  }).optional(),
  linear: z.object({
    projectId: z.string().nullable().optional(),
    enabled: z.boolean().default(false)
  }).optional(),
  slack: z.object({
    channel: z.string().nullable().optional(),
    enabled: z.boolean().default(false)
  }).optional()
});
export type Integrations = z.infer<typeof IntegrationsSchema>;

// Project Settings Schema
export const ProjectSettingsSchema = z.object({
  notifications: z.object({
    email: z.boolean().default(true),
    slack: z.boolean().default(false),
    inApp: z.boolean().default(true)
  }),
  permissions: z.object({
    allowGuestAccess: z.boolean().default(false),
    requireApproval: z.boolean().default(false)
  }),
  automation: z.object({
    autoAssign: z.boolean().default(false),
    autoProgress: z.boolean().default(false),
    autoNotify: z.boolean().default(true)
  })
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

// Team Member Allocation Schema
export const TeamMemberAllocationSchema = z.object({
  percentage: z.number().min(0).max(100).optional(),
  hoursPerWeek: z.number().min(0).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional()
});
export type TeamMemberAllocation = z.infer<typeof TeamMemberAllocationSchema>;

// Team Member Schema
export const TeamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: TeamMemberRoleSchema,
  permissions: z.array(TeamMemberPermissionSchema),
  allocation: TeamMemberAllocationSchema.optional(),
  addedAt: z.string().datetime(),
  addedBy: z.string().uuid()
});
export type TeamMember = z.infer<typeof TeamMemberSchema>;

// Audit Schema
export const AuditSchema = z.object({
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedBy: z.string().uuid(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive()
});
export type Audit = z.infer<typeof AuditSchema>;

// Template Reference Schema
export const TemplateReferenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string()
});
export type TemplateReference = z.infer<typeof TemplateReferenceSchema>;

// Project Schema
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  status: ProjectStatusSchema,
  visibility: ProjectVisibilitySchema,
  priority: ProjectPrioritySchema,
  progress: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  owner: UserSchema,
  template: TemplateReferenceSchema.nullable().optional(),
  timeline: TimelineSchema.optional(),
  resources: ResourcesSchema.optional(),
  integrations: IntegrationsSchema.optional(),
  team: z.array(TeamMemberSchema).optional(),
  settings: ProjectSettingsSchema.optional(),
  audit: AuditSchema
});
export type Project = z.infer<typeof ProjectSchema>;

// Create Project Request Schema
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateId: z.string().uuid().nullable().optional(),
  visibility: ProjectVisibilitySchema.default('private'),
  priority: ProjectPrioritySchema.default('medium'),
  tags: z.array(z.string()).default([]),
  timeline: TimelineSchema.optional(),
  resources: ResourcesSchema.optional(),
  integrations: IntegrationsSchema.optional(),
  metadata: z.record(z.any()).optional()
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

// Update Project Request Schema
export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  visibility: ProjectVisibilitySchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  timeline: TimelineSchema.optional(),
  resources: ResourcesSchema.optional(),
  integrations: IntegrationsSchema.optional(),
  metadata: z.record(z.any()).optional(),
  version: z.number().int().positive().optional()
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

// Add Team Member Request Schema
export const AddTeamMemberRequestSchema = z.object({
  userId: z.string().uuid(),
  role: TeamMemberRoleSchema.default('member'),
  permissions: z.array(TeamMemberPermissionSchema).default(['read']),
  allocation: TeamMemberAllocationSchema.optional()
});
export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberRequestSchema>;

// Update Team Member Request Schema
export const UpdateTeamMemberRequestSchema = z.object({
  role: TeamMemberRoleSchema.optional(),
  permissions: z.array(TeamMemberPermissionSchema).optional(),
  allocation: TeamMemberAllocationSchema.optional()
});
export type UpdateTeamMemberRequest = z.infer<typeof UpdateTeamMemberRequestSchema>;

// Pagination Schema
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().non_negative(),
  totalPages: z.number().int().non_negative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean()
});
export type Pagination = z.infer<typeof PaginationSchema>;

// Project List Response Schema
export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  pagination: PaginationSchema,
  filters: z.object({
    status: z.string().optional(),
    owner: z.string().optional(),
    search: z.string().optional()
  }).optional()
});
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;

// Project Response Schema
export const ProjectResponseSchema = z.object({
  project: ProjectSchema
});
export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;

// Team Statistics Schema
export const TeamStatisticsSchema = z.object({
  totalMembers: z.number().int().non_negative(),
  activeMembers: z.number().int().non_negative(),
  totalAllocation: z.number().min(0),
  averageAllocation: z.number().min(0)
});
export type TeamStatistics = z.infer<typeof TeamStatisticsSchema>;

// Project Team Response Schema
export const ProjectTeamResponseSchema = z.object({
  projectId: z.string().uuid(),
  team: z.array(TeamMemberSchema),
  statistics: TeamStatisticsSchema.optional()
});
export type ProjectTeamResponse = z.infer<typeof ProjectTeamResponseSchema>;

// Team Member Response Schema
export const TeamMemberResponseSchema = z.object({
  member: TeamMemberSchema
});
export type TeamMemberResponse = z.infer<typeof TeamMemberResponseSchema>;

// Health Status Schema
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

// Health Response Schema
export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  timestamp: z.string().datetime(),
  version: z.string(),
  dependencies: z.object({
    redis: HealthStatusSchema.optional(),
    queue: HealthStatusSchema.optional()
  }).optional(),
  metrics: z.object({
    projectsCount: z.number().int().non_negative().optional(),
    activeProjects: z.number().int().non_negative().optional(),
    templatesCount: z.number().int().non_negative().optional(),
    averageTeamSize: z.number().min(0).optional()
  }).optional()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Error Response Schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  details: z.record(z.any()).optional()
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;