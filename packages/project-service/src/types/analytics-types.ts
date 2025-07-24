import { z } from 'zod';

// Analytics Time Range
export const AnalyticsTimeRangeSchema = z.enum(['day', 'week', 'month', 'quarter', 'year']);
export type AnalyticsTimeRange = z.infer<typeof AnalyticsTimeRangeSchema>;

// Trend Direction
export const TrendDirectionSchema = z.enum(['improving', 'stable', 'declining']);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

// Risk Type
export const RiskTypeSchema = z.enum(['schedule', 'budget', 'scope', 'team', 'technical', 'external']);
export type RiskType = z.infer<typeof RiskTypeSchema>;

// Risk Severity
export const RiskSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

// Insight Category
export const InsightCategorySchema = z.enum(['performance', 'risks', 'opportunities', 'team', 'timeline']);
export type InsightCategory = z.infer<typeof InsightCategorySchema>;

// Insight Type
export const InsightTypeSchema = z.enum(['warning', 'recommendation', 'observation', 'alert']);
export type InsightType = z.infer<typeof InsightTypeSchema>;

// Project Analytics Summary Schema
export const ProjectAnalyticsSummarySchema = z.object({
  totalTasks: z.number().int().nonnegative(),
  completedTasks: z.number().int().nonnegative(),
  pendingTasks: z.number().int().nonnegative(),
  overdueTasks: z.number().int().nonnegative(),
  teamVelocity: z.number().min(0),
  burndownRate: z.number(),
  progressPercentage: z.number().min(0).max(100)
});
export type ProjectAnalyticsSummary = z.infer<typeof ProjectAnalyticsSummarySchema>;

// Quality Metrics Schema
export const QualityMetricsSchema = z.object({
  defectRate: z.number().min(0),
  codeReviewTime: z.number().min(0),
  testCoverage: z.number().min(0).max(100)
});
export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

// Performance Metrics Schema
export const PerformanceMetricsSchema = z.object({
  cycleTime: z.number().min(0),
  leadTime: z.number().min(0),
  throughput: z.number().min(0),
  qualityMetrics: QualityMetricsSchema.optional()
});
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Analytics Trend Schema
export const AnalyticsTrendSchema = z.object({
  date: z.string().date(),
  completed: z.number().int().nonnegative(),
  created: z.number().int().nonnegative(),
  velocity: z.number().min(0)
});
export type AnalyticsTrend = z.infer<typeof AnalyticsTrendSchema>;

// Team Member Productivity Schema
export const TeamMemberProductivitySchema = z.object({
  memberId: z.string().uuid(),
  tasksCompleted: z.number().int().nonnegative(),
  hoursWorked: z.number().min(0),
  efficiency: z.number().min(0)
});
export type TeamMemberProductivity = z.infer<typeof TeamMemberProductivitySchema>;

// Team Collaboration Schema
export const TeamCollaborationSchema = z.object({
  codeReviews: z.number().int().nonnegative(),
  pairProgramming: z.number().min(0),
  knowledgeSharing: z.number().min(0)
});
export type TeamCollaboration = z.infer<typeof TeamCollaborationSchema>;

// Team Metrics Schema
export const TeamMetricsSchema = z.object({
  productivity: z.array(TeamMemberProductivitySchema),
  collaboration: TeamCollaborationSchema.optional()
});
export type TeamMetrics = z.infer<typeof TeamMetricsSchema>;

// Project Analytics Response Schema
export const ProjectAnalyticsResponseSchema = z.object({
  projectId: z.string().uuid(),
  timeRange: AnalyticsTimeRangeSchema,
  summary: ProjectAnalyticsSummarySchema,
  performance: PerformanceMetricsSchema,
  trends: z.array(AnalyticsTrendSchema),
  teamMetrics: TeamMetricsSchema.optional()
});
export type ProjectAnalyticsResponse = z.infer<typeof ProjectAnalyticsResponseSchema>;

// Forecasting Scenario Schema
export const ForecastingScenarioSchema = z.object({
  name: z.string(),
  probability: z.number().min(0).max(1),
  completionDate: z.string().datetime(),
  budgetImpact: z.number(),
  description: z.string()
});
export type ForecastingScenario = z.infer<typeof ForecastingScenarioSchema>;

// Forecasting Risk Schema
export const ForecastingRiskSchema = z.object({
  type: RiskTypeSchema,
  severity: RiskSeveritySchema,
  probability: z.number().min(0).max(1),
  impact: z.string(),
  mitigation: z.string()
});
export type ForecastingRisk = z.infer<typeof ForecastingRiskSchema>;

// Forecasting Recommendation Schema
export const ForecastingRecommendationSchema = z.object({
  type: z.enum(['resource', 'timeline', 'scope', 'process']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string(),
  expectedImpact: z.string()
});
export type ForecastingRecommendation = z.infer<typeof ForecastingRecommendationSchema>;

// Forecasting Predictions Schema
export const ForecastingPredictionsSchema = z.object({
  completionDate: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  remainingEffort: z.number().min(0),
  budgetForecast: z.number()
});
export type ForecastingPredictions = z.infer<typeof ForecastingPredictionsSchema>;

// Project Forecasting Response Schema
export const ProjectForecastingResponseSchema = z.object({
  projectId: z.string().uuid(),
  horizon: z.number().int().positive(),
  predictions: ForecastingPredictionsSchema,
  scenarios: z.array(ForecastingScenarioSchema),
  risks: z.array(ForecastingRiskSchema),
  recommendations: z.array(ForecastingRecommendationSchema)
});
export type ProjectForecastingResponse = z.infer<typeof ProjectForecastingResponseSchema>;

// Insight Evidence Schema
export const InsightEvidenceSchema = z.object({
  metric: z.string(),
  value: z.string(),
  trend: z.string()
});
export type InsightEvidence = z.infer<typeof InsightEvidenceSchema>;

// Insight Recommendation Schema
export const InsightRecommendationSchema = z.object({
  action: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  effort: z.string(),
  expectedImpact: z.string()
});
export type InsightRecommendation = z.infer<typeof InsightRecommendationSchema>;

// Project Insight Schema
export const ProjectInsightSchema = z.object({
  id: z.string().uuid(),
  category: InsightCategorySchema,
  type: InsightTypeSchema,
  severity: RiskSeveritySchema,
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.string(),
  generatedAt: z.string().datetime(),
  evidence: z.array(InsightEvidenceSchema).optional(),
  recommendations: z.array(InsightRecommendationSchema).optional()
});
export type ProjectInsight = z.infer<typeof ProjectInsightSchema>;

// Insights Summary Schema
export const InsightsSummarySchema = z.object({
  totalInsights: z.number().int().nonnegative(),
  criticalCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  healthScore: z.number().min(0).max(100),
  trending: TrendDirectionSchema
});
export type InsightsSummary = z.infer<typeof InsightsSummarySchema>;

// Project Insights Response Schema
export const ProjectInsightsResponseSchema = z.object({
  projectId: z.string().uuid(),
  insights: z.array(ProjectInsightSchema),
  summary: InsightsSummarySchema
});
export type ProjectInsightsResponse = z.infer<typeof ProjectInsightsResponseSchema>;