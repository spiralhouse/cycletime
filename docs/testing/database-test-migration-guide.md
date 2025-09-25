# Database Test Migration Guide

## Overview
This guide helps migrate existing integration tests to use the new thread-safe database initialization pattern that prevents race conditions under resource-constrained environments.

## The Problem
Tests that directly initialize `DatabaseFactory` and then call `module()` can experience race conditions:
- Double initialization attempts
- Synchronization failures under CI resource pressure
- Intermittent "Database not initialized" errors

## The Solution
Use the new `DatabaseTestHelper` utility that ensures proper initialization order and prevents race conditions.

## Migration Steps

### Step 1: Import the Helper

```kotlin
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper
import io.spiralhouse.cycletime.test.utils.DatabaseTestHelper.configureTestApplication
```

### Step 2: Update beforeSpec/afterSpec

**Old Pattern:**
```kotlin
beforeSpec {
    val testDbUrl = "jdbc:h2:mem:test_${System.nanoTime()};..."
    DatabaseFactory.init(jdbcUrl = testDbUrl, ...)
}

afterSpec {
    DatabaseFactory.reset()
}
```

**New Pattern:**
```kotlin
beforeSpec {
    DatabaseTestHelper.initTestDatabase(
        testName = "your_test_name",
        enableLogging = false
    )
}

afterSpec {
    DatabaseTestHelper.cleanupTestDatabase()
}
```

### Step 3: Update Test Bodies

**Old Pattern:**
```kotlin
"should do something" {
    testApplication {
        application {
            module()
        }
        // test code
    }
}
```

**New Pattern:**
```kotlin
"should do something" {
    testApplication {
        configureTestApplication(testName = "your_test_name")
        // test code
    }
}
```

## Complete Example

```kotlin
class MyIntegrationTest : StringSpec({

    beforeSpec {
        // Initialize once for all tests in spec
        DatabaseTestHelper.initTestDatabase(
            testName = "my_integration_test",
            enableLogging = false
        )
    }

    afterSpec {
        // Clean up after all tests
        DatabaseTestHelper.cleanupTestDatabase()
    }

    "should handle database operations correctly" {
        testApplication {
            // This ensures database is initialized before module()
            configureTestApplication(testName = "my_integration_test")

            // Your test code here
            val response = client.get("/api/endpoint")
            response.status shouldBe HttpStatusCode.OK
        }
    }
})
```

## Benefits of Migration

1. **Thread Safety**: Eliminates race conditions completely
2. **Idempotency**: Safe to call initialization multiple times
3. **Better Debugging**: Clear logging of initialization state
4. **CI Stability**: Works reliably under resource constraints
5. **Future-Proof**: Prepares for eventual DI migration

## Tests That Don't Need Migration

The following test types don't need migration:
- Unit tests (don't use database)
- Tests using `MockDatabase` or in-memory test doubles
- Tests that don't call `module()`

## Verification

After migration, verify your tests:

```bash
# Run with high concurrency to expose any remaining race conditions
./gradlew clean integrationTest --no-daemon --parallel --max-workers=6
```

## Troubleshooting

### "Database not initialized" Errors
- Ensure `configureTestApplication()` is called instead of direct `module()`
- Check that `beforeSpec` calls `initTestDatabase()`

### Tests Interfering with Each Other
- Use unique test names in `initTestDatabase(testName = "unique_name")`
- Verify `afterSpec` calls `cleanupTestDatabase()`

### Slow Test Startup
- The lock-based initialization adds minimal overhead (<1ms)
- If tests are slow, check for other bottlenecks

## Future Plans

This pattern is temporary. In SPI-627, we will:
1. Eliminate `DatabaseFactory` singleton entirely
2. Use Ktor's native DI for database provisioning
3. Provide isolated database instances per test automatically

Until then, this migration ensures reliable test execution.