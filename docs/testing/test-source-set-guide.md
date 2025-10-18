# Test Source Set Organization Guide

## Overview

CycleTime uses Gradle source sets to physically separate unit, integration, and system tests. This guide explains how to write and organize tests in the correct location.

## Quick Reference

| Test Type | Location | Dependencies | Execution Time | Use Case |
|-----------|----------|--------------|----------------|----------|
| **Unit** | `src/test/kotlin/` | Mocks/fakes only | < 10ms | Business logic, domain models, protocol handlers |
| **Integration** | `src/integrationTest/kotlin/` | Real database/HTTP | < 100ms | Repository tests, API endpoints, infrastructure |
| **System** | `src/systemTest/kotlin/` | Full system | < 1s | Performance tests, end-to-end workflows |

## Source Set Structure

```
src/
├── test/kotlin/                      # Unit Tests (48 files)
│   ├── io/spiralhouse/cycletime/
│   │   ├── unit/                    # General unit tests
│   │   ├── verification/            # Verification tests
│   │   ├── mcp/tools/               # MCP tool handler tests
│   │   ├── mcp/integration/         # MCP protocol tests (shared fixtures)
│   │   └── test/utils/              # Shared test utilities
│
├── integrationTest/kotlin/          # Integration Tests (33 files)
│   ├── io/spiralhouse/cycletime/
│   │   ├── integration/             # Infrastructure integration tests
│   │   │   ├── mcp/                # MCP integration tests
│   │   │   ├── sse/                # SSE transport tests
│   │   │   ├── edge/               # Edge case tests
│   │   │   ├── concurrency/        # Concurrency tests
│   │   │   └── api/v1/             # API endpoint tests
│   │   ├── api/                    # API tests
│   │   └── infrastructure/         # Infrastructure component tests
│
└── systemTest/kotlin/               # System Tests (2 files)
    ├── io/spiralhouse/cycletime/
    │   ├── system/mcp/sdk/         # SDK system tests
    │   └── performance/            # Performance baseline tests
```

## Writing New Tests

### Creating a Unit Test

**Location**: `src/test/kotlin/io/spiralhouse/cycletime/`

**Example**:
```kotlin
package io.spiralhouse.cycletime.domain

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.domain.Session

class SessionManagerTest : StringSpec({
    "should create new session with unique ID" {
        val sessionManager = SessionManager()
        val session = sessionManager.create()

        session.id shouldNotBe null
    }
})
```

**Characteristics**:
- No real database or network calls
- Uses mocks/fakes for external dependencies
- Fast execution (< 10ms per test)
- Focuses on business logic correctness

### Creating an Integration Test

**Location**: `src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/`

**Example**:
```kotlin
package io.spiralhouse.cycletime.integration.repository

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import org.jetbrains.exposed.sql.Database
import io.spiralhouse.cycletime.domain.Session

class SessionRepositoryIntegrationTest : StringSpec({
    lateinit var database: Database
    lateinit var sessionRepository: SessionRepository

    beforeEach {
        database = Database.connect("jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1")
        sessionRepository = ExposedSessionRepository(database)
    }

    "should persist and retrieve session" {
        val session = Session(id = "test-123")
        sessionRepository.save(session)

        val retrieved = sessionRepository.findById("test-123")
        retrieved shouldBe session
    }
})
```

**Characteristics**:
- Uses real database (H2 in-memory for tests)
- Tests infrastructure integration
- Moderate execution time (< 100ms per test)
- Verifies component interactions

### Creating a System Test

**Location**: `src/systemTest/kotlin/io/spiralhouse/cycletime/system/`

**Example**:
```kotlin
package io.spiralhouse.cycletime.system.performance

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.longs.shouldBeLessThan
import kotlin.system.measureTimeMillis

class PerformanceBaselineTest : StringSpec({
    "session creation should complete within 100ms" {
        val duration = measureTimeMillis {
            repeat(100) {
                createSession()
            }
        }

        duration shouldBeLessThan 100
    }
})
```

**Characteristics**:
- End-to-end workflows or performance testing
- Uses full system integration
- Longer execution time acceptable (< 1s per test)
- Verifies performance and system behavior

## Running Tests

### From Command Line

```bash
# Run specific test category
./gradlew unitTest              # Unit tests only
./gradlew integrationTest       # Integration tests only
./gradlew systemTest            # System tests only

# Run all tests
./gradlew testAll               # Sequential: unit → integration → system

# Run specific test file
./gradlew test --tests "SessionManagerTest"
./gradlew integrationTest --tests "SessionRepositoryIntegrationTest"

# Run with coverage
./gradlew testAll koverHtmlReport   # Generates coverage report
```

### From IntelliJ IDEA

1. **Run entire source set**:
   - Right-click on `test`, `integrationTest`, or `systemTest` folder
   - Select "Run All Tests"

2. **Run individual test**:
   - Open test file
   - Click green arrow next to test class or test method
   - Select "Run" or "Debug"

