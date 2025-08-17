import { IssueId } from '../value-objects/issue-id.js';
import { IssueStatus } from '../value-objects/issue-status.js';
import { IssueType } from '../value-objects/issue-type.js';
import { ProjectId } from '../value-objects/project-id.js';

import type { TimeProvider } from '../interfaces/time-provider.js';

export interface IssueSnapshot {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  projectId?: string;
  parentId?: string;
  childIds: string[];
  dependencies: string[];
  estimate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Issue {
  private _id: IssueId;
  private _title: string;
  private _description: string;
  private _type: IssueType;
  private _status: string;
  private _projectId?: ProjectId;
  private _parentId?: IssueId;
  private _childIds: IssueId[];
  private _dependencies: IssueId[];
  private _estimate?: number;
  private _createdAt: Date;
  private _updatedAt: Date;

  private static readonly MAX_TITLE_LENGTH = 255;
  private static readonly FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

  constructor(
    id: IssueId,
    title: string,
    description: string,
    type: string,
    status: string,
    childIds: IssueId[],
    dependencies: IssueId[],
    parentId: IssueId | undefined,
    projectId: ProjectId | undefined,
    estimate: number | undefined,
    createdAt: Date,
    updatedAt: Date,
    private readonly timeProvider?: TimeProvider
  ) {
    this._id = id;
    this._title = this.validateTitle(title);
    this._description = description;
    this._type = type;
    this._status = status;
    if (projectId !== undefined) {
      this._projectId = projectId;
    }
    if (parentId !== undefined) {
      this._parentId = parentId;
    }
    this._childIds = [...childIds];
    this._dependencies = [...dependencies];
    if (estimate !== undefined) {
      this._estimate = estimate;
    }
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
  }

  get id(): IssueId {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get type(): IssueType {
    return this._type;
  }

  get status(): string {
    return this._status;
  }

  get projectId(): ProjectId | undefined {
    return this._projectId;
  }

  get parentId(): IssueId | undefined {
    return this._parentId;
  }

  get childIds(): IssueId[] {
    return [...this._childIds];
  }

  get dependencies(): IssueId[] {
    return [...this._dependencies];
  }

  get estimate(): number | undefined {
    return this._estimate;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  static create(
    title: string,
    description: string,
    type: string,
    timeProvider?: TimeProvider,
    projectId?: ProjectId
  ): Issue {
    const id = IssueId.generate();
    const now = timeProvider?.now() ?? new Date();
    
    return new Issue(
      id,
      title,
      description,
      type,
      IssueStatus.Backlog,
      [],
      [],
      undefined,
      projectId,
      undefined,
      now,
      now,
      timeProvider
    );
  }

  static fromSnapshot(
    snapshot: IssueSnapshot,
    timeProvider?: TimeProvider
  ): Issue {
    const id = IssueId.from(snapshot.id);
    const projectId = snapshot.projectId ? ProjectId.from(snapshot.projectId) : undefined;
    const parentId = snapshot.parentId ? IssueId.from(snapshot.parentId) : undefined;
    const childIds = snapshot.childIds.map(childId => IssueId.from(childId));
    const dependencies = snapshot.dependencies.map(depId => IssueId.from(depId));
    
    return new Issue(
      id,
      snapshot.title,
      snapshot.description,
      snapshot.type,
      snapshot.status,
      childIds,
      dependencies,
      parentId,
      projectId,
      snapshot.estimate,
      snapshot.createdAt,
      snapshot.updatedAt,
      timeProvider
    );
  }

  toSnapshot(): IssueSnapshot {
    const snapshot: IssueSnapshot = {
      id: this._id.toString(),
      title: this._title,
      description: this._description,
      type: this._type as string,
      status: this._status,
      childIds: this._childIds.map(child => child.toString()),
      dependencies: this._dependencies.map(dep => dep.toString()),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
    
    if (this._projectId !== undefined) {
      snapshot.projectId = this._projectId.toString();
    }
    
    if (this._parentId !== undefined) {
      snapshot.parentId = this._parentId.toString();
    }
    
    if (this._estimate !== undefined) {
      snapshot.estimate = this._estimate;
    }
    
    return snapshot;
  }

  setParent(parentId: IssueId): void {
    if (this._type === IssueType.Epic) {
      throw new Error('Epic cannot have a parent');
    }
    
    this._parentId = parentId;
    this.touch();
  }

  addChild(childId: IssueId): void {
    if (this._type === IssueType.Subtask) {
      throw new Error('Subtask cannot have children');
    }

    if (!this._childIds.some(id => id.equals(childId))) {
      this._childIds.push(childId);
      this.touch();
    }
  }

  removeChild(childId: IssueId): void {
    const index = this._childIds.findIndex(id => id.equals(childId));

    if (index !== -1) {
      this._childIds.splice(index, 1);
      this.touch();
    }
  }

  hasChild(childId: IssueId): boolean {
    return this._childIds.some(id => id.equals(childId));
  }

  childCount(): number {
    return this._childIds.length;
  }

  addDependency(dependencyId: IssueId): void {
    if (dependencyId.equals(this._id)) {
      throw new Error('Issue cannot depend on itself');
    }

    if (!this._dependencies.some(id => id.equals(dependencyId))) {
      this._dependencies.push(dependencyId);
      this.touch();
    }
  }

  removeDependency(dependencyId: IssueId): void {
    const index = this._dependencies.findIndex(id => id.equals(dependencyId));

    if (index !== -1) {
      this._dependencies.splice(index, 1);
      this.touch();
    }
  }

  hasDependency(dependencyId: IssueId): boolean {
    return this._dependencies.some(id => id.equals(dependencyId));
  }

  dependencyCount(): number {
    return this._dependencies.length;
  }

  updateStatus(newStatus: string): void {
    if (this._status === newStatus) {
      return;
    }

    if (!IssueStatus.canTransition(this._status, newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }

    this._status = newStatus;
    this.touch();
  }

  setEstimate(estimate: number): void {
    if (this._type === IssueType.Epic) {
      throw new Error('Cannot set estimate on Epic');
    }

    if (this._type === IssueType.Story && this._childIds.length > 0) {
      throw new Error('Cannot set estimate on Story with children');
    }

    if (estimate <= 0) {
      throw new Error('Estimate must be positive');
    }

    if (!Issue.FIBONACCI_SEQUENCE.includes(estimate)) {
      throw new Error('Estimate must follow Fibonacci sequence (1, 2, 3, 5, 8, 13, etc.)');
    }

    this._estimate = estimate;
    this.touch();
  }

  clearEstimate(): void {
    delete this._estimate;
    this.touch();
  }

  updateTitle(title: string): void {
    this._title = this.validateTitle(title);
    this.touch();
  }

  updateDescription(description: string): void {
    this._description = description;
    this.touch();
  }

  updateType(type: IssueType): void {
    if (this._type === type) {
      return;
    }
    
    // Validate type change rules
    if (this._type === IssueType.Epic && this._parentId) {
      throw new Error('Cannot change Epic with parent to another type');
    }
    
    if (type === IssueType.Epic && this._parentId) {
      throw new Error('Cannot change to Epic when issue has a parent');
    }
    
    if (type === IssueType.Subtask && !this._parentId) {
      throw new Error('Cannot change to Subtask without a parent');
    }
    
    this._type = type;
    this.touch();
  }

  isValidHierarchy(): boolean {
    if (this._type === IssueType.Epic) {
      return this._parentId === undefined;
    }
    
    if (this._type === IssueType.Subtask) {
      return this._parentId !== undefined;
    }
    
    return true;
  }

  isBlocked(): boolean {
    return this._dependencies.length > 0;
  }

  isActive(): boolean {
    return IssueStatus.isActive(this._status);
  }

  isCompleted(): boolean {
    return IssueStatus.isCompleted(this._status);
  }

  private validateTitle(title: string): string {
    const trimmedTitle = title.trim();
    
    if (!trimmedTitle) {
      throw new Error('Issue title cannot be empty');
    }

    if (trimmedTitle.length >= Issue.MAX_TITLE_LENGTH) {
      throw new Error('Issue title must be less than 255 characters');
    }

    return trimmedTitle;
  }

  private touch(): void {
    this._updatedAt = this.timeProvider?.now() ?? new Date();
  }
}