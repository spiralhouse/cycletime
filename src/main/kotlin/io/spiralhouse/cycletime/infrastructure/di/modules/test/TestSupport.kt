package io.spiralhouse.cycletime.infrastructure.di.modules.test

import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.di.core.DIModule
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database
import kotlin.time.Duration

/**
 * Fixed time provider for deterministic testing.
 */
class FixedTimeProvider(private var currentTime: Instant) : TimeProvider {
    override fun now(): Instant = currentTime
    
    fun advanceBy(duration: Duration) {
        currentTime = currentTime + duration
    }
    
    fun setTime(time: Instant) {
        currentTime = time
    }
    
    fun setTime(time: String) {
        currentTime = Instant.parse(time)
    }
}

/**
 * Test-specific DI module with enhanced testing support.
 */
class TestDIModule(
    private val overrides: Map<kotlin.reflect.KClass<*>, () -> Any> = emptyMap(),
    private val useInMemoryDatabase: Boolean = true,
    private val fixedTime: Instant? = Instant.parse("2024-01-01T00:00:00Z")
) : DIModule {
    
    override val name: String = "TestModule"
    override val priority: Int = 1000 // Override everything else
    
    @Suppress("UNCHECKED_CAST")
    private fun <T : Any> addOverrideToBuilder(
        builder: DIContainer.Builder,
        type: kotlin.reflect.KClass<T>,
        factory: () -> Any
    ) {
        builder.singleton(type) { factory() as T }
    }
    
    override fun configure(builder: DIContainer.Builder, profile: Profile) {
        // Fixed time for testing
        if (fixedTime != null) {
            builder.singleton<TimeProvider> { FixedTimeProvider(fixedTime) }
        }
        
        // In-memory database for testing
        if (useInMemoryDatabase) {
            builder.singleton<Database> {
                Database.connect(
                    url = "jdbc:h2:mem:test_${System.nanoTime()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                    driver = "org.h2.Driver"
                )
            }
        }
        
        // Apply custom overrides
        overrides.forEach { (type, factory) ->
            // We need to handle the type casting carefully
            // Since we're dealing with KClass<*>, we lose type safety here
            @Suppress("UNCHECKED_CAST")
            addOverrideToBuilder(builder, type as kotlin.reflect.KClass<Any>, factory)
        }
    }
    
    companion object {
        /**
         * Create a test module with default settings.
         */
        fun default(): TestDIModule = TestDIModule()
        
        /**
         * Create a test module for unit testing.
         */
        fun forUnitTests(): TestDIModule = TestDIModule(
            useInMemoryDatabase = true,
            fixedTime = Instant.parse("2024-01-01T00:00:00Z")
        )
        
        /**
         * Create a test module for integration testing.
         */
        fun forIntegrationTests(): TestDIModule = TestDIModule(
            useInMemoryDatabase = true,
            fixedTime = null // Use real time for integration tests
        )
    }
}

/**
 * Test container builder for simplified test setup.
 */
class TestContainerBuilder {
    private val overrides = mutableMapOf<kotlin.reflect.KClass<*>, () -> Any>()
    private var useInMemoryDatabase = true
    private var fixedTime: Instant? = Instant.parse("2024-01-01T00:00:00Z")
    private val modules = mutableListOf<DIModule>()
    
    /**
     * Override a dependency with a test implementation.
     */
    fun <T : Any> override(type: kotlin.reflect.KClass<T>, factory: () -> T): TestContainerBuilder {
        overrides[type] = factory
        return this
    }
    
    /**
     * Override a dependency with a test implementation (reified version).
     */
    inline fun <reified T : Any> override(noinline factory: () -> T): TestContainerBuilder {
        return override(T::class, factory)
    }
    
    /**
     * Use a real database instead of in-memory.
     */
    fun useRealDatabase(): TestContainerBuilder {
        useInMemoryDatabase = false
        return this
    }
    
    /**
     * Use real time instead of fixed time.
     */
    fun useRealTime(): TestContainerBuilder {
        fixedTime = null
        return this
    }
    
    /**
     * Set a specific fixed time.
     */
    fun withFixedTime(time: Instant): TestContainerBuilder {
        fixedTime = time
        return this
    }
    
    /**
     * Add a custom module.
     */
    fun withModule(module: DIModule): TestContainerBuilder {
        modules.add(module)
        return this
    }
    
    /**
     * Build the test container.
     */
    fun build(): DIContainer {
        val testModule = TestDIModule(overrides, useInMemoryDatabase, fixedTime)
        
        val builder = DIContainer.builder()
        
        // Configure all modules
        val allModules = modules + testModule
        allModules.sortedBy { it.priority }.forEach { module ->
            module.configure(builder, Profile.TEST)
        }
        
        return builder.build()
    }
}

/**
 * DSL for creating test containers.
 */
fun testContainer(block: TestContainerBuilder.() -> Unit): DIContainer {
    return TestContainerBuilder().apply(block).build()
}

/**
 * Test data builders for creating test entities.
 */
object TestDataBuilders {
    
    /**
     * Create a test project with default values.
     */
    fun createTestProject(
        name: String = "Test Project",
        description: String = "Test project description",
        timeProvider: TimeProvider = FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
    ): io.spiralhouse.cycletime.domain.entities.Project {
        return io.spiralhouse.cycletime.domain.entities.Project.create(
            name = name,
            description = description,
            timeProvider = timeProvider
        )
    }
    
    /**
     * Create a test issue with default values.
     */
    fun createTestIssue(
        title: String = "Test Issue",
        description: String = "Test issue description",
        projectId: io.spiralhouse.cycletime.domain.valueobjects.ProjectId,
        timeProvider: TimeProvider = FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
    ): io.spiralhouse.cycletime.domain.entities.Issue {
        return io.spiralhouse.cycletime.domain.entities.Issue.create(
            title = title,
            description = description,
            projectId = projectId,
            type = io.spiralhouse.cycletime.domain.valueobjects.IssueType.SUBTASK,
            timeProvider = timeProvider
        )
    }
}