3. **Run with coverage**:
   - Right-click on source set folder
   - Select "Run All Tests with Coverage"

## Shared Test Utilities

**Location**: `src/test/kotlin/io/spiralhouse/cycletime/test/utils/`

Test utilities and fixtures in the `test` source set are accessible from all test types:

```kotlin
// src/test/kotlin/io/spiralhouse/cycletime/test/utils/TestData.kt
package io.spiralhouse.cycletime.test.utils

object TestData {
    val sampleSession = Session(id = "test-123")
}

// Accessible from unit tests
// src/test/kotlin/io/spiralhouse/cycletime/domain/SomeTest.kt
import io.spiralhouse.cycletime.test.utils.TestData

// Accessible from integration tests
// src/integrationTest/kotlin/io/spiralhouse/cycletime/integration/SomeIntegrationTest.kt
import io.spiralhouse.cycletime.test.utils.TestData

// Accessible from system tests
// src/systemTest/kotlin/io/spiralhouse/cycletime/system/SomeSystemTest.kt
import io.spiralhouse.cycletime.test.utils.TestData
```

**Reason**: The `integrationTest` and `systemTest` source sets include `test` source set output in their classpath, making shared utilities accessible everywhere.

## Decision Tree: Which Source Set?

```
┌─────────────────────────────────────────┐
│ Writing a new test?                     │
└───────────────┬─────────────────────────┘
                │
                ▼
       ┌────────────────────┐
       │ Does test use      │─── YES ──▶ System Test
       │ performance        │            (src/systemTest/kotlin/)
       │ testing or e2e?    │
       └────────┬───────────┘
                │ NO
                ▼
       ┌────────────────────┐
       │ Does test use      │─── YES ──▶ Integration Test
       │ real database or   │            (src/integrationTest/kotlin/)
       │ HTTP calls?        │
       └────────┬───────────┘
                │ NO
                ▼
       ┌────────────────────┐
       │ Uses only mocks/   │─── YES ──▶ Unit Test
       │ fakes/in-memory?   │            (src/test/kotlin/)
       └────────────────────┘
```

## Migration from Old Structure

**Before** (package-based organization):
```
src/test/kotlin/io/spiralhouse/cycletime/
├── unit/SomeTest.kt
├── integration/SomeIntegrationTest.kt
└── system/SomeSystemTest.kt
```

**After** (source set organization):
```
src/
├── test/kotlin/io/spiralhouse/cycletime/unit/SomeTest.kt
├── integrationTest/kotlin/io/spiralhouse/cycletime/integration/SomeIntegrationTest.kt
└── systemTest/kotlin/io/spiralhouse/cycletime/system/SomeSystemTest.kt
```

**Migration completed**: All existing tests have been migrated to the new structure (SPI-708).

## Benefits of Source Set Organization

1. **Immediate Clarity**: Test type visible from file path, no need to inspect code
2. **No Filter Configuration**: Physical separation eliminates complex Gradle filter patterns (114 lines eliminated)
3. **IDE Recognition**: IntelliJ automatically recognizes source sets (green test folders)
4. **Simplified Maintenance**: No package pattern updates needed when reorganizing tests
5. **Better Caching**: Gradle's incremental compilation works more effectively with source set separation
6. **Clear Boundaries**: Impossible to accidentally run wrong test category (source set provides isolation)

## Common Questions

**Q: Where do shared test utilities go?**
A: `src/test/kotlin/io/spiralhouse/cycletime/test/utils/`. These are accessible from all test types via classpath configuration.

**Q: Can I run just integration tests for a specific module?**
A: Yes: `./gradlew integrationTest --tests "io.spiralhouse.cycletime.integration.database.*"`

**Q: How do I debug an integration test in IntelliJ?**
A: Right-click on test file → "Debug '<TestName>'". Works exactly like unit tests.

**Q: Do I need to update .gitignore or .idea files?**
A: No. IntelliJ automatically recognizes Gradle source sets. No manual configuration required.

**Q: What if I'm not sure which source set to use?**
A: Default to unit test (`src/test/kotlin/`). During code review, reviewers will suggest moving to integration or system test if needed based on dependencies.

**Q: How do I know if my test is in the right source set?**
A: Ask yourself:
- Does it use a real database? → Integration test
- Does it use mocks for everything? → Unit test
- Does it measure performance or test full workflows? → System test

**Q: What happens if I put a test in the wrong source set?**
A: The test will still run, but you lose the benefits of proper categorization. Tests might run slower than needed (unit test in integration source set) or might not have access to required infrastructure (integration test in unit source set).

## See Also

- **.claude/shared/testing-standards.md** - Complete testing standards and best practices
- **.claude/shared/development-commands.md** - All development and testing commands
- **SPI-708** - Linear issue documenting the source set migration

---

**Last Updated**: SPI-708 (October 2025)
**Maintained By**: CycleTime development team
