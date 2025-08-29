package io.spiralhouse.cycletime.infrastructure.di

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.kotest.matchers.types.shouldBeSameInstanceAs
import io.kotest.matchers.types.shouldNotBeSameInstanceAs
import io.ktor.server.application.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.di.core.DIModule
import io.spiralhouse.cycletime.infrastructure.di.exceptions.CircularDependencyException
import io.spiralhouse.cycletime.infrastructure.di.exceptions.DependencyNotFoundException
import io.spiralhouse.cycletime.infrastructure.di.modules.test.FixedTimeProvider
import io.spiralhouse.cycletime.infrastructure.di.modules.test.testContainer
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import kotlinx.datetime.Instant

/**
 * Tests for the enhanced dependency injection system.
 * 
 * These tests verify the refactored DI architecture including:
 * - Module system
 * - Scoping (singleton/factory)
 * - Lazy initialization
 * - Profile-based configuration
 * - Error handling
 * - Performance
 */
class EnhancedDITest : StringSpec({
    
    "should create container with basic dependencies" {
        val container = DIContainer.builder()
            .singleton<TimeProvider> { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
            .build()
        
        val timeProvider = container.resolve<TimeProvider>()
        timeProvider shouldNotBe null
        timeProvider.shouldBeInstanceOf<FixedTimeProvider>()
    }
    
    "should respect singleton scope" {
        val container = DIContainer.builder()
            .singleton<TimeProvider> { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
            .build()
        
        val instance1 = container.resolve<TimeProvider>()
        val instance2 = container.resolve<TimeProvider>()
        
        instance1 shouldBeSameInstanceAs instance2
    }
    
    "should respect factory scope" {
        FactoryTestCounter.instances = 0
        
        val container = DIContainer.builder()
            .factory<FactoryTestCounter> { FactoryTestCounter() }
            .build()
        
        val instance1 = container.resolve<FactoryTestCounter>()
        val instance2 = container.resolve<FactoryTestCounter>()
        
        instance1 shouldNotBeSameInstanceAs instance2
        FactoryTestCounter.instances shouldBe 2
    }
    
    "should detect circular dependencies" {
        shouldThrow<CircularDependencyException> {
            DIContainer.builder()
                .singleton<CircularServiceA, CircularServiceAImpl>()
                .singleton<CircularServiceB, CircularServiceBImpl>()
                .build()
                .resolve<CircularServiceA>()
        }
    }
    
    "should throw DependencyNotFoundException for unregistered types" {
        val container = DIContainer.builder().build()
        
        shouldThrow<DependencyNotFoundException> {
            container.resolve<TimeProvider>()
        }
    }
    
    "should support decorators" {
        class LoggingTimeProvider(private val delegate: TimeProvider) : TimeProvider {
            var logCount = 0
            override fun now(): Instant {
                logCount++
                return delegate.now()
            }
        }
        
        val container = DIContainer.builder()
            .singleton<TimeProvider> { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
            .decorate<TimeProvider> { original ->
                LoggingTimeProvider(original)
            }
            .build()
        
        val timeProvider = container.resolve<TimeProvider>()
        timeProvider.shouldBeInstanceOf<LoggingTimeProvider>()
        
        timeProvider.now()
        (timeProvider as LoggingTimeProvider).logCount shouldBe 1
    }
    
    "should support module-based configuration" {
        class TestModule : DIModule {
            override val name = "TestModule"
            override val priority = 10
            
            override fun configure(builder: DIContainer.Builder, profile: Profile) {
                builder.singleton<TimeProvider> { 
                    FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
                }
            }
        }
        
        val builder = DIContainer.builder()
        TestModule().configure(builder, Profile.TEST)
        val container = builder.build()
        
        val timeProvider = container.resolve<TimeProvider>()
        timeProvider shouldNotBe null
    }
    
    "should integrate with Ktor application" {
        testApplication {
            application {
                val config = ApplicationConfig.load("test")
                configureEnhancedDI(config)
            }
            
            val container = application.diContainer
            container shouldNotBe null
            
            // Should be able to resolve basic services
            val timeProvider = container.resolve<TimeProvider>()
            timeProvider shouldNotBe null
        }
    }
    
    "should support test containers with overrides" {
        val container = testContainer {
            override<TimeProvider> { 
                FixedTimeProvider(Instant.parse("2025-01-01T00:00:00Z"))
            }
        }
        
        val timeProvider = container.resolve<TimeProvider>()
        timeProvider.shouldBeInstanceOf<FixedTimeProvider>()
        (timeProvider as FixedTimeProvider).now() shouldBe Instant.parse("2025-01-01T00:00:00Z")
    }
    
    "should validate dependencies on build" {
        // This should fail validation because Database is not registered
        shouldThrow<Exception> {
            DIContainer.builder()
                .singleton<ServiceRequiringDatabase, ServiceRequiringDatabaseImpl>()
                .build()
        }
    }
    
    "should provide performance optimizations for singletons" {
        val container = DIContainer.builder()
            .singleton<TimeProvider> { 
                Thread.sleep(10) // Simulate expensive creation
                FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
            }
            .build()
        
        // First resolution might be slower
        val start1 = System.nanoTime()
        container.resolve<TimeProvider>()
        val time1 = System.nanoTime() - start1
        
        // Subsequent resolutions should be nearly instant (cached)
        val start2 = System.nanoTime()
        repeat(1000) {
            container.resolve<TimeProvider>()
        }
        val time2 = (System.nanoTime() - start2) / 1000 // Average per resolution
        
        // Cached resolution should be much faster
        (time2 < time1 / 10) shouldBe true
    }
    
    "should support introspection" {
        val container = DIContainer.builder()
            .singleton<TimeProvider> { FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z")) }
            .build()
        
        container.isRegistered(TimeProvider::class) shouldBe true
        container.getScope(TimeProvider::class) shouldBe io.spiralhouse.cycletime.infrastructure.config.Scope.SINGLETON
        container.getRegisteredTypes().contains(TimeProvider::class) shouldBe true
    }
    
    "should clear caches when requested" {
        var creationCount = 0
        
        val container = DIContainer.builder()
            .singleton<TimeProvider> { 
                creationCount++
                FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
            }
            .build()
        
        // First resolution creates instance
        container.resolve<TimeProvider>()
        creationCount shouldBe 1
        
        // Second resolution uses cache
        container.resolve<TimeProvider>()
        creationCount shouldBe 1
        
        // Clear cache
        container.clearCaches()
        
        // Next resolution creates new instance
        container.resolve<TimeProvider>()
        creationCount shouldBe 2
    }
})

// Test helper classes

class FactoryTestCounter {
    companion object {
        var instances = 0
    }
    init {
        instances++
    }
}

interface CircularServiceA {
    val serviceB: CircularServiceB
}

interface CircularServiceB {
    val serviceA: CircularServiceA
}

class CircularServiceAImpl(override val serviceB: CircularServiceB) : CircularServiceA
class CircularServiceBImpl(override val serviceA: CircularServiceA) : CircularServiceB

interface ServiceRequiringDatabase {
    val database: org.jetbrains.exposed.sql.Database
}

class ServiceRequiringDatabaseImpl(
    override val database: org.jetbrains.exposed.sql.Database
) : ServiceRequiringDatabase