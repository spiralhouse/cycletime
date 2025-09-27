# DatabaseFactory to Ktor Native DI Migration Plan

## Executive Summary

The current `DatabaseFactory` singleton pattern is preventing parallel test execution and causing test isolation issues. Tests must run sequentially (`maxParallelForks = 1`) as a workaround, significantly increasing CI build times. This document outlines a comprehensive migration plan to replace the singleton with proper dependency injection using Ktor's native DI capabilities.

## Current State Analysis

### 1. DatabaseFactory Singleton Issues

#### Location: `/src/main/kotlin/io/spiralhouse/cycletime/infrastructure/database/DatabaseConfig.kt`

**Current Implementation Problems:**
- **Singleton Pattern (lines 263-360)**: Global mutable state shared across all tests
- **Synchronization Overhead**: `ReentrantLock` and `@Synchronized` blocks (temporary fix for race conditions)
- **Test Isolation Failures**: When one test calls `reset()`, it closes HikariDataSource for ALL running tests
- **Forced Sequential Execution**: Tests run with `maxParallelForks = 1` to prevent conflicts
- **Resource Leaks**: Tests rely on JVM termination for cleanup rather than proper lifecycle management

#### Usage Points (3 files total):
1. **Application.kt (line 127)**: `DatabaseFactory.init()` during startup
2. **Application.kt (line 128)**: `DatabaseFactory.getInstance()` to get database
3. **Application.kt (line 583)**: `DatabaseFactory.close()` during shutdown
4. **DatabaseTestHelper.kt (lines 37-43)**: Test initialization with `DatabaseFactory.init()`
5. **DatabaseTestHelper.kt (line 37)**: `DatabaseFactory.isInitialized()` check

### 2. Current Ktor DI Configuration

#### Location: `/src/main/kotlin/io/spiralhouse/cycletime/infrastructure/di/Dependencies.kt`

**Existing DI Pattern:**
```kotlin
// Line 52-65: Main DI configuration
fun Application.configureDependencies(
    database: Database,  // Database passed as parameter
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    dependencies {
        provide<Database> { database }  // Registered as singleton
        provide<ExposedUnitOfWork> {
            ExposedUnitOfWork(resolve())  // Uses injected database
        }
        // Repositories use constructor injection
        provide<ExposedProjectRepository> {
            ExposedProjectRepository(
                timeProvider = resolve(),
                database = resolve()  // Injected database
            )
        }
    }
}
```

**Key Observations:**
- Database is already passed as a parameter to `configureDependencies()`
- All repositories already accept database via constructor injection
- DI container manages singleton scope automatically
- Pattern is well-established for other dependencies (TimeProvider, etc.)

### 3. Test Infrastructure

#### Current Test Patterns:

**TestDatabaseFactory** (`/src/test/.../infrastructure/database/TestDatabaseFactory.kt`):
- Provides isolated test database creation
- Three naming strategies: UUID, SEQUENTIAL, FIXED
- Already returns `Database` instances (not using DatabaseFactory)

**TestSupport** (`/src/test/.../infrastructure/di/modules/test/TestSupport.kt`):
- Creates test databases using `TestDatabaseFactory.createTestDatabase()`
- Configures DI with test database instance
- No dependency on DatabaseFactory singleton

**DatabaseTestHelper** (`/src/test/.../test/utils/DatabaseTestHelper.kt`):
- Still uses `DatabaseFactory.init()` (lines 37-43)
- Needs migration to DI pattern
- Contains workarounds for singleton issues

## Proposed DI-Based Architecture

### 1. DatabaseProvider Interface

```kotlin
// New file: src/main/kotlin/.../infrastructure/database/DatabaseProvider.kt
package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.sql.Database
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Provider interface for database access.
 * Enables proper dependency injection and test isolation.
 */
interface DatabaseProvider {
    /**
     * Get the database connection.
     * In production: returns singleton connection
     * In tests: returns test-specific instance
     */
    fun getDatabase(): Database

    /**
     * Execute a suspending database query.
     */
    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO, getDatabase()) { block() }

    /**
     * Close database connections (for graceful shutdown).
     */
    fun close()
}
```

### 2. Default Implementation

