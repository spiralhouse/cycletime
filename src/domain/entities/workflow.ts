import { ProjectId } from '../value-objects/project-id.js';
import { WorkflowId } from '../value-objects/workflow-id.js';
import { WorkflowStage } from '../value-objects/workflow-stage.js';

import type { TimeProvider } from '../interfaces/time-provider.js';

export interface WorkflowTransition {
  from: string;
  to: string;
  occurredAt: Date;
}

export interface WorkflowSnapshot {
  id: string;
  name: string;
  projectId: string;
  currentStage: string;
  stages: string[];
  transitions: WorkflowTransition[];
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Workflow {
  private _id: WorkflowId;
  private _name: string;
  private _projectId: ProjectId;
  private _currentStage: string;
  private _stages: string[];
  private _transitions: WorkflowTransition[];
  private _isComplete: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  private static readonly MAX_NAME_LENGTH = 255;

  constructor(
    id: WorkflowId,
    name: string,
    projectId: ProjectId,
    currentStage: WorkflowStage,
    stages: WorkflowStage[],
    transitions: WorkflowTransition[],
    isComplete: boolean,
    createdAt: Date,
    updatedAt: Date,
    private readonly timeProvider?: TimeProvider
  ) {
    this._id = id;
    this._name = this.validateName(name);
    this._projectId = projectId;
    this._currentStage = currentStage.toString();
    this._stages = stages.map(s => s.toString());
    this._transitions = [...transitions];
    this._isComplete = isComplete;
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
  }

  get id(): WorkflowId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get projectId(): ProjectId {
    return this._projectId;
  }

  get currentStage(): string {
    return this._currentStage;
  }

  get stages(): string[] {
    return [...this._stages];
  }

  get transitions(): WorkflowTransition[] {
    return this._transitions.map(t => ({ ...t }));
  }

  get isComplete(): boolean {
    return this._isComplete;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  static create(
    name: string,
    projectId: ProjectId,
    timeProvider?: TimeProvider
  ): Workflow {
    const id = WorkflowId.generate();
    const now = timeProvider?.now() ?? new Date();
    const defaultStages = [
      WorkflowStage.from(WorkflowStage.REQUIREMENTS),
      WorkflowStage.from(WorkflowStage.DESIGN),
      WorkflowStage.from(WorkflowStage.IMPLEMENTATION),
      WorkflowStage.from(WorkflowStage.TESTING),
      WorkflowStage.from(WorkflowStage.DEPLOYMENT)
    ];
    
    const firstStage = defaultStages[0];

    if (!firstStage) {
      throw new Error('Failed to create default stages');
    }
    
    return new Workflow(
      id,
      name,
      projectId,
      firstStage,
      defaultStages,
      [],
      false,
      now,
      now,
      timeProvider
    );
  }

  static createCustom(
    name: string,
    projectId: ProjectId,
    stages: string[],
    timeProvider?: TimeProvider
  ): Workflow {
    if (stages.length === 0) {
      throw new Error('Workflow must have at least one stage');
    }

    const uniqueStages = new Set(stages);

    if (uniqueStages.size !== stages.length) {
      throw new Error('Workflow cannot have duplicate stages');
    }

    const id = WorkflowId.generate();
    const now = timeProvider?.now() ?? new Date();
    const workflowStages = stages.map(s => WorkflowStage.from(s));
    
    const firstStage = workflowStages[0];

    if (!firstStage) {
      throw new Error('Failed to create workflow stages');
    }
    
    return new Workflow(
      id,
      name,
      projectId,
      firstStage,
      workflowStages,
      [],
      false,
      now,
      now,
      timeProvider
    );
  }

  static fromSnapshot(
    snapshot: WorkflowSnapshot,
    timeProvider?: TimeProvider
  ): Workflow {
    const id = WorkflowId.from(snapshot.id);
    const projectId = ProjectId.from(snapshot.projectId);
    const currentStage = WorkflowStage.from(snapshot.currentStage);
    const stages = snapshot.stages.map(s => WorkflowStage.from(s));
    
    return new Workflow(
      id,
      snapshot.name,
      projectId,
      currentStage,
      stages,
      snapshot.transitions,
      snapshot.isComplete,
      snapshot.createdAt,
      snapshot.updatedAt,
      timeProvider
    );
  }

  toSnapshot(): WorkflowSnapshot {
    return {
      id: this._id.toString(),
      name: this._name,
      projectId: this._projectId.toString(),
      currentStage: this._currentStage,
      stages: [...this._stages],
      transitions: this._transitions.map(t => ({ ...t })),
      isComplete: this._isComplete,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  transitionTo(stage: string): void {
    // Validate stage is a valid workflow stage first
    WorkflowStage.from(stage);
    
    // Check if stage is in this workflow
    if (!this._stages.includes(stage)) {
      throw new Error(`Stage ${stage} is not in this workflow`);
    }

    // Don't transition if already at this stage
    if (this._currentStage === stage) {
      return;
    }

    // Record the transition
    this._transitions.push({
      from: this._currentStage,
      to: stage,
      occurredAt: this.timeProvider?.now() ?? new Date()
    });

    this._currentStage = stage;
    
    // Check if we've reached the final stage
    const lastStage = this._stages[this._stages.length - 1];

    this._isComplete = this._currentStage === lastStage;

    this.touch();
  }

  canTransitionTo(stage: string): boolean {
    // Validate stage format
    try {
      WorkflowStage.from(stage);
    } catch {
      return false;
    }

    // Check if stage is in this workflow
    if (!this._stages.includes(stage)) {
      return false;
    }

    // Can't transition to current stage
    if (this._currentStage === stage) {
      return false;
    }

    return true;
  }

  getStageIndex(stage: string): number {
    return this._stages.indexOf(stage);
  }

  hasVisited(stage: string): boolean {
    // Current stage counts as visited
    if (this._currentStage === stage) {
      return true;
    }

    // Check if any transition went to or from this stage
    return this._transitions.some(t => t.from === stage || t.to === stage);
  }

  getTransitionHistory(): WorkflowTransition[] {
    return this._transitions.map(t => ({ ...t }));
  }

  getProgress(): number {
    const currentIndex = this._stages.indexOf(this._currentStage);

    if (currentIndex === -1) return 0;
    
    const progress = ((currentIndex + 1) / this._stages.length) * 100;

    return Math.round(progress);
  }

  updateName(name: string): void {
    this._name = this.validateName(name);
    this.touch();
  }

  reset(): void {
    const firstStage = this._stages[0];

    if (!firstStage) {
      throw new Error('Cannot reset workflow with no stages');
    }
    this._currentStage = firstStage;
    this._transitions = [];
    this._isComplete = false;
    this.touch();
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      throw new Error('Workflow name cannot be empty');
    }

    if (trimmedName.length >= Workflow.MAX_NAME_LENGTH) {
      throw new Error('Workflow name must be less than 255 characters');
    }

    return trimmedName;
  }

  private touch(): void {
    this._updatedAt = this.timeProvider?.now() ?? new Date();
  }
}