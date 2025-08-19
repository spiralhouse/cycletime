# SPI-399: Domain Entities Foundation - Design Document

## Overview

This document outlines the design for implementing core domain entities following Domain-Driven Design patterns established in SPI-346 (Session Management). The goal is to create a solid foundation for the JCVD domain model while maintaining simplicity per SPI-387 principles.

## Pattern Mapping to Session Implementation

### Entities

| New Entity | Maps To | Pattern Reuse |
|------------|---------|---------------|
| `Project` | `Session` | Factory methods, snapshot pattern, time provider injection |
| `Issue` | `Session` | Validation in constructor, business logic encapsulation |
| `Workflow` | New pattern | State machine with transition validation |

### Value Objects

| New Value Object | Maps To | Implementation |
|-----------------|---------|----------------|
| `ProjectId` | `SessionKey` | Strong typing, validation, toString() |
| `IssueId` | `SessionKey` | Strong typing, validation, toString() |
| `IssueStatus` | New | Enumeration with transition rules |
| `IssueType` | New | Simple enum (Epic, Story, Subtask) |
| `WorkflowStage` | New | Stage with constraints |

### Repository Interfaces

Following the pattern from `SessionRepository`:
- Async/await for all operations
- Return `null` for not found (not throwing)
- Clean separation from infrastructure

### Error Handling

Reuse error patterns from `session-errors.ts`:
- `DomainError` base class
- Specific error types for validation failures
- Consistent error messages

## Key Design Decisions

### 1. Issue Hierarchy Validation

**Decision**: Implement hierarchy validation as a method on the Issue entity rather than a separate domain service.

**Rationale**: 
- Keeps validation logic close to the data
- Avoids premature abstraction
- Simple three-level hierarchy doesn't warrant a service

**Implementation**:
```kotlin
class Issue {
    fun validateParent(parentType: IssueType?): Boolean {
        val validHierarchy = mapOf(
            IssueType.EPIC to null,
            IssueType.STORY to IssueType.EPIC,
            IssueType.SUBTASK to IssueType.STORY
        )
        return validHierarchy[this.type] == parentType
    }
}
```

### 2. Workflow State Transitions

**Decision**: Implement workflow as a simple state machine within the entity, not as an external service.

**Rationale**:
- Workflow logic is core to the domain
- Keeps business rules encapsulated
- Avoids anemic domain model

**Implementation**:
```kotlin
class Workflow {
    private val transitions = mutableMapOf<WorkflowStage, List<WorkflowStage>>()
    
    fun canTransitionTo(stage: WorkflowStage): Boolean {
        val allowed = transitions[currentStage] ?: emptyList()
        return stage in allowed
    }
}
```

### 3. Dependency Cycle Detection

**Decision**: Implement basic cycle detection in Issue entity, defer complex graph algorithms.

**Rationale**:
- Start simple, can evolve if needed
- Most dependencies are simple parent-child
- Avoid over-engineering

**Implementation**:
- Track direct dependencies only
- Simple visited set for cycle detection
- Upgrade to graph algorithm if complexity grows

### 4. Time Provider Integration

**Decision**: Inject TimeProvider only where time-dependent operations exist.

**Entities needing TimeProvider**:
- `Project`: For tracking last update time
- `Issue`: For time-based status transitions (future)

**Entities NOT needing TimeProvider**:
- `Workflow`: No time-dependent logic
- Value Objects: Immutable, no timestamps

### 5. Factory and Snapshot Patterns

**Decision**: Implement both patterns consistently across entities.

**Factory Pattern** (for new entities):
```typescript
static create(name: string, description: string): Project {
  return new Project(
    ProjectId.generate(),
    name,
    description,
    ProjectStatus.ACTIVE,
    []
  );
}
```

**Snapshot Pattern** (for reconstitution):
```typescript
static fromSnapshot(data: ProjectSnapshot): Project {
  return new Project(
    ProjectId.from(data.id),
    data.name,
    data.description,
    data.status as ProjectStatus,
    data.issues.map(Issue.fromSnapshot)
  );
}
```

## Test-Driven Development Approach

