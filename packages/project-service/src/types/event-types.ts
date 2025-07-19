import { z } from 'zod';

// Event Type
export const EventTypeSchema = z.enum([
  'project.created',
  'project.updated',
  'project.deleted',
  'project.status_changed',
  'project.team.member_added',
  'project.team.member_removed',
  'project.team.member_role_changed',
  'project.template.applied',
  'project.milestone.reached',
  'project.milestone.missed',
  'project.analytics.updated',
  'project.resource.allocated',
  'project.resource.deallocated',
  'project.budget.threshold_reached',
  'project.deadline.approaching',
  'project.risk.identified',
  'project.insight.generated',
  'template.created',
  'template.updated',
  'template.deleted'
]);
export type EventType = z.infer<typeof EventTypeSchema>;

// Base Event Payload Schema
export const BaseEventPayloadSchema = z.object({
  eventId: z.string().uuid(),
  eventType: EventTypeSchema,
  timestamp: z.string().datetime(),
  source: z.string().default('project-service'),
  version: z.string().default('1.0'),
  userId: z.string().uuid().optional(),
  correlationId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});
export type BaseEventPayload = z.infer<typeof BaseEventPayloadSchema>;

// Project Event Data Schema
export const ProjectEventDataSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  owner: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string()
  }).optional()
});
export type ProjectEventData = z.infer<typeof ProjectEventDataSchema>;

// Template Event Data Schema
export const TemplateEventDataSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string(),
  category: z.string()
});
export type TemplateEventData = z.infer<typeof TemplateEventDataSchema>;

// Team Member Event Data Schema
export const TeamMemberEventDataSchema = z.object({
  member: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
    role: z.string()
  })
});
export type TeamMemberEventData = z.infer<typeof TeamMemberEventDataSchema>;

// Change Event Data Schema
export const ChangeEventDataSchema = z.object({
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable()
  }))
});
export type ChangeEventData = z.infer<typeof ChangeEventDataSchema>;

// Project Created Event Schema
export const ProjectCreatedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.created'),
  data: ProjectEventDataSchema.extend({
    description: z.string().optional(),
    status: z.string(),
    visibility: z.string(),
    priority: z.string(),
    template: z.object({
      id: z.string().uuid(),
      name: z.string(),
      category: z.string()
    }).optional(),
    timeline: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional()
    }).optional(),
    resources: z.object({
      budget: z.number().optional(),
      estimatedHours: z.number().optional()
    }).optional(),
    tags: z.array(z.string()).optional()
  })
});
export type ProjectCreatedEvent = z.infer<typeof ProjectCreatedEventSchema>;

// Project Updated Event Schema
export const ProjectUpdatedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.updated'),
  data: ProjectEventDataSchema.merge(ChangeEventDataSchema).extend({
    currentState: z.object({
      name: z.string(),
      description: z.string().optional(),
      status: z.string(),
      visibility: z.string(),
      priority: z.string(),
      progress: z.number(),
      updatedAt: z.string().datetime()
    })
  })
});
export type ProjectUpdatedEvent = z.infer<typeof ProjectUpdatedEventSchema>;

// Project Deleted Event Schema
export const ProjectDeletedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.deleted'),
  data: ProjectEventDataSchema.extend({
    permanent: z.boolean(),
    deletedAt: z.string().datetime()
  })
});
export type ProjectDeletedEvent = z.infer<typeof ProjectDeletedEventSchema>;

// Team Member Added Event Schema
export const TeamMemberAddedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.team.member_added'),
  data: ProjectEventDataSchema.merge(TeamMemberEventDataSchema).extend({
    addedBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string()
    })
  })
});
export type TeamMemberAddedEvent = z.infer<typeof TeamMemberAddedEventSchema>;

// Template Applied Event Schema
export const TemplateAppliedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.template.applied'),
  data: ProjectEventDataSchema.extend({
    template: TemplateEventDataSchema.extend({
      version: z.string()
    }),
    appliedBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string()
    }),
    configuration: z.object({
      preserveExisting: z.boolean().optional(),
      customizations: z.record(z.any()).optional()
    }).optional(),
    results: z.object({
      tasksCreated: z.number().int().non_negative(),
      milestonesAdded: z.number().int().non_negative(),
      rolesConfigured: z.number().int().non_negative()
    }).optional()
  })
});
export type TemplateAppliedEvent = z.infer<typeof TemplateAppliedEventSchema>;

