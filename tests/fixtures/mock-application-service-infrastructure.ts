



import { MockTimeProvider } from './mock-time-provider.js';

import type { Issue } from '../../src/domain/entities/issue.js';
import type { Project } from '../../src/domain/entities/project.js';
import type { Workflow } from '../../src/domain/entities/workflow.js';
import type { IssueRepository } from '../../src/domain/repositories/issue-repository.js';
import type { ProjectRepository } from '../../src/domain/repositories/project-repository.js';
import type { UnitOfWork } from '../../src/domain/repositories/session-repository.js';
import type { WorkflowRepository } from '../../src/domain/repositories/workflow-repository.js';
import type { IssueId } from '../../src/domain/value-objects/issue-id.js';
import type { ProjectId } from '../../src/domain/value-objects/project-id.js';
import type { WorkflowId } from '../../src/domain/value-objects/workflow-id.js';

/**
 * Mock ProjectRepository for unit testing application services
 */
export class MockProjectRepository implements ProjectRepository {
  private projects = new Map<string, Project>();
  private saveThrowsError: Error | null = null;
  private findByIdThrowsError: Error | null = null;
  
  // Call tracking
  private saveCalls: Project[] = [];
  private findByIdCalls: string[] = [];
  private deleteCalls: string[] = [];
  private findAllCalls: number = 0;

  /**
   * Mock a project to be returned by findById
   */
  mockProject(projectId: string, project: Project | null): void {
    if (project) {
      this.projects.set(projectId, project);
    } else {
      this.projects.delete(projectId);
    }
  }

  /**
   * Make save() throw an error
   */
  mockSaveThrows(error: Error): void {
    this.saveThrowsError = error;
  }

  /**
   * Make findById() throw an error
   */
  mockFindByIdThrows(error: Error): void {
    this.findByIdThrowsError = error;
  }

  /**
   * Get all save calls made to this mock
   */
  getSaveCalls(): Project[] {
    return [...this.saveCalls];
  }

  /**
   * Get all findById calls made to this mock
   */
  getFindByIdCalls(): string[] {
    return [...this.findByIdCalls];
  }

  /**
   * Get all delete calls made to this mock
   */
  getDeleteCalls(): string[] {
    return [...this.deleteCalls];
  }

  /**
   * Get number of findAll calls made to this mock
   */
  getFindAllCallCount(): number {
    return this.findAllCalls;
  }

  /**
   * Reset all call tracking and mock data
   */
  reset(): void {
    this.projects.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
    this.deleteCalls = [];
    this.findAllCalls = 0;
    this.saveThrowsError = null;
    this.findByIdThrowsError = null;
  }

  // ProjectRepository implementation

  async findById(id: ProjectId): Promise<Project | null> {
    this.findByIdCalls.push(id.value);
    
    if (this.findByIdThrowsError) {
      throw this.findByIdThrowsError;
    }
    
    return this.projects.get(id.value) || null;
  }

  async save(project: Project): Promise<void> {
    this.saveCalls.push(project);
    
    if (this.saveThrowsError) {
      throw this.saveThrowsError;
    }
    
    this.projects.set(project.id.value, project);
  }

  async delete(id: ProjectId): Promise<void> {
    this.deleteCalls.push(id.value);
    this.projects.delete(id.value);
  }

  async findAll(): Promise<Project[]> {
    this.findAllCalls++;

    return Array.from(this.projects.values());
  }
}

/**
 * Mock IssueRepository for unit testing application services
 */
export class MockIssueRepository implements IssueRepository {
  private issues = new Map<string, Issue>();
  private projectIssues = new Map<string, Issue[]>();
  private saveThrowsError: Error | null = null;
  private findByIdThrowsError: Error | null = null;
  
  // Call tracking
  private saveCalls: Issue[] = [];
  private findByIdCalls: string[] = [];
  private findByProjectIdCalls: string[] = [];
  private deleteCalls: string[] = [];

  /**
   * Mock an issue to be returned by findById
   */
  mockIssue(issueId: string, issue: Issue | null): void {
    if (issue) {
      this.issues.set(issueId, issue);
    } else {
      this.issues.delete(issueId);
    }
  }

