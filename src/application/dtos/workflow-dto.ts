export interface CreateWorkflowRequest {
  projectId: string;
  name: string;
  description?: string;
  stages?: WorkflowStageConfig[];
  context?: Record<string, any>;
}

export interface WorkflowStageConfig {
  id: string;
  name: string;
  description?: string;
  dependencies: string[];
  required: boolean;
  parallel: boolean;
  config: Record<string, any>;
}

export interface WorkflowStatus {
  DRAFT: 'draft';
  ACTIVE: 'active';
  COMPLETED: 'completed';
  CANCELLED: 'cancelled';
}

export interface WorkflowStageStatus {
  PENDING: 'pending';
  IN_PROGRESS: 'in_progress';
  COMPLETED: 'completed';
  SKIPPED: 'skipped';
  FAILED: 'failed';
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  status?: string;
  stages?: WorkflowStageConfig[];
  context?: Record<string, any>;
}

export interface WorkflowStageDto {
  id: string;
  name: string;
  description?: string;
  dependencies: string[];
  required: boolean;
  parallel: boolean;
  agentType?: string;
  config: Record<string, any>;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  output?: Record<string, any>;
  error?: string;
}

export interface WorkflowDto {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: string;
  stages: WorkflowStageDto[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface ExecuteStageRequest {
  workflowId: string;
  stageId: string;
  context?: Record<string, any>;
}

export interface CompleteStageRequest {
  workflowId: string;
  stageId: string;
  success: boolean;
  output?: Record<string, any>;
  context?: Record<string, any>;
  error?: string;
}

export interface StageExecutionResult {
  success: boolean;
  stageId: string;
  status: string;
  context: Record<string, any>;
  message: string;
}

export interface StageCompletionResult {
  success: boolean;
  stageId: string;
  status: string;
  context: Record<string, any>;
  workflowStatus: string;
  message: string;
}

export interface WorkflowOperationResult {
  success: boolean;
  error?: string;
  data?: WorkflowDto;
}

export interface WorkflowProgressDto {
  workflowId: string;
  completionPercentage: number;
  currentStage: string;
  isComplete: boolean;
  availableStages: string[];
}

export interface WorkflowContextDto {
  workflowId: string;
  context: Record<string, any>;
  stages: {
    id: string;
    name: string;
    status: WorkflowStageStatus;
    output: Record<string, any>;
    startedAt?: Date;
    completedAt?: Date;
  }[];
}