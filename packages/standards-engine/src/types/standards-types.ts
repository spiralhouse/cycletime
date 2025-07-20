// Core Standards Engine types aligned with OpenAPI specification

// Enums
export enum StandardsSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum StandardsCategory {
  CODING = 'coding',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  ARCHITECTURE = 'architecture',
  SECURITY = 'security'
}

export enum EnforcementLevel {
  ADVISORY = 'advisory',
  WARNING = 'warning',
  BLOCKING = 'blocking'
}

export enum ComplianceStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning'
}

export enum Language {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  RUST = 'rust',
  PHP = 'php'
}

// Core Standards Types
export interface StandardsRule {
  id: string;
  description: string;
  severity: StandardsSeverity;
  pattern?: string;
  examples?: {
    good?: string[];
    bad?: string[];
  };
  autoFixable: boolean;
  tags?: string[];
}

export interface Standard {
  id: string;
  name: string;
  description?: string;
  category: StandardsCategory;
  rules: StandardsRule[];
  active: boolean;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamStandards {
  teamId: string;
  standards: Standard[];
  enforcementLevel: EnforcementLevel;
  lastUpdated?: string;
  totalRules: number;
}

// Validation and Analysis Types
export interface StandardsViolation {
  standardId: string;
  ruleId: string;
  severity: StandardsSeverity;
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  fixAvailable: boolean;
  autoFixable: boolean;
}

export interface ValidationResult {
  overallScore: number;
  violations: StandardsViolation[];
  passedRules: number;
  totalRules: number;
  analysisTime?: number;
  suggestions?: ImprovementSuggestion[];
}

export interface ImprovementSuggestion {
  type: 'refactor' | 'optimization' | 'best_practice';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  codeExample?: string;
}

// Compliance Reporting Types
export interface ComplianceReport {
  commitId: string;
  projectId: string;
  overallScore: number;
  fileReports: FileComplianceReport[];
  summary: ComplianceSummary;
  trends?: ComplianceTrends;
  generatedAt: string;
}

export interface FileComplianceReport {
  filePath: string;
  language: string;
  score: number;
  violations: StandardsViolation[];
  linesAnalyzed?: number;
  complexityScore?: number;
}

export interface ComplianceSummary {
  totalFiles: number;
  filesWithViolations: number;
  totalViolations: number;
  violationsBySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  topViolationTypes?: Array<{
    ruleId: string;
    count: number;
  }>;
}

export interface ComplianceTrends {
  scoreTrend: 'improving' | 'stable' | 'declining';
  previousScore?: number;
  scoreChange?: number;
  violationTrend?: {
    totalChange: number;
    bySeverity: {
      error: number;
      warning: number;
      info: number;
    };
  };
}

export interface ComplianceMetrics {
  projectId: string;
  timeframe: string;
  metrics: {
    averageScore: number;
    scoreTrend: Array<{
      date: string;
      score: number;
    }>;
    violationTrends: {
      total: Array<{
        date: string;
        count: number;
      }>;
      bySeverity: Record<string, unknown>;
    };
    topViolations: Array<{
      ruleId: string;
      ruleName: string;
      count: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    teamPerformance: {
      commitsAnalyzed: number;
      improvementRate: number;
      consistencyScore: number;
    };
  };
}

// Templates and Configuration Types
export interface StandardsTemplate {
  id: string;
  name: string;
  description?: string;
  language: Language;
  framework?: string;
  category?: string;
  standards: Standard[];
  usageCount?: number;
  rating?: number;
  createdBy?: string;
  createdAt?: string;
}

export interface StandardInput {
  name: string;
  description?: string;
  category: StandardsCategory;
  rules: StandardRuleInput[];
  active?: boolean;
}

export interface StandardRuleInput {
  id: string;
  description: string;
  severity: StandardsSeverity;
  pattern?: string;
  examples?: Record<string, unknown>;
  autoFixable?: boolean;
  tags?: string[];
}

// Request/Response Types
export interface CodeValidationRequest {
  code: string;
  language: Language;
  teamId: string;
  projectId?: string;
  contextPath?: string;
  standards?: string[];
}

export interface StandardsConfigurationRequest {
  teamId: string;
  standards: StandardInput[];
  enforcementLevel?: EnforcementLevel;
  inheritFromTemplate?: string;
}

export interface EnforcementLevelRequest {
  teamId: string;
  level: EnforcementLevel;
  rulesOverride?: Array<{
    ruleId: string;
    level: EnforcementLevel;
  }>;
}

export interface CodeAnalysisRequest {
  files: FileInput[];
  teamId: string;
  projectId?: string;
  analysisOptions?: AnalysisOptions;
}

export interface FileInput {
  path: string;
  content: string;
  language: Language;
}

export interface AnalysisOptions {
  includeSuggestions?: boolean;
  includeComplexity?: boolean;
  includeAiInsights?: boolean;
  severityThreshold?: StandardsSeverity;
}

// Complex Analysis Types
export interface CodeAnalysisResult {
  analysisId: string;
  overallScore: number;
  fileAnalyses: FileAnalysis[];
  aiInsights?: AIInsights;
  recommendations?: Recommendation[];
  processingTime?: number;
  analyzedAt: string;
}

export interface FileAnalysis {
  filePath: string;
  language: string;
  score: number;
  violations: StandardsViolation[];
  complexityMetrics?: ComplexityMetrics;
  suggestions?: ImprovementSuggestion[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity?: number;
  cognitiveComplexity?: number;
  maintainabilityIndex?: number;
  linesOfCode?: number;
  technicalDebtMinutes?: number;
}

export interface AIInsights {
  overallAssessment: string;
  keyPatterns: string[];
  improvementPriorities: Array<{
    area: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  learningOpportunities?: string[];
}

export interface Recommendation {
  type: 'refactoring' | 'performance' | 'security' | 'maintainability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effortEstimate: string;
  resources?: Array<{
    type: 'documentation' | 'tutorial' | 'tool' | 'example';
    title: string;
    url: string;
  }>;
}

// Event Types (aligned with AsyncAPI specification)
export interface BaseEventPayload {
  eventId: string;
  timestamp: string;
  correlationId?: string;
  source: string;
  version?: string;
}

export interface StandardsAnalyzedEvent extends BaseEventPayload {
  data: {
    analysisId: string;
    teamId: string;
    projectId: string;
    files: Array<{
      path: string;
      language: string;
      score: number;
      violationsCount: number;
    }>;
    overallScore: number;
    totalViolations: number;
    analysisDurationMs?: number;
    triggeredBy: string;
  };
}

export interface ComplianceViolationEvent extends BaseEventPayload {
  data: {
    violationId: string;
    teamId: string;
    projectId?: string;
    standardId: string;
    ruleId: string;
    severity: StandardsSeverity;
    message: string;
    filePath?: string;
    line?: number;
    column?: number;
    fixAvailable: boolean;
    autoFixable: boolean;
    enforcementLevel: EnforcementLevel;
    suggestedFix?: string;
    context?: {
      commitId?: string;
      pullRequestId?: string;
      branch?: string;
    };
  };
}

export interface StandardsUpdatedEvent extends BaseEventPayload {
  data: {
    teamId: string;
    updateType: 'rules_added' | 'rules_removed' | 'rules_modified' | 'enforcement_changed' | 'template_applied';
    updatedBy: string;
    changes: {
      addedRules?: number;
      removedRules?: number;
      modifiedRules?: number;
      [key: string]: unknown;
    };
    enforcementLevel: EnforcementLevel;
    affectedProjects?: string[];
    notificationSent?: boolean;
  };
}

// Service Interface Types
export interface IStandardsAnalysisService {
  analyzeCode(request: CodeValidationRequest): Promise<ValidationResult>;
  analyzeFiles(request: CodeAnalysisRequest): Promise<CodeAnalysisResult>;
  generateGuidance(teamId: string, context: Record<string, unknown>): Promise<string>;
}

export interface IStandardsConfigurationService {
  getTeamStandards(teamId: string, category?: StandardsCategory): Promise<TeamStandards>;
  configureStandards(request: StandardsConfigurationRequest): Promise<{ configurationId: string }>;
  getTemplates(language?: Language, framework?: string): Promise<StandardsTemplate[]>;
  deleteRule(ruleId: string, teamId: string): Promise<void>;
  setEnforcementLevel(request: EnforcementLevelRequest): Promise<void>;
}

export interface IComplianceReportingService {
  getComplianceReport(commitId: string, includeSuggestions?: boolean): Promise<ComplianceReport>;
  getComplianceMetrics(projectId: string, timeframe?: string, granularity?: string): Promise<ComplianceMetrics>;
  generateTrends(projectId: string, timeframe: string): Promise<ComplianceTrends>;
}

export interface IEventService {
  publishStandardsAnalyzed(event: StandardsAnalyzedEvent): Promise<void>;
  publishComplianceViolation(event: ComplianceViolationEvent): Promise<void>;
  publishStandardsUpdated(event: StandardsUpdatedEvent): Promise<void>;
}

// Utility Types
export type UUID = string;
export type ISO8601DateTime = string;
export type EmailAddress = string;

// Error Types
export interface StandardsEngineError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}