  /**
   * Mock issues for a project
   */
  mockProjectIssues(projectId: string, issues: Issue[]): void {
    this.projectIssues.set(projectId, issues);
  }

  /**
   * Make save() throw an error
   */
  mockSaveThrows(error: Error): void {
    this.saveThrowsError = error;
  }

  /**
   * Make findById() throw an error
   */
  mockFindByIdThrows(error: Error): void {
    this.findByIdThrowsError = error;
  }

  /**
   * Get all save calls made to this mock
   */
  getSaveCalls(): Issue[] {
    return [...this.saveCalls];
  }

  /**
   * Get all findById calls made to this mock
   */
  getFindByIdCalls(): string[] {
    return [...this.findByIdCalls];
  }

  /**
   * Get all findByProjectId calls made to this mock
   */
  getFindByProjectIdCalls(): string[] {
    return [...this.findByProjectIdCalls];
  }

  /**
   * Get all delete calls made to this mock
   */
  getDeleteCalls(): string[] {
    return [...this.deleteCalls];
  }

  /**
   * Reset all call tracking and mock data
   */
  reset(): void {
    this.issues.clear();
    this.projectIssues.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
    this.findByProjectIdCalls = [];
    this.deleteCalls = [];
    this.saveThrowsError = null;
    this.findByIdThrowsError = null;
  }

  // IssueRepository implementation

  async findById(id: IssueId): Promise<Issue | null> {
    this.findByIdCalls.push(id.value);
    
    if (this.findByIdThrowsError) {
      throw this.findByIdThrowsError;
    }
    
    return this.issues.get(id.value) || null;
  }

  async findByProjectId(projectId: ProjectId): Promise<Issue[]> {
    this.findByProjectIdCalls.push(projectId.value);

    return this.projectIssues.get(projectId.value) || [];
  }

  async save(issue: Issue): Promise<void> {
    this.saveCalls.push(issue);
    
    if (this.saveThrowsError) {
      throw this.saveThrowsError;
    }
    
    this.issues.set(issue.id.value, issue);
  }

  async delete(id: IssueId): Promise<void> {
    this.deleteCalls.push(id.value);
    this.issues.delete(id.value);
  }

  async saveToProject(issue: Issue, projectId: ProjectId): Promise<void> {
    this.saveCalls.push(issue);
    
    if (this.saveThrowsError) {
      throw this.saveThrowsError;
    }
    
    this.issues.set(issue.id.value, issue);
    
    // Also add to project issues list
    const existingIssues = this.projectIssues.get(projectId.value) || [];

    if (!existingIssues.some(existing => existing.id.value === issue.id.value)) {
      existingIssues.push(issue);
      this.projectIssues.set(projectId.value, existingIssues);
    }
  }
}

/**
 * Mock WorkflowRepository for unit testing application services
 */
export class MockWorkflowRepository implements WorkflowRepository {
  private workflows = new Map<string, Workflow>();
  private projectWorkflows = new Map<string, Workflow[]>();
  private saveThrowsError: Error | null = null;
  private findByIdThrowsError: Error | null = null;
  
  // Call tracking
  private saveCalls: Workflow[] = [];
  private findByIdCalls: string[] = [];
  private findByProjectIdCalls: string[] = [];
  private deleteCalls: string[] = [];

  /**
   * Mock a workflow to be returned by findById
   */
  mockWorkflow(workflowId: string, workflow: Workflow | null): void {
    if (workflow) {
      this.workflows.set(workflowId, workflow);
    } else {
      this.workflows.delete(workflowId);
    }
  }

  /**
   * Mock workflows for a project
   */
  mockProjectWorkflows(projectId: string, workflows: Workflow[]): void {
    this.projectWorkflows.set(projectId, workflows);
  }

  /**
   * Make save() throw an error
   */
  mockSaveThrows(error: Error): void {
    this.saveThrowsError = error;
  }

