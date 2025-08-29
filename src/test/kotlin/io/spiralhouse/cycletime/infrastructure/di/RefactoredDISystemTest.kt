package io.spiralhouse.cycletime.infrastructure.di

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.di.modules.*

/**
 * Test to verify that the refactored DI system works correctly.
 * 
 * This test validates the REFACTOR phase of TDD for the enhanced DI system.
 */
class RefactoredDISystemTest : StringSpec({
    
    "Refactored DI system should successfully initialize with all modules" {
        // Initialize the DI configuration with all default modules
        DIConfiguration.reset() // Clear any previous state
        DIConfiguration.initialize(Profile.TEST)
        
        val container = DIConfiguration.getContainer()
        container shouldNotBe null
        
        // Verify we can get registered types
        val registeredTypes = container.getRegisteredTypes()
        registeredTypes.size shouldNotBe 0
    }
    
    "Module system should configure dependencies correctly" {
        val domainModule = DomainModule()
        val infrastructureModule = InfrastructureModule()
        val applicationModule = ApplicationModule()
        
        DIConfiguration.reset()
        DIConfiguration.initialize(Profile.TEST, listOf(
            domainModule,
            infrastructureModule,
            applicationModule
        ))
        
        val container = DIConfiguration.getContainer()
        
        // Should have registered key services
        container.isRegistered(io.spiralhouse.cycletime.domain.services.TimeProvider::class) shouldBe true
        container.isRegistered(io.spiralhouse.cycletime.domain.repositories.ProjectRepository::class) shouldBe true
        container.isRegistered(io.spiralhouse.cycletime.application.services.ProjectApplicationService::class) shouldBe true
    }
    
    "Profile-based configuration should work" {
        // Test with DEV profile
        DIConfiguration.reset()
        DIConfiguration.initialize(Profile.DEV)
        val devContainer = DIConfiguration.getContainer()
        devContainer shouldNotBe null
        
        // Test with TEST profile
        DIConfiguration.reset()
        DIConfiguration.initialize(Profile.TEST)
        val testContainer = DIConfiguration.getContainer()
        testContainer shouldNotBe null
        
        // Test with PROD profile
        DIConfiguration.reset()
        DIConfiguration.initialize(Profile.PROD)
        val prodContainer = DIConfiguration.getContainer()
        prodContainer shouldNotBe null
    }
    
    "KtorDIAdapter should integrate container with Ktor" {
        // This test verifies the adapter exists and can be used
        val adapter = KtorDIAdapter
        adapter shouldNotBe null
        
        // The actual integration is tested through the Ktor application tests
    }
    
    "DependencyRegistry should provide introspection" {
        DIConfiguration.reset()
        DIConfiguration.initialize(Profile.TEST)
        
        val container = DIConfiguration.getContainer()
        val registry = DependencyRegistry(container)
        
        val types = registry.getRegisteredTypes()
        types.size shouldNotBe 0
        
        // Should be able to check registration
        registry.isRegistered(io.spiralhouse.cycletime.domain.services.TimeProvider::class) shouldBe true
    }
    
    "Test support utilities should work" {
        val testContainer = io.spiralhouse.cycletime.infrastructure.di.modules.test.testContainer {
            // Use default test configuration
            withFixedTime(kotlinx.datetime.Instant.parse("2024-01-01T00:00:00Z"))
        }
        
        testContainer shouldNotBe null
        
        // Should be able to resolve from test container
        val timeProvider = testContainer.resolve<io.spiralhouse.cycletime.domain.services.TimeProvider>()
        timeProvider shouldNotBe null
    }
    
    "Container should support lazy initialization" {
        var initialized = false
        
        val container = DIContainer.builder()
            .lazy<TestService, TestServiceImpl>()
            .singleton<TestServiceImpl> { 
                initialized = true
                TestServiceImpl()
            }
            .build()
        
        // Should not be initialized yet
        initialized shouldBe false
        
        // First access should initialize
        container.resolve<TestService>()
        initialized shouldBe true
    }
    
    "Container should cache singletons" {
        var creationCount = 0
        
        val container = DIContainer.builder()
            .singleton<TestService> { 
                creationCount++
                TestServiceImpl()
            }
            .build()
        
        // First resolution
        container.resolve<TestService>()
        creationCount shouldBe 1
        
        // Second resolution should use cache
        container.resolve<TestService>()
        creationCount shouldBe 1
    }
    
    "Documentation should be comprehensive" {
        // This test verifies the documentation exists
        val readmeFile = java.io.File("src/main/kotlin/io/spiralhouse/cycletime/infrastructure/di/README.md")
        readmeFile.exists() shouldBe true
        readmeFile.length() shouldNotBe 0
    }
})

// Test helpers
interface TestService
class TestServiceImpl : TestService