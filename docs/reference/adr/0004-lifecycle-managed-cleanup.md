---
title: "ADR-0004: Lifecycle-Managed Connection Cleanup Service"
type: reference
domain: [architecture, decisions, mcp, infrastructure]
description: "Architecture decision for MCP connection cleanup using lifecycle-managed coroutines instead of GlobalScope"
status: superseded
date: 2025-09-09
supersedes: []
superseded_by: [./0006-adopt-mcp-kotlin-sdk-v0.7.2.md]
keywords: [adr, architecture-decision, mcp, websocket, lifecycle, coroutines, cleanup]
dependencies: []
related: [../project-fundamentals.md, ../../architecture/overview.md, ../../patterns/mcp/sse-transport-pattern.md]
last_updated: 2025-10-17
---

# ADR-0004: Lifecycle-Managed Connection Cleanup Service

> **Historical Note**: This document describes the WebSocket-based MCP implementation that was superseded by SSE (Server-Sent Events) transport in SPI-665 (October 2025). CycleTime now uses SSE transport following MCP specification v2024-11-05 via the official MCP Kotlin SDK (ADR-0006).

## Status
Superseded by ADR-0006 (MCP Kotlin SDK adoption)

## Context
The MCP WebSocket server was using `GlobalScope.launch` for connection cleanup tasks, which created several critical production issues:

1. **Resource Leaks**: GlobalScope coroutines survive application shutdown, causing memory leaks
2. **Test Pollution**: Background coroutines continue running between tests, causing failures
3. **No Cancellation**: Impossible to cleanly shutdown the cleanup task
4. **Silent Failures**: Exception handling just logged errors without recovery mechanisms

## Decision
Replace GlobalScope with a properly lifecycle-managed `ConnectionCleanupService` that:

- Uses the Application's coroutine scope for proper lifecycle management
- Implements exponential backoff for failure recovery
- Provides clean shutdown guarantees
- Offers monitoring and status reporting
- Is fully testable in isolation

## Implementation

### Before: GlobalScope Implementation
```kotlin
GlobalScope.launch {
    while (isActive) {
        delay(30_000)
        try {
            connectionManager.cleanupStaleConnections(config.timeout * 2)
        } catch (e: Exception) {
            logger.error("Connection cleanup error: ${e.message}")
        }
    }
}
```

### After: Lifecycle-Managed Service
```kotlin
val cleanupService = ConnectionCleanupService(
    connectionManager = connectionManager,
    config = config,
    cleanupInterval = 30.seconds,
    maxRetries = 3
)
cleanupService.start(application) // Uses application scope

// Proper shutdown
application.monitor.subscribe(ApplicationStopped) {
    runBlocking { cleanupService.stop() }
}
```

## Key Features

### 1. Lifecycle Management
- Starts with application-provided CoroutineScope
- Cancels properly on application shutdown
- No orphaned coroutines

### 2. Error Recovery
- Exponential backoff on failures (2^n seconds)
- Circuit breaker after max retries
- Detailed error reporting

### 3. Monitoring
```kotlin
data class CleanupServiceStatus(
    val isRunning: Boolean,
    val isActive: Boolean,
    val consecutiveFailures: Int,
    val cleanupInterval: Duration
)
```

### 4. Testability
- Injectable dependencies
- Test scope support
- No real time delays in tests
- Clean isolation between tests

## Consequences

### Positive
- **No Memory Leaks**: Proper lifecycle management prevents resource leaks
- **Clean Shutdown**: Application shuts down gracefully without orphaned tasks
- **Test Reliability**: Tests run in isolation without interference
- **Production Resilience**: Automatic recovery from transient failures
- **Observable**: Status endpoint provides visibility into cleanup health

### Negative
- **Additional Complexity**: New service class adds some complexity
- **Migration Effort**: Existing deployments need code update

### Neutral
- **Performance**: Same cleanup interval, just better managed
- **Resource Usage**: Similar memory/CPU footprint

## Testing Strategy

The ConnectionCleanupService includes comprehensive tests for:
- Lifecycle management (start/stop)
- Exception handling with exponential backoff
- Circuit breaker behavior
- Timeout handling
- Clean cancellation
- Resource leak prevention

## Monitoring

The service exposes health metrics via `/mcp/stats`:
```json
{
  "cleanup": {
    "isRunning": true,
    "isActive": true,
    "consecutiveFailures": 0,
    "intervalSeconds": 30
  }
}
```

## Migration Path

1. Deploy new code with ConnectionCleanupService
2. Monitor cleanup health via `/mcp/stats`
3. Verify no orphaned connections in production logs
4. Remove any GlobalScope usage project-wide

## References

- [Kotlin Coroutines Best Practices](https://kotlinlang.org/docs/coroutines-best-practices.html)
- [Structured Concurrency](https://kotlinlang.org/docs/coroutines-basics.html#structured-concurrency)
- [Ktor Application Lifecycle](https://ktor.io/docs/lifecycle.html)