  /**
   * Make findById() throw an error
   */
  mockFindByIdThrows(error: Error): void {
    this.findByIdThrowsError = error;
  }

  /**
   * Get all save calls made to this mock
   */
  getSaveCalls(): Workflow[] {
    return [...this.saveCalls];
  }

  /**
   * Get all findById calls made to this mock
   */
  getFindByIdCalls(): string[] {
    return [...this.findByIdCalls];
  }

  /**
   * Get all findByProjectId calls made to this mock
   */
  getFindByProjectIdCalls(): string[] {
    return [...this.findByProjectIdCalls];
  }

  /**
   * Get all delete calls made to this mock
   */
  getDeleteCalls(): string[] {
    return [...this.deleteCalls];
  }

  /**
   * Reset all call tracking and mock data
   */
  reset(): void {
    this.workflows.clear();
    this.projectWorkflows.clear();
    this.saveCalls = [];
    this.findByIdCalls = [];
    this.findByProjectIdCalls = [];
    this.deleteCalls = [];
    this.saveThrowsError = null;
    this.findByIdThrowsError = null;
  }

  // WorkflowRepository implementation

  async findById(id: WorkflowId): Promise<Workflow | null> {
    this.findByIdCalls.push(id.value);
    
    if (this.findByIdThrowsError) {
      throw this.findByIdThrowsError;
    }
    
    return this.workflows.get(id.value) || null;
  }

  async findByProjectId(projectId: ProjectId): Promise<Workflow | null> {
    this.findByProjectIdCalls.push(projectId.value);
    const workflows = this.projectWorkflows.get(projectId.value) || [];

    return workflows.length > 0 ? (workflows[0] || null) : null;
  }

  async save(workflow: Workflow): Promise<void> {
    this.saveCalls.push(workflow);
    
    if (this.saveThrowsError) {
      throw this.saveThrowsError;
    }
    
    this.workflows.set(workflow.id.value, workflow);
  }

  async delete(id: WorkflowId): Promise<void> {
    this.deleteCalls.push(id.value);
    this.workflows.delete(id.value);
  }
}

/**
 * Mock UnitOfWork for unit testing application services
 */
export class MockUnitOfWork implements UnitOfWork {
  private executeThrowsError: Error | null = null;
  private executeCalls: (() => Promise<any>)[] = [];

  /**
   * Make execute() throw an error
   */
  mockExecuteThrows(error: Error): void {
    this.executeThrowsError = error;
  }

  /**
   * Get all execute calls made to this mock
   */
  getExecuteCalls(): (() => Promise<any>)[] {
    return [...this.executeCalls];
  }

  /**
   * Reset all call tracking and mock data
   */
  reset(): void {
    this.executeCalls = [];
    this.executeThrowsError = null;
  }

  // UnitOfWork implementation

  async execute<T>(work: () => Promise<T>): Promise<T> {
    this.executeCalls.push(work);
    
    if (this.executeThrowsError) {
      throw this.executeThrowsError;
    }
    
    return await work();
  }

  isInTransaction(): boolean {
    return false;
  }
}

/**
 * Factory to create a complete set of mocks for application service testing
 */
export class ApplicationServiceMockFactory {
  public projectRepository: MockProjectRepository;
  public issueRepository: MockIssueRepository;
  public workflowRepository: MockWorkflowRepository;
  public unitOfWork: MockUnitOfWork;
  public timeProvider: MockTimeProvider;

  constructor() {
    this.projectRepository = new MockProjectRepository();
    this.issueRepository = new MockIssueRepository();
    this.workflowRepository = new MockWorkflowRepository();
    this.unitOfWork = new MockUnitOfWork();
    this.timeProvider = new MockTimeProvider();
  }

  /**
   * Reset all mocks to clean state
   */
  resetAll(): void {
    this.projectRepository.reset();
    this.issueRepository.reset();
    this.workflowRepository.reset();
    this.unitOfWork.reset();
    this.timeProvider.reset();
  }

  /**
   * Create a new set of fresh mocks
   */
  static create(): ApplicationServiceMockFactory {
    return new ApplicationServiceMockFactory();
  }
}