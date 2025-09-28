// Example migration code for Application.kt
// This file shows the before/after comparison for migrating from DatabaseFactory to DatabaseProvider

// ============================================================================
// BEFORE: Using DatabaseFactory singleton (current implementation)
// ============================================================================

fun Application.module() {
    val logger = LoggerFactory.getLogger("Application")
    val moduleStartTime = System.currentTimeMillis()
    val performanceMetrics = mutableMapOf<String, Long>()

    // OLD: Initialize database using DatabaseFactory singleton
    val database = configureDatabaseConnection(logger, performanceMetrics)

    // ... rest of module
}

private fun Application.configureDatabaseConnection(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): Database {
    val config = buildDatabaseConfig()
    validateDatabaseConfig(config)

    // OLD: Using DatabaseFactory singleton
    logger.info("Initializing database with URL: ${config.jdbcUrl}")
    val dbStartTime = System.currentTimeMillis()
    DatabaseFactory.init(
        jdbcUrl = config.jdbcUrl,
        driver = config.driver,
        enableLogging = config.enableLogging
    )
    val database = DatabaseFactory.getInstance()  // Get singleton instance
    val dbEndTime = System.currentTimeMillis()
    val dbTime = dbEndTime - dbStartTime
    performanceMetrics["database"] = dbTime
    logger.info("Database initialization completed in ${dbTime}ms")
    return database
}

// OLD: Shutdown using DatabaseFactory
private fun Application.configureShutdownHooks(
    mcpIntegrationService: MCPIntegrationService?,
    logger: org.slf4j.Logger
) {
    monitor.subscribe(ApplicationStopped) {
        // ... MCP shutdown ...

        if (!isTestEnvironment) {
            DatabaseFactory.close()  // OLD: Using singleton
            logger.info("Database connection closed")
        }

        logger.info("Application shutdown complete")
    }
}

// ============================================================================
// AFTER: Using DatabaseProvider with DI (new implementation)
// ============================================================================

fun Application.module() {
    val logger = LoggerFactory.getLogger("Application")
    val moduleStartTime = System.currentTimeMillis()
    val performanceMetrics = mutableMapOf<String, Long>()

    // NEW: Create database provider
    val databaseProvider = createDatabaseProvider(logger, performanceMetrics)

    // Install Ktor features
    configureKtorFeatures(logger, performanceMetrics)

    // Setup MCP integration with provider
    val mcpIntegrationService = configureMCPIntegration(databaseProvider, logger, performanceMetrics)

    // Configure API routes (requires DI to be configured first)
    val timeProvider: TimeProvider by dependencies
    ApiConfiguration.configure(this, timeProvider)

    // ... rest of module
}

// NEW: Create database provider instead of using singleton
private fun Application.createDatabaseProvider(
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): DatabaseProvider {
    val config = buildDatabaseConfig()

    logger.info("Creating database provider with URL: ${config.jdbcUrl}")
    val dbStartTime = System.currentTimeMillis()

    // NEW: Create provider instance with DI-friendly design
    val provider = DefaultDatabaseProvider(
        DatabaseConfig(
            jdbcUrl = config.jdbcUrl,
            driver = config.driver,
            maxPoolSize = config.maxPoolSize ?: 10,
            minPoolSize = config.minPoolSize ?: 2,
            enableLogging = config.enableLogging
        )
    )

    val dbEndTime = System.currentTimeMillis()
    val dbTime = dbEndTime - dbStartTime
    performanceMetrics["database"] = dbTime
    logger.info("Database provider created in ${dbTime}ms")

    return provider
}

