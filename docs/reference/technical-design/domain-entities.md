# Domain Entities Foundation - Design Document

## Overview

This document outlines the design for implementing core domain entities following Domain-Driven Design (DDD) patterns with Test-Driven Development (TDD) methodology. The goal is to create a solid foundation for the CycleTime domain model using Kotlin's type safety and Exposed ORM integration while maintaining clean architecture principles.

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

Following DDD principles with Kotlin coroutines:
- Suspend functions for all async operations
- Return `null` for not found (not throwing)
- Clean separation from infrastructure
- Repository interfaces in domain layer, implementations in infrastructure

### Error Handling

Kotlin-specific error patterns:
- `DomainException` sealed class hierarchy
- Specific error types for validation failures
- Result type for error handling without exceptions
- Consistent error messages with context

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
```kotlin
class Project private constructor(
    val id: ProjectId,
    private var _name: String,
    private var _description: String,
    private var _status: ProjectStatus,
    private val _issues: MutableList<IssueId> = mutableListOf(),
    private val timeProvider: TimeProvider
) {
    companion object {
        fun create(
            name: String, 
            description: String, 
            timeProvider: TimeProvider
        ): Project {
            return Project(
                ProjectId.generate(),
                name,
                description,
                ProjectStatus.ACTIVE,
                mutableListOf(),
                timeProvider
            )
        }
    }
}
```

**Snapshot Pattern** (for reconstitution):
```kotlin
data class ProjectSnapshot(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val issueIds: List<String>,
    val createdAt: Instant,
    val updatedAt: Instant
)

companion object {
    fun fromSnapshot(
        snapshot: ProjectSnapshot, 
        timeProvider: TimeProvider
    ): Project {
        return Project(
            ProjectId(snapshot.id),
            snapshot.name,
            snapshot.description,
            ProjectStatus.valueOf(snapshot.status),
            snapshot.issueIds.map { IssueId(it) }.toMutableList(),
            timeProvider
        )
    }
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

1. **Time-Independent Tests** (Kotlin/Kotest):
```kotlin
class IssueTest : DescribeSpec({
    describe("Issue hierarchy validation") {
        it("should validate parent types correctly") {
            val story = Issue.create(
                title = "Story", 
                description = "", 
                type = IssueType.STORY
            )
            
            story.validateParent(IssueType.EPIC) shouldBe true
            story.validateParent(IssueType.STORY) shouldBe false
        }
    }
})
```

2. **Time-Dependent Tests** (TDD with MockTimeProvider):
```kotlin
class ProjectTest : DescribeSpec({
    describe("Project time tracking") {
        val mockTimeProvider = MockTimeProvider()
        
        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2024-01-01T00:00:00Z"))
        }
        
        it("should track update time when status changes") {
            val project = Project.create(
                name = "Test Project",
                description = "Test",
                timeProvider = mockTimeProvider
            )
            
            mockTimeProvider.advance(Duration.ofSeconds(1))
            project.updateStatus(ProjectStatus.COMPLETED)
            
            project.updatedAt shouldBe Instant.parse("2024-01-01T00:00:01Z")
        }
    }
})
```

## Dependencies and Constraints

### Reusable Components from Session Management
- `TimeProvider` interface and implementations (Kotlin)
- Error handling patterns with sealed classes
- Repository interface patterns with suspend functions

### New Components Required
- Domain-specific value objects
- Issue hierarchy logic
- Workflow state machine

### External Dependencies
- None required for domain layer (pure Kotlin with standard library)
- Kotlin coroutines for async patterns (kotlinx-coroutines-core)
- Time handling with java.time.*

## Infrastructure Mapping (Exposed ORM)

The domain entities map to database tables through the infrastructure layer using Exposed DSL:

### Table Definitions

```kotlin
// Infrastructure Layer - Exposed Table Definitions
object Projects : Table("projects") {
    val id = varchar("id", 36)
    val name = varchar("name", 255)
    val description = text("description")
    val status = enumeration("status", ProjectStatus::class)
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    
    override val primaryKey = PrimaryKey(id)
}

object Issues : Table("issues") {
    val id = varchar("id", 36)
    val projectId = varchar("project_id", 36) references Projects.id
    val parentId = varchar("parent_id", 36).nullable() references id
    val title = varchar("title", 255)
    val description = text("description").nullable()
    val type = enumeration("type", IssueType::class)
    val status = enumeration("status", IssueStatus::class)
    val priority = enumeration("priority", IssuePriority::class)
    val estimate = integer("estimate").nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    
    override val primaryKey = PrimaryKey(id)
}

object Workflows : Table("workflows") {
    val id = varchar("id", 36)
    val name = varchar("name", 255)
    val stages = text("stages") // JSON serialization
    val transitions = text("transitions") // JSON serialization
    val currentStage = varchar("current_stage", 100)
    val isComplete = bool("is_complete").default(false)
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    
    override val primaryKey = PrimaryKey(id)
}
```

### Domain-Infrastructure Separation

**Key Principles:**
- Domain entities know nothing about Exposed or database concerns
- Repository implementations handle translation between domain and data models
- Value objects enforce type safety at domain boundaries
- Factory methods ensure valid entity construction
- Snapshot pattern enables clean persistence/reconstitution

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