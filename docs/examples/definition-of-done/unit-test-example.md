---
title: "Unit Test Example - Session Validator"
type: example
domain: [testing]
description: "Demonstrates proper unit test patterns with time mocking and isolated dependencies"
dependencies: [../../reference/definition-of-done.md]
related: [../../concepts/testing/test-architecture.md, ../../../.claude/shared/testing-standards.md]
keywords: [dod, example, unit-testing, mocking, time-provider]
last_updated: 2025-10-21
---

# Unit Test Example - Session Validator

## Context

This example demonstrates a proper unit test for session expiration logic. The test uses a mock time provider to control time progression, ensuring fast, deterministic test execution without real delays.

## PASS Example

```kotlin
class SessionValidatorTest : StringSpec({
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var validator: SessionValidator

    beforeEach {
        mockTimeProvider = MockTimeProvider()
        validator = SessionValidator(
            mockTimeProvider,
            SessionConfig(maxAge = Duration.ofSeconds(60))
        )
    }

    "should expire session when maxAge exceeded" {
        val session = Session(
            lastActivity = mockTimeProvider.now()
        )

        mockTimeProvider.advance(Duration.ofSeconds(61))

        validator.isExpired(session) shouldBe true
    }

    "should not expire session within maxAge" {
        val session = Session(
            lastActivity = mockTimeProvider.now()
        )

        mockTimeProvider.advance(Duration.ofSeconds(59))

        validator.isExpired(session) shouldBe false
    }
})
```

## Implementation Under Test

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

## Explanation

**Why This Passes DoD:**
- Fast execution (< 10ms per test) - no real delays
- Isolated dependencies - uses MockTimeProvider
- Deterministic - tests pass consistently
- Tests both edge cases (expired and not expired)
- Business logic coverage is 100%
- Uses AAA pattern (Arrange, Act, Assert)

## Related DoD Criteria

- Section 5.1: Unit Tests - Fast, isolated, no external dependencies
- Section 11.5: Time-Mockable Architecture - All time dependencies injected
- Section 5.4: Test Quality Standards - Deterministic, independent, clear names