// Milestone Reached Event Schema
export const MilestoneReachedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.milestone.reached'),
  data: ProjectEventDataSchema.extend({
    milestone: z.object({
      id: z.string().uuid(),
      title: z.string(),
      description: z.string().optional(),
      dueDate: z.string().datetime(),
      completedAt: z.string().datetime(),
      progress: z.number()
    }),
    completedBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string()
    }).optional(),
    impact: z.object({
      progressIncrement: z.number(),
      nextMilestones: z.array(z.string()).optional(),
      risksReduced: z.array(z.string()).optional()
    }).optional()
  })
});
export type MilestoneReachedEvent = z.infer<typeof MilestoneReachedEventSchema>;

// Analytics Updated Event Schema
export const AnalyticsUpdatedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.analytics.updated'),
  data: ProjectEventDataSchema.extend({
    analyticsType: z.enum(['performance', 'velocity', 'burndown', 'forecasting', 'team']),
    timeRange: z.string(),
    metrics: z.object({
      previousValue: z.number().optional(),
      currentValue: z.number(),
      trend: z.enum(['improving', 'stable', 'declining']),
      percentageChange: z.number().optional()
    }),
    insights: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      message: z.string()
    })).optional(),
    generatedAt: z.string().datetime()
  })
});
export type AnalyticsUpdatedEvent = z.infer<typeof AnalyticsUpdatedEventSchema>;

// Risk Identified Event Schema
export const RiskIdentifiedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.risk.identified'),
  data: ProjectEventDataSchema.extend({
    risk: z.object({
      id: z.string().uuid(),
      type: z.enum(['schedule', 'budget', 'scope', 'team', 'technical', 'external']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      probability: z.number().min(0).max(1),
      title: z.string(),
      description: z.string(),
      impact: z.string(),
      identifiedBy: z.enum(['ai_analysis', 'user_report', 'system_monitoring'])
    }),
    evidence: z.array(z.object({
      type: z.string(),
      value: z.string(),
      source: z.string()
    })).optional(),
    mitigation: z.object({
      recommended: z.array(z.string()),
      effort: z.enum(['low', 'medium', 'high']),
      timeline: z.string()
    }).optional(),
    estimatedImpact: z.object({
      schedule: z.number().optional(),
      budget: z.number().optional(),
      scope: z.string().optional()
    }).optional()
  })
});
export type RiskIdentifiedEvent = z.infer<typeof RiskIdentifiedEventSchema>;

// Insight Generated Event Schema
export const InsightGeneratedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('project.insight.generated'),
  data: ProjectEventDataSchema.extend({
    insight: z.object({
      id: z.string().uuid(),
      category: z.enum(['performance', 'risks', 'opportunities', 'team', 'timeline']),
      type: z.enum(['warning', 'recommendation', 'observation', 'alert']),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      impact: z.string()
    }),
    evidence: z.array(z.object({
      metric: z.string(),
      value: z.string(),
      trend: z.string()
    })).optional(),
    recommendations: z.array(z.object({
      action: z.string(),
      priority: z.string(),
      effort: z.string(),
      expectedImpact: z.string()
    })).optional(),
    generatedBy: z.enum(['ai_analysis', 'user_feedback', 'system_monitoring']),
    modelVersion: z.string().optional()
  })
});
export type InsightGeneratedEvent = z.infer<typeof InsightGeneratedEventSchema>;

// Template Created Event Schema
export const TemplateCreatedEventSchema = BaseEventPayloadSchema.extend({
  eventType: z.literal('template.created'),
  data: TemplateEventDataSchema.extend({
    description: z.string().optional(),
    visibility: z.string(),
    createdBy: z.object({
      id: z.string().uuid(),
      name: z.string(),
      email: z.string()
    }),
    configuration: z.object({
      phases: z.number().int().non_negative(),
      taskTemplates: z.number().int().non_negative(),
      roles: z.number().int().non_negative()
    }),
    metadata: z.object({
      tags: z.array(z.string()).optional(),
      version: z.string().optional()
    }).optional()
  })
});
export type TemplateCreatedEvent = z.infer<typeof TemplateCreatedEventSchema>;

// Union of all event types
export const ProjectEventSchema = z.union([
  ProjectCreatedEventSchema,
  ProjectUpdatedEventSchema,
  ProjectDeletedEventSchema,
  TeamMemberAddedEventSchema,
  TemplateAppliedEventSchema,
  MilestoneReachedEventSchema,
  AnalyticsUpdatedEventSchema,
  RiskIdentifiedEventSchema,
  InsightGeneratedEventSchema,
  TemplateCreatedEventSchema
]);
export type ProjectEvent = z.infer<typeof ProjectEventSchema>;