**CRITICAL**: All implementation follows Test-Driven Development (TDD) with the Red-Green-Refactor cycle:
1. **Red**: Write failing tests that define the desired behavior
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code quality while keeping tests green

## Implementation Order and Subtasks

### Phase 1: Value Objects Tests & Implementation (Subtask 1)
**Core Value Objects & Interfaces** (2 points)

**Test First:**
- Write tests for `ProjectId` validation and generation
- Write tests for `IssueId` validation and generation
- Write tests for enum validations

**Then Implement:**
- Create `ProjectId`, `IssueId` value objects to pass tests
- Define `IssueType`, `IssueStatus`, `ProjectStatus` enums
- Create repository interfaces

### Phase 2: Project Entity Tests & Implementation (Subtask 2)
**Project Entity** (3 points)

**Test First:**
- Write tests for Project creation and validation
- Write tests for business methods (addIssue, updateStatus)
- Write tests for factory and snapshot patterns
- Write tests with MockTimeProvider

**Then Implement:**
- Entity with constructor and validation
- Business methods to pass tests
- Factory and snapshot patterns

### Phase 3: Issue Entity Tests & Implementation (Subtask 3)
**Issue Entity with Hierarchy** (5 points)

**Test First:**
- Write tests for hierarchy validation rules
- Write tests for status transitions
- Write tests for dependency management
- Write tests for parent-child relationships

**Then Implement:**
- Entity with hierarchy validation
- Status transition rules
- Dependency management (basic)
- Parent-child relationship validation

### Phase 4: Workflow Entity Tests & Implementation (Subtask 4)
**Workflow Entity** (3 points)

**Test First:**
- Write tests for state machine transitions
- Write tests for invalid transition handling
- Write tests for available transitions

**Then Implement:**
- State machine implementation
- Transition validation
- Stage management

## Testing Strategy

### Unit Test Patterns

Following SPI-346 test patterns:

1. **Time-Independent Tests**:
```typescript
describe('Issue', () => {
  it('should validate hierarchy correctly', () => {
    const story = Issue.create('Story', '', IssueType.STORY);
    expect(story.validateParent(IssueType.EPIC)).toBe(true);
    expect(story.validateParent(IssueType.STORY)).toBe(false);
  });
});
```

2. **Time-Dependent Tests**:
```typescript
describe('Project', () => {
  let mockTimeProvider: MockTimeProvider;
  
  beforeEach(() => {
    mockTimeProvider = new MockTimeProvider();
  });
  
  it('should track update time', () => {
    mockTimeProvider.setTime('2024-01-01T00:00:00Z');
    const project = new Project(..., mockTimeProvider);
    
    mockTimeProvider.advance(1000);
    project.updateStatus(ProjectStatus.COMPLETED);
    
    expect(project.updatedAt).toEqual(new Date('2024-01-01T00:00:01Z'));
  });
});
```

## Dependencies and Constraints

### Reusable Components from SPI-346
- `TimeProvider` interface and implementations
- Error handling patterns from `session-errors.ts`
- Repository interface patterns

### New Components Required
- Domain-specific value objects
- Issue hierarchy logic
- Workflow state machine

### External Dependencies
- None required for domain layer (pure TypeScript)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Over-engineering | Start simple, iterate based on needs |
| Pattern inconsistency | Follow Session patterns exactly where applicable |
| Complex hierarchies | Limit to 3 levels initially |
| Dependency cycles | Basic detection only, upgrade if needed |

## Success Criteria

- [ ] All entities follow Session pattern consistency
- [ ] 100% unit test coverage for business logic
- [ ] No infrastructure dependencies in domain layer
- [ ] Clean separation of concerns
- [ ] All value objects are immutable
- [ ] Repository interfaces are infrastructure-agnostic

## Notes for Implementation

1. **Always write tests first** - Follow TDD Red-Green-Refactor cycle
2. Start with value objects as they have no dependencies
3. For each component: Write failing test → Implement → Refactor
4. Keep business logic in entities, not in services
5. Tests drive the design - let test needs guide interface design
6. Defer complex features (like advanced cycle detection) to future stories