// NEW: Updated MCP integration to use provider
private fun Application.configureMCPIntegration(
    databaseProvider: DatabaseProvider,  // NEW: Accept provider instead of database
    logger: org.slf4j.Logger,
    performanceMetrics: MutableMap<String, Long>
): MCPIntegrationService? {
    val diStartTime = System.currentTimeMillis()
    val mcpEnabled = System.getenv("MCP_ENABLED")?.toBoolean() ?: true

    try {
        // NEW: Pass provider to DI configuration
        configureDependencies(
            databaseProvider = databaseProvider,  // NEW: Provider instead of database
            timeProvider = null,
            includeMCP = mcpEnabled
        )
        val endTime = System.currentTimeMillis()
        val diTime = endTime - diStartTime
        performanceMetrics["di"] = diTime
        logger.info("Dependency injection configuration completed in ${diTime}ms")
    } catch (e: Exception) {
        logger.error("Dependency injection configuration failed: ${e.message}", e)
        throw e
    }

    // ... rest of MCP setup
}

// NEW: Updated shutdown to use DI
private fun Application.configureShutdownHooks(
    mcpIntegrationService: MCPIntegrationService?,
    logger: org.slf4j.Logger
) {
    monitor.subscribe(ApplicationStopped) {
        logger.info("Application stopping, initiating graceful shutdown...")

        // ... MCP shutdown ...

        // NEW: Get provider from DI and close it
        if (!isTestEnvironment) {
            try {
                val databaseProvider: DatabaseProvider by dependencies
                databaseProvider.close()
                logger.info("Database connections closed via provider")
            } catch (e: Exception) {
                logger.error("Failed to close database provider: ${e.message}", e)
            }
        } else {
            logger.info("Skipping database close in test environment")
        }

        logger.info("Application shutdown complete")
    }
}

// ============================================================================
// Updated Dependencies.kt
// ============================================================================

fun Application.configureDependencies(
    databaseProvider: DatabaseProvider? = null,  // NEW: Accept provider
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    val logger = LoggerFactory.getLogger("DependencyInjection")
    val configStartTime = System.currentTimeMillis()

    dependencies {
        // NEW: Register the provider
        provide<DatabaseProvider> {
            safeCreate("DatabaseProvider") {
                databaseProvider ?: throw IllegalStateException("DatabaseProvider must be provided")
            }
        }

        // NEW: Provide database from provider (backward compatibility)
        provide<Database> {
            safeCreate("Database") {
                resolve<DatabaseProvider>().getDatabase()
            }
        }

        // Core dependencies remain the same
        provide<TimeProvider> {
            safeCreate("TimeProvider") { timeProvider ?: SystemTimeProvider() }
        }

        provide<ExposedUnitOfWork> {
            safeCreate("ExposedUnitOfWork") {
                ExposedUnitOfWork(resolve())  // Uses injected database
            }
        }

        // Repositories remain the same - they already use injected database
        provide<ExposedProjectRepository> {
            safeCreate("ExposedProjectRepository") {
                ExposedProjectRepository(
                    timeProvider = resolve(),
                    database = resolve()  // Gets database from provider
                )
            }
        }

        // ... rest of dependencies unchanged
    }
}

// ============================================================================
// Test Usage Example
// ============================================================================

class MyIntegrationTest : DescribeSpec({
    // Each test gets its own provider and database
    val provider = TestDatabaseProvider()

    beforeSpec {
        // Database is already initialized with schema
    }

    describe("my feature") {
        it("should work in isolation") {
            val database = provider.getDatabase()
            transaction(database) {
                // Test operations on isolated database
            }
        }
    }

    afterSpec {
        provider.close() // Optional - will be GC'd anyway
    }
})

// For Ktor test application
fun ApplicationTestBuilder.configureTestApplication() {
    val testProvider = TestDatabaseProvider(TestDatabaseNamingStrategy.UUID)

    application {
        configureDependencies(
            databaseProvider = testProvider,  // Each test gets unique provider
            timeProvider = FixedTimeProvider(Clock.System.now()),
            includeMCP = false
        )
        module()
    }
}

// ============================================================================
// Parallel Test Execution (build.gradle.kts)
// ============================================================================

tasks.test {
    // OLD: maxParallelForks = 1  // Forced sequential due to singleton

    // NEW: Full parallelization enabled
    maxParallelForks = Runtime.getRuntime().availableProcessors()

    testLogging {
        events("passed", "skipped", "failed")
        showStandardStreams = false
    }
}