```kotlin
// New file: src/main/kotlin/.../infrastructure/database/DefaultDatabaseProvider.kt
package io.spiralhouse.cycletime.infrastructure.database

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.LoggerFactory

/**
 * Production database provider with connection pooling.
 * Replaces DatabaseFactory singleton with DI-managed instance.
 */
class DefaultDatabaseProvider(
    private val config: DatabaseConfig
) : DatabaseProvider {
    private val logger = LoggerFactory.getLogger(DefaultDatabaseProvider::class.java)
    private val dataSource: HikariDataSource
    private val database: Database

    init {
        logger.info("Initializing database with URL: ${config.jdbcUrl}")

        val hikariConfig = HikariConfig().apply {
            jdbcUrl = config.jdbcUrl
            if (!jdbcUrl.startsWith("jdbc:h2:")) {
                driverClassName = config.driver
            }
            maximumPoolSize = config.maxPoolSize
            minimumIdle = config.minPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_SERIALIZABLE"
            connectionTimeout = 30000
            idleTimeout = 600000
            maxLifetime = 1800000
            leakDetectionThreshold = 60000
            validationTimeout = 5000
            poolName = "CycleTimeHikariCP"
        }

        dataSource = HikariDataSource(hikariConfig)
        database = Database.connect(dataSource)

        // Initialize schema
        transaction(database) {
            TableRegistry.validate()
            SchemaUtils.createMissingTablesAndColumns(
                *TableRegistry.ALL_TABLES.toTypedArray()
            )
        }

        logger.info("Database initialized successfully")
    }

    override fun getDatabase(): Database = database

    override fun close() {
        if (!dataSource.isClosed) {
            dataSource.close()
            logger.info("Database connections closed")
        }
    }
}
```

### 3. Test Implementation

```kotlin
// New file: src/test/kotlin/.../infrastructure/database/TestDatabaseProvider.kt
package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.UUID

/**
 * Test database provider with per-test isolation.
 * Each instance creates a unique in-memory database.
 */
class TestDatabaseProvider(
    strategy: TestDatabaseNamingStrategy = TestDatabaseNamingStrategy.UUID
) : DatabaseProvider {
    private val database: Database

    init {
        val dbName = when (strategy) {
            TestDatabaseNamingStrategy.UUID -> "test_${UUID.randomUUID()}"
            TestDatabaseNamingStrategy.SEQUENTIAL -> "test_db_${sequentialCounter.incrementAndGet()}"
            TestDatabaseNamingStrategy.FIXED -> "test_db_fixed"
        }

        database = Database.connect(
            url = "jdbc:h2:mem:$dbName;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        // Initialize schema
        transaction(database) {
            TableRegistry.validate()
            SchemaUtils.create(*TableRegistry.ALL_TABLES.toTypedArray())
        }
    }

    override fun getDatabase(): Database = database

    override fun close() {
        // H2 in-memory databases are automatically cleaned up
        // No explicit close needed for test databases
    }

    companion object {
        private val sequentialCounter = java.util.concurrent.atomic.AtomicInteger(0)
    }
}
```

### 4. Updated DI Configuration

```kotlin
// Update: src/main/kotlin/.../infrastructure/di/Dependencies.kt
fun Application.configureDependencies(
    databaseProvider: DatabaseProvider? = null,  // Accept provider instead of database
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    dependencies {
        // Create default provider if not provided
        provide<DatabaseProvider> {
            databaseProvider ?: DefaultDatabaseProvider(
                DatabaseConfig(
                    jdbcUrl = buildDatabaseConfig().jdbcUrl,
                    driver = buildDatabaseConfig().driver,
                    maxPoolSize = 10,
                    minPoolSize = 2,
                    enableLogging = buildDatabaseConfig().enableLogging
                )
            )
        }

        // Provide database from provider for backward compatibility
        provide<Database> {
            resolve<DatabaseProvider>().getDatabase()
        }

        // Rest remains the same...
    }
}
```

## Migration Plan

### Phase 1: Add New Infrastructure (No Breaking Changes)
**Files to Create:**
1. `DatabaseProvider.kt` - Interface definition
2. `DefaultDatabaseProvider.kt` - Production implementation
3. `TestDatabaseProvider.kt` - Test implementation

**Validation:**
- All new code compiles
- No existing code is broken
- Tests still pass with DatabaseFactory

### Phase 2: Update Application.kt
**Changes Required:**
```kotlin
// Before (lines 127-128):
DatabaseFactory.init(jdbcUrl = config.jdbcUrl, driver = config.driver, enableLogging = config.enableLogging)
val database = DatabaseFactory.getInstance()

// After:
val databaseProvider = DefaultDatabaseProvider(
    DatabaseConfig(
        jdbcUrl = config.jdbcUrl,
        driver = config.driver,
        maxPoolSize = 10,
        minPoolSize = 2,
        enableLogging = config.enableLogging
    )
)
val database = databaseProvider.getDatabase()

// Update configureDependencies call:
configureDependencies(
    databaseProvider = databaseProvider,
    timeProvider = null,
    includeMCP = mcpEnabled
)

// Update shutdown (line 583):
// Before: DatabaseFactory.close()
// After:
val provider: DatabaseProvider by dependencies
provider.close()
```

