---
title: "ADR-0003: Repository Singleton Scope and Thread-Safety"
type: reference
domain: [architecture, decisions, persistence, concurrency]
description: "Architecture decision verifying thread-safety of repository singletons with Exposed ORM connection management"
status: accepted
date: 2025-09-02
supersedes: []
superseded_by: []
keywords: [adr, architecture-decision, thread-safety, singleton, concurrency, repository-pattern]
dependencies: [./0001-exposed-orm-transaction-pattern.md, ./0002-repository-issue-persistence.md]
related: [../project-fundamentals.md, ../../architecture/overview.md]
last_updated: 2025-09-02
---

# ADR-0003: Repository Singleton Scope and Thread-Safety

## Status
Accepted

## Context

During the implementation of H2 database integration (SPI-439), we needed to verify that our repository implementations are thread-safe for use as singletons in the dependency injection container. Concurrency tests revealed potential issues that needed to be addressed.

### Key Concerns
1. Multiple concurrent requests accessing the same repository instance
2. Transaction isolation and connection management
3. Potential for shared mutable state causing race conditions
4. Performance implications of different scoping strategies

## Decision

We will maintain **singleton scope** for all repository implementations with explicit thread-safety guarantees.

### Implementation Strategy

1. **Immutable Dependencies Only**
   - Repositories only hold immutable references (TimeProvider, Database)
   - No mutable instance variables or caches

2. **Transaction-Per-Operation Pattern**
   ```kotlin
   private suspend fun <T> dbQuery(block: suspend () -> T): T {
       val currentTransaction = TransactionManager.currentOrNull()
       return if (currentTransaction != null) {
           block() // Participate in existing transaction
       } else {
           newSuspendedTransaction(Dispatchers.IO, database) { block() }
       }
   }
   ```

3. **Connection Pool Management**
   - HikariCP handles connection pooling (10 connections default)
   - Each transaction gets a connection from the pool
   - Connections are returned immediately after transaction completion

4. **Explicit Documentation**
   - @ThreadSafe annotation on repository classes
   - Comprehensive documentation of concurrency guarantees
   - Clear explanation in DI configuration

## Consequences

### Positive
- **Performance**: No object creation overhead per request
- **Memory Efficiency**: Single instance per repository type
- **Simplicity**: No complex scoping rules or request-scoped containers
- **Predictability**: Consistent behavior across all deployment scenarios
- **Testing**: Easy to test with mock implementations

### Negative
- **No Request Context**: Cannot store request-specific data in repositories
- **Careful Implementation**: Developers must maintain thread-safety invariants
- **Limited Caching**: Cannot use instance-level caches without synchronization

### Neutral
- **Standard Practice**: Singleton repositories are common in enterprise applications
- **Framework Support**: Exposed ORM designed for this pattern
- **Migration Path**: Could change to request scope if needed (but unlikely)

## Performance Analysis

### Singleton Scope (Current)
- Object creation: 1 per application lifetime
- Memory overhead: ~100 bytes per repository
- GC pressure: Minimal
- Thread contention: None (stateless)

### Alternative: Request Scope (Rejected)
- Object creation: 1 per HTTP request
- Memory overhead: ~100 bytes × concurrent requests
- GC pressure: Significant with high traffic
- Thread contention: None (isolated instances)

### Comparative Analysis (Development Testing)

During development testing with 1000 simulated concurrent requests, singleton scope demonstrated lower memory overhead and comparable response times:
- Singleton scope: Lower memory usage, minimal GC pressure
- Request scope: Higher allocation rate, increased GC overhead

Note: Production performance will vary based on workload patterns and hardware.

## Validation

Concurrency tests confirm thread-safety:
- No data corruption under 100+ concurrent operations
- No deadlocks with proper lock timeouts
- Consistent transaction isolation
- Proper connection pool utilization

## Notes

### Why H2 2.x Compatibility Matters
H2 2.x removed MVCC mode, relying instead on improved transaction isolation. Our implementation works correctly with both H2 1.x and 2.x because we:
- Don't rely on MVCC-specific features
- Use standard transaction isolation levels
- Configure appropriate lock timeouts

### Future Considerations
If we ever need request-scoped repositories (unlikely), we would need to:
1. Implement request context propagation
2. Update DI configuration for request scope
3. Handle cleanup of request-scoped resources
4. Consider performance implications

## References
- [Exposed Documentation: Transactions](https://github.com/JetBrains/Exposed/wiki/Transactions)
- [HikariCP Thread-Safety](https://github.com/brettwooldridge/HikariCP#thread-safety)
- [H2 Database: Concurrency](http://www.h2database.com/html/advanced.html#concurrency)