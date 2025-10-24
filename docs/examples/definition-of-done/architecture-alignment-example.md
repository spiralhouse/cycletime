---
title: "Architecture Alignment Example - DDD & DI Patterns"
type: example
domain: [architecture]
description: "Demonstrates proper domain-driven design with dependency injection"
dependencies: [../../reference/definition-of-done.md]
related: [../../architecture/overview.md, ../../concepts/architecture/domain-driven-design.md]
keywords: [dod, example, architecture, ddd, dependency-injection]
last_updated: 2025-10-21
---

# Architecture Alignment Example - DDD & DI Patterns

## Context

This example demonstrates how to design components following Domain-Driven Design principles with proper dependency injection using Ktor native DI.

## PASS Example

### Domain Model
```kotlin
/**
 * Session domain entity representing user session state.
 * Contains business logic for session validation.
 */
data class Session(
    val id: String,
    val projectId: String,
    val lastActivity: Instant,
    val metadata: Map<String, String> = emptyMap()
) {
    fun isActiveAt(time: Instant, maxAge: Duration): Boolean {
        val age = Duration.between(lastActivity, time)
        return age <= maxAge
    }
}
```

### Service with DI
```kotlin
/**
 * Validates session expiration based on configured timeout.
 * Uses injected TimeProvider to ensure testability.
 */
class SessionValidator(
    private val timeProvider: TimeProvider,
    private val config: SessionConfig
) {
    fun isExpired(session: Session): Boolean {
        val sessionAge = Duration.between(
            session.lastActivity,
            timeProvider.now()
        )
        return sessionAge > config.maxAge
    }
}
```

### Interface Abstraction
```kotlin
/**
 * Time provider abstraction for testability.
 * Allows mocking time in tests without real delays.
 */
interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}

class MockTimeProvider : TimeProvider {
    private var currentTime: Instant = Clock.System.now()

    override fun now(): Instant = currentTime

    fun setTime(time: Instant) {
        currentTime = time
    }

    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
}
```

### Ktor DI Configuration
```kotlin
fun Application.configureDependencies() {
    dependencies {
        provide<TimeProvider> { SystemTimeProvider() }
        provide<SessionConfig> { SessionConfig.fromEnvironment() }
        provide<SessionValidator> {
            SessionValidator(
                instance(), // TimeProvider
                instance()  // SessionConfig
            )
        }
    }
}
```

## Explanation

**Why This Passes DoD:**
- Domain model contains business logic
- Dependencies injected via interfaces
- TimeProvider abstraction enables testing
- Follows layered architecture
- No infrastructure dependencies in domain
- Configuration externalized

## Related DoD Criteria

- Section 1.3: Architecture Alignment - DDD, DI, layered architecture
- Section 11.5: Time-Mockable Architecture - Injected time dependencies
- Architecture Overview: Clean separation of concerns