### Phase 3: Update Test Infrastructure
**Files to Modify:**

1. **DatabaseTestHelper.kt**:
```kotlin
// Remove DatabaseFactory usage
// Use TestDatabaseProvider directly
fun ApplicationTestBuilder.configureTestApplication(
    testName: String = "test",
    enableLogging: Boolean = false
) {
    val testProvider = TestDatabaseProvider(TestDatabaseNamingStrategy.UUID)

    application {
        configureDependencies(
            databaseProvider = testProvider,
            timeProvider = null,
            includeMCP = false
        )
        module()
    }
}
```

2. **TestSupport.kt**:
```kotlin
fun Application.configureTestDependencies(
    timeProvider: TimeProvider = FixedTimeProvider(Clock.System.now()),
    databaseProvider: DatabaseProvider = TestDatabaseProvider()
) {
    install(DI)

    configureDependencies(
        databaseProvider = databaseProvider,
        timeProvider = timeProvider,
        includeMCP = false
    )
}
```

### Phase 4: Repository Updates (Optional)
**Current State:** Repositories already accept database via constructor injection
**No Changes Required:** Existing pattern is compatible

### Phase 5: Enable Parallel Test Execution
**File:** `build.gradle.kts`

```kotlin
// Update all test configurations:
tasks.test {
    maxParallelForks = Runtime.getRuntime().availableProcessors()  // Full parallelization
}

tasks.register<Test>("integrationTest") {
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
}

tasks.register<Test>("systemTest") {
    maxParallelForks = 2  // Conservative for system tests
}
```

### Phase 6: Remove DatabaseFactory
**Final Cleanup:**
1. Delete `DatabaseFactory` object from `DatabaseConfig.kt`
2. Remove all TODO comments about SPI-627
3. Update documentation

## Test Isolation Strategy

### Per-Test Database Instances
Each test gets its own `TestDatabaseProvider` instance:
- Unique in-memory H2 database per test
- No shared state between tests
- Automatic cleanup via GC
- No explicit close() needed

### Parallel Execution Benefits
- Unit tests: Full CPU parallelization
- Integration tests: 50% CPU parallelization
- System tests: Conservative 2-thread parallelization
- Expected speedup: 3-5x faster test execution

### Resource Management
- HikariCP pools are test-scoped
- Connections auto-close when provider is GC'd
- No manual cleanup required
- No risk of affecting other tests

## Risk Mitigation

### Backward Compatibility
- Keep `Database` registration in DI for existing code
- Repositories continue to work unchanged
- Gradual migration possible

### Testing Strategy
1. Add new infrastructure alongside existing
2. Write tests for new providers
3. Migrate one test suite as proof of concept
4. Gradually migrate remaining tests
5. Remove old infrastructure

### Rollback Plan
- Phase 1 is additive only (no risk)
- Each phase can be reverted independently
- Git branches for each phase
- CI validation at each step

## Success Metrics

### Performance Improvements
- **Current:** Tests run sequentially (maxParallelForks = 1)
- **Target:** Full parallel execution (maxParallelForks = CPU count)
- **Expected Speedup:** 3-5x faster CI builds

### Code Quality
- Elimination of singleton anti-pattern
- Proper dependency injection throughout
- Better test isolation
- Cleaner shutdown handling

### Developer Experience
- No more "HikariDataSource has been closed" errors
- Faster local test execution
- Easier to reason about database lifecycle
- Consistent with other DI patterns in codebase

## Implementation Timeline

**Week 1:**
- Phase 1: Add new infrastructure
- Phase 2: Update Application.kt
- Validation in feature branch

**Week 2:**
- Phase 3: Update test infrastructure
- Phase 4: Verify repositories
- Integration testing

**Week 3:**
- Phase 5: Enable parallel execution
- Performance testing
- Phase 6: Remove old code

**Total Estimated Effort:** 40-60 hours

## Conclusion

This migration from `DatabaseFactory` singleton to Ktor Native DI will:
1. Enable parallel test execution (3-5x speedup)
2. Improve test isolation and reliability
3. Align with existing DI patterns
4. Simplify database lifecycle management
5. Remove technical debt and workarounds

The migration can be done incrementally with minimal risk, providing immediate benefits at each phase.