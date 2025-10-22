---
title: "ADR-0002: Repository Pattern Issue Persistence Strategy"
type: reference
domain: [architecture, decisions, persistence]
description: "Architecture decision for handling Project-Issue associations in repository pattern with referential integrity"
status: accepted
date: 2025-08-26
supersedes: []
superseded_by: []
keywords: [adr, architecture-decision, repository-pattern, persistence, relationships, n-plus-one]
dependencies: [./0001-exposed-orm-transaction-pattern.md]
related: [../project-fundamentals.md, ../../architecture/overview.md]
last_updated: 2025-08-26
---

# ADR-0002: Repository Pattern Issue Persistence Strategy

## Status
Accepted

## Context
The CI tests for SPI-439 revealed critical architectural issues with how the repository pattern handles entity relationships, specifically the Project-Issue association. The original implementation followed a strict single responsibility principle where `ProjectRepository` did not handle issue persistence, expecting it to be managed by a separate `IssueRepository`.

### Problems Identified:
1. **Issue Loading Failure**: Projects saved with issues were retrieved without their issues (test failures showing 0 issues instead of expected 3)
2. **N+1 Query Problem**: Each project loaded its issues individually, causing performance degradation at scale
3. **Referential Integrity**: Issues added to projects in-memory were not persisted to the database

## Decision
We've modified the `ExposedProjectRepository` to handle issue associations while maintaining architectural boundaries:

### 1. Issue Persistence in ProjectRepository
The `ProjectRepository` now manages the persistence of issue associations when saving projects. This ensures that the aggregate root (Project) maintains consistency of its bounded context.

```kotlin
private fun persistProjectIssues(project: Project) {
    // Creates minimal placeholder issue records
    // Full issue details managed by IssueRepository
}
```

### 2. Batch Loading Implementation
To address the N+1 query problem, we've implemented batch loading for issue retrieval:

```kotlin
private fun loadProjectIssueIdsBatch(projectIds: List<String>): Map<String, List<IssueId>>
```

This reduces database queries from N+1 to 2 (one for projects, one for all issues).

### 3. Aggregate Boundary Respect
While the `ProjectRepository` manages issue associations, it creates only minimal placeholder records. The full issue entity management remains the responsibility of `IssueRepository` (when implemented).

## Consequences

### Positive:
- **Data Integrity**: Projects and their issues maintain consistency
- **Performance**: Batch loading eliminates N+1 query issues
- **Test Success**: All repository tests now pass with proper issue loading
- **Aggregate Consistency**: The Project aggregate root properly manages its boundaries

### Negative:
- **Temporary Coupling**: Until `IssueRepository` is fully implemented, there's some coupling between project and issue persistence
- **Placeholder Records**: Issue records created by `ProjectRepository` are minimal and need enrichment by `IssueRepository`

### Trade-offs:
- We've balanced pure single responsibility against practical aggregate consistency
- The solution is pragmatic: it works now and can be refactored when `IssueRepository` is implemented

## Implementation Details

### Files Modified:
- `/src/main/kotlin/io/spiralhouse/cycletime/infrastructure/persistence/ExposedProjectRepository.kt`
  - Added `persistProjectIssues()` method
  - Added `loadProjectIssueIdsBatch()` for performance
  - Modified `findAll()` and `findByStatus()` to use batch loading

- `/src/test/kotlin/io/spiralhouse/cycletime/integration/H2DatabaseDriverTest.kt`
  - Fixed H2 version check to use regex pattern matching

### Query Optimization:
Batch loading pattern reduces the N+1 query problem:
- **Before**: 1 + N queries (one per project with issues)
- **After**: 2 queries total (projects + batch issue loading)

This approach scales independently of project count, improving performance for large datasets.

## Future Considerations
When implementing the full `IssueRepository`:
1. Consider event sourcing for aggregate synchronization
2. Implement a proper Unit of Work pattern for cross-aggregate transactions
3. Consider CQRS for read-optimized queries

## References
- SPI-439: Repository H2 Integration
- PR #42: H2 Database Integration
- Domain-Driven Design by Eric Evans (Aggregate pattern)