package io.spiralhouse.cycletime.infrastructure.di.modules

import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig
import io.spiralhouse.cycletime.infrastructure.di.test.*
import org.jetbrains.exposed.sql.Database
import kotlinx.datetime.Instant
import kotlinx.datetime.Clock
import kotlin.reflect.KClass

/**
 * Test-specific dependency injection module with mock support and isolation.
 */
class TestModule private constructor(
    private val overrides: Map<KClass<*>, () -> Any>,
    private val useProductionDefaults: Boolean,
    private val profile: String?
) {
    
    class Builder {
        internal val overrides = mutableMapOf<KClass<*>, () -> Any>()
        private var useProductionDefaults = false
        private var profile: String? = null
        
        fun useProductionDefaults(): Builder {
            useProductionDefaults = true
            return this
        }
        
        fun <T : Any> override(clazz: kotlin.reflect.KClass<T>, factory: () -> T): Builder {
            overrides[clazz] = factory
            return this
        }
        
        fun withProfile(profile: String): Builder {
            this.profile = profile
            return this
        }
        
        fun build(): TestModule {
            return TestModule(overrides.toMap(), useProductionDefaults, profile)
        }
    }
    
    fun getOverrides(): Map<KClass<*>, () -> Any> = overrides
    
    fun shouldUseProductionDefaults(): Boolean = useProductionDefaults
    
    fun getProfile(): String? = profile
    
    fun withFreshState(): TestModule {
        // Create new module with fresh state
        return TestModule(
            overrides = overrides.mapValues { (_, factory) ->
                // For stateful mocks, create new instances
                if (factory().javaClass.name.contains("FixedTimeProvider")) {
                    { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
                } else {
                    factory
                }
            },
            useProductionDefaults = useProductionDefaults,
            profile = profile
        )
    }
    
    companion object {
        fun builder(): Builder = Builder()
        
        fun forUnitTesting(): TestModule {
            return builder()
                .override(TimeProvider::class) { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
                .override(Database::class) { createInMemoryTestDatabase() }
                .build()
        }
        
        fun forIntegrationTesting(): TestModule {
            return builder()
                .override(Database::class) { createIntegrationTestDatabase() }
                .override(TimeProvider::class) { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
                .build()
        }
        
        fun forProfile(profile: String): TestModule {
            return builder()
                .withProfile(profile)
                .override(Database::class) { 
                    when (profile) {
                        "integration-test" -> createIntegrationTestDatabase()
                        else -> createInMemoryTestDatabase()
                    }
                }
                .override(TimeProvider::class) { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
                .build()
        }
    }
}

/**
 * Fixed time provider for deterministic testing.
 */
class FixedTimeProvider(private var currentTime: Instant) : TimeProvider {
    override fun now(): Instant = currentTime
    
    fun advanceBy(duration: kotlin.time.Duration) {
        currentTime = currentTime + duration
    }
    
    fun setTime(time: Instant) {
        currentTime = time
    }
}

/**
 * Create in-memory database for unit testing.
 */
fun createInMemoryTestDatabase(): Database {
    return Database.connect(
        url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )
}

/**
 * Create integration test database with specific catalog.
 */
fun createIntegrationTestDatabase(): Database {
    return Database.connect(
        url = "jdbc:h2:mem:integration_test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )
}

/**
 * Test project factory for creating test data.
 */
fun createTestProject(): io.spiralhouse.cycletime.domain.entities.Project {
    return io.spiralhouse.cycletime.domain.entities.Project.create(
        name = "Test Project",
        description = "A test project for unit testing",
        timeProvider = FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
    )
}

/**
 * Test data builder for complex test scenarios.
 */
class TestDataBuilder(private val dependencies: Any) {
    fun createProject(name: String): ProjectTestDataBuilder {
        return ProjectTestDataBuilder(name, dependencies)
    }
}

/**
 * Project-specific test data builder.
 */
class ProjectTestDataBuilder(
    private val name: String,
    private val dependencies: Any
) {
    private var issueCount = 0
    private var workflowName = "Default"
    
    fun withIssues(count: Int): ProjectTestDataBuilder {
        issueCount = count
        return this
    }
    
    fun withWorkflow(name: String): ProjectTestDataBuilder {
        workflowName = name
        return this
    }
    
    fun build(): io.spiralhouse.cycletime.domain.entities.Project {
        val project = io.spiralhouse.cycletime.domain.entities.Project.create(
            name = name,
            description = "Test project with $issueCount issues and $workflowName workflow",
            timeProvider = FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
        )
        return project
    }
}