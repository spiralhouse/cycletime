import { IssueId } from '../value-objects/issue-id.js';
import { ProjectId } from '../value-objects/project-id.js';
import { ProjectStatus } from '../value-objects/project-status.js';

import type { TimeProvider } from '../interfaces/time-provider.js';

export interface ProjectSnapshot {
  id: string;
  name: string;
  description: string;
  status: string;
  issueIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class Project {
  private _id: ProjectId;
  private _name: string;
  private _description: string;
  private _status: string;
  private _issues: IssueId[];
  private _createdAt: Date;
  private _updatedAt: Date;

  private static readonly MAX_ISSUES = 1000;
  private static readonly MAX_NAME_LENGTH = 255;

  constructor(
    id: ProjectId,
    name: string,
    description: string,
    status: string,
    issues: IssueId[],
    createdAt: Date,
    updatedAt: Date,
    private readonly timeProvider?: TimeProvider
  ) {
    this._id = id;
    this._name = this.validateName(name);
    this._description = description;
    this._status = status;
    this._issues = [...issues];
    this._createdAt = new Date(createdAt);
    this._updatedAt = new Date(updatedAt);
  }

  get id(): ProjectId {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get status(): string {
    return this._status;
  }

  get issues(): IssueId[] {
    return [...this._issues];
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  static create(
    name: string,
    description: string,
    timeProvider?: TimeProvider
  ): Project {
    const id = ProjectId.generate();
    const now = timeProvider?.now() ?? new Date();
    
    return new Project(
      id,
      name,
      description,
      ProjectStatus.Planning,
      [],
      now,
      now,
      timeProvider
    );
  }

  static fromSnapshot(
    snapshot: ProjectSnapshot,
    timeProvider?: TimeProvider
  ): Project {
    const id = ProjectId.from(snapshot.id);
    const issues = snapshot.issueIds.map(issueId => IssueId.from(issueId));
    
    return new Project(
      id,
      snapshot.name,
      snapshot.description,
      snapshot.status,
      issues,
      snapshot.createdAt,
      snapshot.updatedAt,
      timeProvider
    );
  }

  toSnapshot(): ProjectSnapshot {
    return {
      id: this._id.toString(),
      name: this._name,
      description: this._description,
      status: this._status,
      issueIds: this._issues.map(issue => issue.toString()),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  addIssue(issueId: IssueId): void {
    if (!this._issues.some(id => id.equals(issueId))) {
      this._issues.push(issueId);
      this.touch();
    }
  }

  removeIssue(issueId: IssueId): void {
    const index = this._issues.findIndex(id => id.equals(issueId));

    if (index !== -1) {
      this._issues.splice(index, 1);
      this.touch();
    }
  }

  hasIssue(issueId: IssueId): boolean {
    return this._issues.some(id => id.equals(issueId));
  }

  issueCount(): number {
    return this._issues.length;
  }

  updateStatus(newStatus: string): void {
    if (this._status === newStatus) {
      return;
    }

    if (!ProjectStatus.canTransition(this._status, newStatus)) {
      throw new Error(`Invalid status transition from ${this._status} to ${newStatus}`);
    }

    this._status = newStatus;
    this.touch();
  }

  canAddIssue(): boolean {
    return this._issues.length < Project.MAX_ISSUES;
  }

  getUnblockedTasks(): IssueId[] {
    // Placeholder implementation - would normally check dependencies
    return [...this._issues];
  }

  isActive(): boolean {
    return ProjectStatus.isActive(this._status);
  }

  isCompleted(): boolean {
    return this._status === ProjectStatus.Completed;
  }

  updateName(name: string): void {
    this._name = this.validateName(name);
    this.touch();
  }

  updateDescription(description: string): void {
    this._description = description;
    this.touch();
  }

  private validateName(name: string): string {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      throw new Error('Project name cannot be empty');
    }

    if (trimmedName.length >= Project.MAX_NAME_LENGTH) {
      throw new Error('Project name must be less than 255 characters');
    }

    return trimmedName;
  }

  private touch(): void {
    this._updatedAt = this.timeProvider?.now() ?? new Date();
  }
}