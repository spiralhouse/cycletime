---
title: "Architecture Decision Records (ADR) Index"
type: reference
domain: [architecture, decisions]
description: "Index of all Architecture Decision Records documenting significant architectural choices in CycleTime"
keywords: [adr, architecture-decisions, index]
dependencies: []
related: [../project-fundamentals.md, ../../architecture/overview.md]
last_updated: 2025-10-21
---

# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) that document significant architectural decisions made during the development of CycleTime. Each ADR captures the context, decision, and consequences of an important architectural choice.

## Purpose

ADRs provide:
- **Historical Context**: Why architectural decisions were made
- **Rationale Documentation**: Trade-offs and alternatives considered
- **Knowledge Preservation**: Understanding that survives team changes
- **Decision Tracking**: Clear record of superseded or deprecated approaches

## ADR Format

Each ADR follows a standard structure:
- **Title**: Descriptive name of the decision
- **Status**: accepted | superseded | deprecated
- **Date**: When the decision was made
- **Context**: Problem being solved and constraints
- **Decision**: The chosen approach
- **Consequences**: Positive and negative outcomes
- **Supersedes/Superseded By**: Links to related ADRs

## Index of ADRs

### Active ADRs

These decisions are currently in effect and guide the system's architecture:

| Number | Title | Date | Status | Domain |
|--------|-------|------|--------|--------|
| [0001](./0001-exposed-orm-transaction-pattern.md) | Exposed ORM Transaction Pattern | 2025-08-26 | ✅ Accepted | Persistence |
| [0002](./0002-repository-issue-persistence.md) | Repository Pattern Issue Persistence Strategy | 2025-08-26 | ✅ Accepted | Persistence |
| [0003](./0003-repository-singleton-thread-safety.md) | Repository Singleton Scope and Thread-Safety | 2025-09-02 | ✅ Accepted | Concurrency |
| [0005](./0005-database-initialization-pattern.md) | Database Initialization Pattern | 2025-09-25 | ✅ Accepted | Persistence |
| [0006](./0006-adopt-mcp-kotlin-sdk-v0.7.2.md) | Adopt Official MCP Kotlin SDK v0.7.2 | 2025-10-17 | ✅ Accepted | MCP Integration |

### Superseded ADRs

These decisions were valid at the time but have been replaced by newer approaches:

| Number | Title | Date | Status | Superseded By |
|--------|-------|------|--------|---------------|
| [0004](./0004-lifecycle-managed-cleanup.md) | Lifecycle-Managed Connection Cleanup Service | 2025-09-09 | ⚠️ Superseded | ADR-0006 |

## ADR Summaries

### ADR-0001: Exposed ORM Transaction Pattern
**Decision**: Use Exposed ORM's functional transaction pattern (`execute()` method) for Unit of Work implementation rather than manual begin/commit/rollback methods.

**Rationale**: Exposed's block-scoped transactions provide automatic resource management and cleaner integration with Kotlin coroutines.

**Impact**: All repository operations use `newSuspendedTransaction` blocks, ensuring proper transaction boundaries and connection management.

---

### ADR-0002: Repository Pattern Issue Persistence Strategy
**Decision**: Allow `ProjectRepository` to handle issue associations while maintaining architectural boundaries through dedicated methods.

**Rationale**: Resolved N+1 query problems and referential integrity issues while preserving single responsibility principle.

**Impact**: Projects load with their associated issues in a single query, preventing performance degradation at scale.

---

### ADR-0003: Repository Singleton Scope and Thread-Safety
**Decision**: Repository implementations are thread-safe and can be safely used as singletons in the DI container.

**Rationale**: Exposed ORM's connection management and transaction isolation ensure thread-safety without shared mutable state.

**Impact**: Repositories registered as singletons in Ktor DI, reducing object creation overhead and simplifying dependency management.

---

### ADR-0004: Lifecycle-Managed Connection Cleanup Service (SUPERSEDED)
**Decision**: Replace `GlobalScope.launch` with lifecycle-managed coroutines for MCP WebSocket connection cleanup.

**Status**: Superseded by ADR-0006 (MCP Kotlin SDK adoption with SSE transport).

**Historical Significance**: Documented the transition from problematic GlobalScope usage to proper lifecycle management, principles that inform current SSE implementation.

---

### ADR-0005: Database Initialization Pattern
**Decision**: Implement thread-safe database initialization using double-checked locking with volatile fields.

**Rationale**: Prevents race conditions in concurrent test execution and application startup, especially under CI resource constraints.

**Impact**: Reliable database initialization across all execution environments with proper memory visibility guarantees.

---

### ADR-0006: Adopt Official MCP Kotlin SDK v0.7.2
**Decision**: Replace custom EventBus-based MCP transport with official MCP Kotlin SDK v0.7.2, using SSE transport.

**Rationale**:
- Eliminates session correlation complexity
- Reduces protocol maintenance burden
- Ensures MCP specification compliance
- Provides future-proof architecture for MCP evolution

**Impact**:
- Supersedes ADR-0004 (WebSocket-based cleanup)
- Current transport: SSE + JSON-RPC following MCP spec v2024-11-05
- Simplified codebase with official SDK handling protocol complexity

## Creating New ADRs

When making significant architectural decisions:

1. **Number Sequentially**: Use next available number (0007, 0008, etc.)
2. **Use Standard Format**: Follow the ADR template structure
3. **Add YAML Frontmatter**: Include metadata for discovery and DAG structure
4. **Update This Index**: Add entry to the appropriate section
5. **Link Relationships**: Reference superseded/superseding ADRs
6. **Commit Atomically**: ADR should be part of the implementation commit

## Related Documentation

- **[Project Fundamentals](../project-fundamentals.md)**: Technology stack and architecture overview
- **[Architecture Overview](../../architecture/overview.md)**: System architecture documentation
- **[MCP SDK Migration Plan](../../architecture/mcp-sdk-migration-plan.md)**: Details of ADR-0006 implementation
- **[Repository Patterns](../../patterns/architecture/dependency-injection.md)**: Implementation patterns derived from ADRs

## References

- [Architecture Decision Records (ADR) by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
- [Markdown Any Decision Records (MADR)](https://adr.github.io/madr/)
