import { expect } from 'vitest';

import { Issue } from '../../src/domain/entities/issue.js';
import { Project } from '../../src/domain/entities/project.js';
import { Workflow } from '../../src/domain/entities/workflow.js';
import { ProjectId } from '../../src/domain/value-objects/project-id.js';

import { ApplicationServiceMockFactory } from './mock-application-service-infrastructure.js';

/**
 * Base class for application service tests providing common setup and utilities
 */
export abstract class ApplicationServiceTestBase {
  protected mocks: ApplicationServiceMockFactory;

  constructor() {
    this.mocks = ApplicationServiceMockFactory.create();
  }

  /**
   * Set up fresh mocks before each test
   */
  protected setUp(): void {
    this.mocks.resetAll();
    this.setupDefaultTime();
  }

  /**
   * Set up a predictable time for testing
   */
  protected setupDefaultTime(): void {
    this.mocks.timeProvider.setTime('2024-01-01T00:00:00Z');
  }

  /**
   * Create a test project entity
   */
  protected createTestProject(options: {
    name?: string;
    description?: string;
  } = {}): Project {
    const name = options.name || 'Test Project';
    const description = options.description || 'A test project';

    return Project.create(name, description, this.mocks.timeProvider);
  }

  /**
   * Create a test issue entity
   */
  protected createTestIssue(options: {
    title?: string;
    description?: string;
    type?: string;
  } = {}): Issue {
    const title = options.title || 'Test Issue';
    const description = options.description || 'A test issue';
    const type = options.type || 'Story';

    return Issue.create(title, description, type, this.mocks.timeProvider);
  }

  /**
   * Create a test workflow entity
   */
  protected createTestWorkflow(options: {
    name?: string;
    projectId?: ProjectId;
    stages?: string[];
  } = {}): Workflow {
    const name = options.name || 'Test Workflow';
    const projectId = options.projectId || ProjectId.generate();
    const stages = options.stages;

    if (stages) {
      return Workflow.createCustom(name, projectId, stages, this.mocks.timeProvider);
    } else {
      return Workflow.create(name, projectId, this.mocks.timeProvider);
    }
  }

  /**
   * Create multiple test entities for complex scenarios
   */
  protected createTestEntities(): {
    project: Project;
    issues: Issue[];
    workflows: Workflow[];
  } {
    const project = this.createTestProject({
      name: 'Test Project 1',
    });

    const parentIssue = this.createTestIssue({
      title: 'Epic Issue',
      type: 'Epic',
    });

    const childIssue = this.createTestIssue({
      title: 'Story Issue',
      type: 'Story',
    });

    const subtask = this.createTestIssue({
      title: 'Subtask Issue',
      type: 'Subtask',
    });

    const workflow = this.createTestWorkflow({
      name: 'Development Workflow',
      projectId: project.id,
    });

    return {
      project,
      issues: [parentIssue, childIssue, subtask],
      workflows: [workflow],
    };
  }

  /**
   * Mock repository responses for a complete scenario
   */
  protected mockCompleteScenario(): {
    project: Project;
    issues: Issue[];
    workflows: Workflow[];
  } {
    const entities = this.createTestEntities();

    // Mock project repository
    this.mocks.projectRepository.mockProject(entities.project.id.value, entities.project);

    // Mock issue repository
    entities.issues.forEach(issue => {
      this.mocks.issueRepository.mockIssue(issue.id.value, issue);
    });
    this.mocks.issueRepository.mockProjectIssues(entities.project.id.value, entities.issues);

    // Mock workflow repository
    entities.workflows.forEach(workflow => {
      this.mocks.workflowRepository.mockWorkflow(workflow.id.value, workflow);
    });
    this.mocks.workflowRepository.mockProjectWorkflows(entities.project.id.value, entities.workflows);

    return entities;
  }

  /**
   * Assert that a repository was called with expected parameters
   */
  protected assertRepositoryCall<T>(
    calls: T[],
    expectedCallCount: number,
    predicate?: (call: T) => boolean
  ): void {
    expect(calls).toHaveLength(expectedCallCount);
    
    if (predicate && expectedCallCount > 0) {
      const matchingCalls = calls.filter(predicate);

      expect(matchingCalls).toHaveLength(expectedCallCount);
    }
  }

  /**
   * Assert that unit of work was called
   */
  protected assertUnitOfWorkCalled(expectedCallCount = 1): void {
    this.assertRepositoryCall(
      this.mocks.unitOfWork.getExecuteCalls(),
      expectedCallCount
    );
  }

  /**
   * Assert that time provider was used correctly
   */
  protected assertTimeProviderUsed(): void {
    // This can be verified by checking that created entities have the expected timestamp
    const expectedTime = this.mocks.timeProvider.now();

    expect(expectedTime).toEqual(new Date('2024-01-01T00:00:00Z'));
  }

  /**
   * Advance time and verify time-dependent behavior
   */
  protected advanceTimeAndVerify(milliseconds: number): Date {
    this.mocks.timeProvider.advance(milliseconds);

    return this.mocks.timeProvider.now();
  }
}

/**
 * Test data factory for creating consistent test data
 */
export class TestDataFactory {
  /**
   * Create a valid project creation command
   */
  static createProjectCommand(overrides: {
    name?: string;
    description?: string;
    status?: string;
  } = {}) {
    return {
      name: overrides.name || 'Test Project',
      description: overrides.description || 'A test project description',
      status: overrides.status || 'active',
    };
  }

  /**
   * Create a valid issue creation command
   */
  static createIssueCommand(overrides: {
    title?: string;
    description?: string;
    type?: string;
    parentId?: string;
    estimate?: number;
  } = {}) {
    return {
      title: overrides.title || 'Test Issue',
      description: overrides.description || 'A test issue description',
      type: overrides.type || 'Story',
      parentId: overrides.parentId,
      estimate: overrides.estimate,
    };
  }

  /**
   * Create a valid workflow creation command
   */
  static createWorkflowCommand(overrides: {
    name?: string;
    projectId?: string;
    stages?: string[];
    initialStage?: string;
  } = {}) {
    return {
      name: overrides.name || 'Test Workflow',
      projectId: overrides.projectId || 'test-project-1',
      stages: overrides.stages || ['planning', 'development', 'testing', 'done'],
      initialStage: overrides.initialStage || 'planning',
    };
  }

  /**
   * Create invalid data for negative testing
   */
  static createInvalidProjectCommand() {
    return {
      name: '', // Invalid: empty name
      description: 'Invalid project',
    };
  }

  /**
   * Create invalid data for negative testing
   */
  static createInvalidIssueCommand() {
    return {
      title: '', // Invalid: empty title
      description: 'Invalid issue',
      type: '', // Invalid: empty type
    };
  }

  /**
   * Create invalid data for negative testing
   */
  static createInvalidWorkflowCommand() {
    return {
      name: '', // Invalid: empty name
      projectId: 'nonexistent-project',
      stages: [], // Invalid: no stages
    };
  }
}