# Repository Usage Patterns

This document describes the repository pattern implementation and usage patterns for the CycleTime domain model.

## Overview

The repository pattern provides a clean abstraction between the domain model and data mapping layers. Each aggregate root (Project, Issue, Workflow) has its own repository interface defined in the domain layer with concrete implementations in the infrastructure layer.

## Core Repositories

### IssueRepository

The `IssueRepository` manages persistence and retrieval of Issues.

```kotlin
interface IssueRepository {
    suspend fun findById(id: IssueId): Issue?
    suspend fun findByProjectId(projectId: ProjectId): List<Issue>
    suspend fun save(issue: Issue): Unit
    suspend fun saveToProject(issue: Issue, projectId: ProjectId): Unit
}
```

#### Key Methods

- **`findById`**: Retrieve a single issue by its ID
- **`findByProjectId`**: Get all issues associated with a project
- **`save`**: Persist an issue (maintains existing relationships)
- **`saveToProject`**: Save an issue and associate it with a project atomically

#### Usage Examples

Create a new issue and associate with project

```kotlin
val issue = Issue.create("User authentication", "Implement JWT auth", IssueType.Story)
issueRepository.saveToProject(issue, projectId)
```

Update an existing issue

```kotlin
val existingIssue = issueRepository.findById(issueId)
existingIssue?.updateStatus(IssueStatus.Todo)
existingIssue?.updateStatus(IssueStatus.InProgress)
existingIssue?.let { issueRepository.save(it) }
```

Find all project issues

```kotlin
val projectIssues = issueRepository.findByProjectId(projectId)
```

### ProjectRepository

The `ProjectRepository` manages Project entities.

```kotlin
interface ProjectRepository {
    suspend fun findById(id: ProjectId): Project?
    suspend fun findAll(): List<Project>
    suspend fun save(project: Project): Unit
    suspend fun delete(id: ProjectId): Boolean
    suspend fun exists(id: ProjectId): Boolean
}
```

#### Usage Examples

Create and save a new project

```kotlin
val project = Project.create("E-commerce Platform", "Online marketplace")
projectRepository.save(project)
```

Update project status

```kotlin
val project = projectRepository.findById(projectId)
project?.updateStatus(ProjectStatus.Active)
project?.updateName("E-commerce Platform v2")
project?.let { projectRepository.save(it) }
```

Delete project (cascades to issues via foreign key)

```kotlin
projectRepository.delete(projectId)
```

### WorkflowRepository

The `WorkflowRepository` manages workflow state for projects.

```kotlin
interface WorkflowRepository {
  findById(id: WorkflowId): Promise<Workflow | null>;
  findByProjectId(projectId: ProjectId): Promise<Workflow | null>;
  save(workflow: Workflow): Promise<void>;
  delete(id: WorkflowId): Promise<void>;
}
```

#### Usage Examples

Create standard workflow

```kotlin
const workflow = Workflow.create('Development Workflow', projectId);
await workflowRepository.save(workflow);
```

Create custom workflow

```kotlin
const customStages = ['planning', 'development', 'testing', 'deployment'];
const workflow = Workflow.createCustom('Sprint Workflow', projectId, customStages);
await workflowRepository.save(workflow);
```

Progress through stages

```kotlin
workflow.transitionTo('design');
workflow.transitionTo('implementation');
await workflowRepository.save(workflow);
```

Reset workflow

```kotlin
workflow.reset();
await workflowRepository.save(workflow);
```

## Transaction Patterns

All repository operations use database transactions to ensure consistency:

```kotlin
// Example: Atomic save with relationships
async saveToProject(issue: Issue, projectId: ProjectId): Promise<void> {
  const transaction = this.db.transaction(() => {
    // Save or update issue
    this.saveIssue(issue);
    // Create project association
    this.createProjectAssociation(projectId, issue.id);
  });
  transaction();
}
```

## Issue Hierarchy Management

Issues support parent-child relationships:

