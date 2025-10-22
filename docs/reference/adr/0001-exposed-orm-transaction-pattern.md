# ADR-0001: Exposed ORM Transaction Pattern

**Date**: 2025-08-26  
**Status**: Accepted  
**Context**: Repository Pattern Implementation with Exposed ORM

## Context

The CycleTime project uses the Repository Pattern to abstract data access logic from business logic. As part of this pattern, we need a Unit of Work interface to manage database transactions across multiple repository operations. 

Exposed ORM, our chosen database access framework, has a specific transaction model that differs from traditional transaction management approaches used in frameworks like Hibernate or Spring Data JPA.

## Problem Statement

We need to define a transaction management pattern that:

1. Works with Exposed ORM's block-scoped transaction model
2. Maintains clean separation between domain and infrastructure layers
3. Provides a consistent interface across different potential database implementations
4. Ensures proper resource management and prevents connection leaks

## Decision

We will adopt a **functional transaction pattern** using the `execute()` method as the primary transaction management approach, while maintaining method signatures for manual transaction control (begin/commit/rollback) that throw `UnsupportedOperationException` in the Exposed implementation.

### The Pattern

```kotlin
interface UnitOfWork {
    // Primary approach - functional transaction boundary
    suspend fun <T> execute(block: suspend () -> T): T
    
    // Manual control - not supported in Exposed implementation
    suspend fun begin()    // throws UnsupportedOperationException
    suspend fun commit()   // throws UnsupportedOperationException
    suspend fun rollback() // throws UnsupportedOperationException
}
```

### Implementation with Exposed

```kotlin
class ExposedUnitOfWork(private val database: Database) : UnitOfWork {
    override suspend fun <T> execute(block: suspend () -> T): T {
        return newSuspendedTransaction(Dispatchers.IO, database) {
            block()
        }
    }
    
    override suspend fun begin() {
        throw UnsupportedOperationException(
            "Manual transaction control is not supported with Exposed ORM. " +
            "Use execute() method for automatic transaction management."
        )
    }
    // Similar for commit() and rollback()
}
```

## Rationale

### Why Exposed Doesn't Support Manual Transaction Control

1. **Thread-Local Transaction Context**: Exposed binds transactions to the current thread/coroutine context
2. **Block-Scoped Lifecycle**: Transactions are designed to live within a code block scope
3. **Automatic Resource Management**: Exposed automatically handles commits/rollbacks based on block completion
4. **Connection Safety**: Manual control would risk connection leaks and inconsistent states

### Benefits of the Functional Pattern

1. **Guaranteed Cleanup**: Transactions always commit or rollback, preventing resource leaks
2. **Exception Safety**: Automatic rollback on exceptions without explicit try-catch blocks
3. **Composability**: Transaction blocks can be easily composed and nested
4. **Coroutine Integration**: Natural fit with Kotlin's suspend functions and structured concurrency

### Trade-offs

**Advantages**:
- Simple, consistent API that's hard to misuse
- Automatic resource management prevents common errors
- Natural integration with Kotlin's functional programming features
- Clear transaction boundaries in code

**Disadvantages**:
- Less flexibility for complex transaction scenarios
- Cannot implement certain patterns (e.g., manual savepoints)
- Different from traditional imperative transaction management
- May require refactoring if switching ORMs

## Consequences

### Positive Consequences

1. **Simplified Error Handling**: No need for explicit rollback calls in catch blocks
2. **Reduced Boilerplate**: No manual begin/commit code
3. **Better Testing**: Easy to mock the execute method for unit tests
4. **Clear Intent**: Transaction boundaries are visually clear in code

### Negative Consequences

1. **Limited Flexibility**: Cannot pause and resume transactions across method boundaries
2. **Migration Complexity**: If we switch to a different ORM, we may need to refactor service code
3. **Learning Curve**: Developers familiar with manual transaction control need to adapt

## Migration Path

If future requirements demand manual transaction control, we have several options:

### Option 1: JDBC Direct Access
```kotlin
class JdbcUnitOfWork(private val dataSource: DataSource) : UnitOfWork {
    private val connection = ThreadLocal<Connection>()
    
    override suspend fun begin() {
        connection.set(dataSource.connection)
        connection.get().autoCommit = false
    }
    
    override suspend fun commit() {
        connection.get()?.commit()
        connection.get()?.close()
        connection.remove()
    }
}
```

### Option 2: Hybrid Approach
Maintain Exposed for simple operations while using JDBC for complex transaction scenarios.

### Option 3: Different ORM
Migrate to an ORM that supports manual transaction control (e.g., Hibernate, JOOQ).

## Implementation Guidelines

### DO:
```kotlin
// Use execute for all transactional operations
class ProjectService(private val unitOfWork: UnitOfWork) {
    suspend fun createProject(project: Project): Project {
        return unitOfWork.execute {
            // All operations here are transactional
            repository.save(project)
        }
    }
}
```

### DON'T:
```kotlin
// Don't attempt manual transaction control
class ProjectService(private val unitOfWork: UnitOfWork) {
    suspend fun createProject(project: Project): Project {
        unitOfWork.begin() // Will throw UnsupportedOperationException
        val result = repository.save(project)
        unitOfWork.commit()
        return result
    }
}
```

## References

- [Exposed Transaction Documentation](https://github.com/JetBrains/Exposed/wiki/Transactions)
- [Unit of Work Pattern - Martin Fowler](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Repository Pattern with Unit of Work](https://www.programmingwithwolfgang.com/repository-pattern-net-core/)

## Review and Approval

- **Author**: Software Architect Agent
- **Reviewed by**: Tech Lead Agent (pending)
- **Approved by**: Project Lead (pending)

## Appendix: Example Usage

### Simple Transaction
```kotlin
val project = unitOfWork.execute {
    projectRepository.save(newProject)
}
```

### Complex Transaction with Multiple Operations
```kotlin
val result = unitOfWork.execute {
    val project = projectRepository.save(newProject)
    issueRepository.saveAll(project.id, issues)
    labelRepository.attachLabels(project.id, labels)
    project
}
```

### Nested Service Calls
```kotlin
class ProjectOrchestrator(
    private val unitOfWork: UnitOfWork,
    private val projectService: ProjectService,
    private val issueService: IssueService
) {
    suspend fun createProjectWithIssues(spec: ProjectSpec): Project {
        return unitOfWork.execute {
            val project = projectService.createProject(spec.project)
            spec.issues.forEach { issueSpec ->
                issueService.createIssue(project.id, issueSpec)
            }
            project
        }
    }
}
```