```kotlin
// Create hierarchy
const epic = Issue.create('User Management', 'Complete user system', 'Epic');
const story1 = Issue.create('Login', 'User authentication', 'Story');
const story2 = Issue.create('Registration', 'User signup', 'Story');

// Set relationships
epic.addChild(story1.id);
epic.addChild(story2.id);
story1.setParent(epic.id);
story2.setParent(epic.id);

// Save with relationships
await issueRepository.saveToProject(epic, projectId);
await issueRepository.saveToProject(story1, projectId);
await issueRepository.saveToProject(story2, projectId);
```

## Issue Dependencies

Issues can have dependencies on other issues:

```kotlin
// Create dependency
const backend = Issue.create('API endpoint', 'Create REST API', 'Story');
const frontend = Issue.create('UI component', 'Build React component', 'Story');

// Frontend depends on backend
frontend.addDependency(backend.id);

await issueRepository.save(backend);
await issueRepository.save(frontend);

// Check if blocked
if (frontend.isBlocked()) {
  console.log('Frontend is blocked by dependencies');
}
```

## Status Transitions

Issues follow a defined status workflow:

```kotlin
// Valid transitions from Backlog
issue.updateStatus('Todo');        // ✓ Valid
issue.updateStatus('InProgress');  // ✗ Invalid - must go through Todo

// Full transition path
issue.updateStatus('Todo');
issue.updateStatus('InProgress');
issue.updateStatus('InReview');
issue.updateStatus('Done');
```

Valid status values:
- `Backlog` → `Todo`, `Canceled`, `Duplicate`
- `Todo` → `InProgress`, `Backlog`, `Canceled`, `Duplicate`
- `InProgress` → `InReview`, `Done`, `Todo`, `Canceled`
- `InReview` → `Done`, `InProgress`, `Canceled`
- `Done`, `Canceled`, `Duplicate` → (terminal states)

## Performance Considerations

### Batch Operations

For multiple related operations, batch them when possible:

```kotlin
// Good: Single transaction for multiple saves
const updates = issues.map(issue => 
  issueRepository.saveToProject(issue, projectId)
);
await Promise.all(updates);
```

### Query Optimization

The repositories use prepared statements for performance:

```kotlin
// Prepared statements are cached and reused
private findByIdStmt = db.prepare(`
  SELECT * FROM issues WHERE id = ?
`);
```

### Large Datasets

The repositories handle large datasets efficiently:

```kotlin
// Handles 100+ issues efficiently
const issues = await issueRepository.findByProjectId(projectId);

// Pagination can be added if needed
const issues = await issueRepository.findByProjectId(
  projectId, 
  { limit: 50, offset: 0 }
);
```

## Error Handling

All repository methods throw `RepositoryError` on failure:

```kotlin
try {
  await issueRepository.save(issue);
} catch (error) {
  if (error instanceof RepositoryError) {
    console.error(`Failed to save issue: ${error.message}`);
    // Handle repository-specific error
  }
  throw error;
}
```

## Testing

Repositories can be tested with in-memory databases:

```kotlin
// Test setup
const db = new Database(':memory:');
db.exec('PRAGMA foreign_keys = ON');
runMigrations(db);

const repository = new SqliteIssueRepository(db);

// Test operations
const issue = Issue.create('Test', 'Description', 'Story');
await repository.save(issue);

const retrieved = await repository.findById(issue.id);
expect(retrieved).not.toBeNull();
```

## Best Practices

1. **Always use transactions** for operations that modify multiple entities
2. **Maintain referential integrity** using foreign key constraints
3. **Use prepared statements** for all database queries
4. **Handle cleanup properly** in tests and error scenarios
5. **Follow domain rules** for status transitions and relationships
6. **Use saveToProject** when creating new issues for a project
7. **Use save** when updating existing issues (maintains associations)

## Migration Support

The repository pattern makes it easy to migrate between storage backends:

```kotlin
// Current: SQLite
const repository = new SqliteIssueRepository(sqliteDb);

// Future: PostgreSQL
const repository = new PostgresIssueRepository(pgClient);

// Future: MongoDB
const repository = new MongoIssueRepository(mongoCollection);
```

All implement the same `IssueRepository` interface, ensuring domain logic remains unchanged.
