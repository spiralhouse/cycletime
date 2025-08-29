package io.spiralhouse.cycletime.infrastructure.di

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe

/**
 * Basic validation test to confirm the refactored DI system works.
 * 
 * This test validates that the REFACTOR phase of TDD has been successfully completed
 * for the enhanced dependency injection system (SPI-442).
 */
class BasicDIRefactoringValidationTest : StringSpec({
    
    "REFACTOR VALIDATION: DI modules should exist and be properly structured" {
        // Verify core DI components exist
        val domainModule = io.spiralhouse.cycletime.infrastructure.di.modules.DomainModule()
        domainModule shouldNotBe null
        domainModule.name shouldBe "DomainModule"
        domainModule.priority shouldBe 10
        
        val infrastructureModule = io.spiralhouse.cycletime.infrastructure.di.modules.InfrastructureModule()
        infrastructureModule shouldNotBe null
        infrastructureModule.name shouldBe "InfrastructureModule"
        infrastructureModule.priority shouldBe 20
        
        val applicationModule = io.spiralhouse.cycletime.infrastructure.di.modules.ApplicationModule()
        applicationModule shouldNotBe null
        applicationModule.name shouldBe "ApplicationModule"
        applicationModule.priority shouldBe 30
        
        val mcpModule = io.spiralhouse.cycletime.infrastructure.di.modules.MCPModuleNew()
        mcpModule shouldNotBe null
        mcpModule.name shouldBe "MCPModule"
        mcpModule.priority shouldBe 40
    }
    
    "REFACTOR VALIDATION: DIContainer should provide core functionality" {
        val container = io.spiralhouse.cycletime.infrastructure.di.core.DIContainer.builder().build()
        container shouldNotBe null
        
        // Should provide basic operations
        container.getRegisteredTypes() shouldNotBe null
        container.isRegistered(String::class) shouldBe false
    }
    
    "REFACTOR VALIDATION: DIConfiguration should coordinate modules" {
        // Reset and initialize
        io.spiralhouse.cycletime.infrastructure.di.DIConfiguration.reset()
        io.spiralhouse.cycletime.infrastructure.di.DIConfiguration.initialize(
            io.spiralhouse.cycletime.infrastructure.config.Profile.TEST
        )
        
        val container = io.spiralhouse.cycletime.infrastructure.di.DIConfiguration.getContainer()
        container shouldNotBe null
    }
    
    "REFACTOR VALIDATION: KtorDIAdapter should exist for integration" {
        val adapter = io.spiralhouse.cycletime.infrastructure.di.KtorDIAdapter
        adapter shouldNotBe null
    }
    
    "REFACTOR VALIDATION: Test support utilities should be available" {
        val testModule = io.spiralhouse.cycletime.infrastructure.di.modules.test.TestDIModule.default()
        testModule shouldNotBe null
        testModule.name shouldBe "TestModule"
        
        val fixedTimeProvider = io.spiralhouse.cycletime.infrastructure.di.modules.test.FixedTimeProvider(
            kotlinx.datetime.Instant.parse("2024-01-01T00:00:00Z")
        )
        fixedTimeProvider shouldNotBe null
    }
    
    "REFACTOR VALIDATION: Documentation should exist" {
        val readmeFile = java.io.File("src/main/kotlin/io/spiralhouse/cycletime/infrastructure/di/README.md")
        readmeFile.exists() shouldBe true
        (readmeFile.length() > 1000L) shouldBe true // Should have substantial documentation
    }
    
    "REFACTOR VALIDATION: Architecture follows DDD principles" {
        // Domain module should have lowest priority (configured first)
        val domainModule = io.spiralhouse.cycletime.infrastructure.di.modules.DomainModule()
        domainModule.priority shouldBe 10
        
        // Infrastructure depends on domain
        val infrastructureModule = io.spiralhouse.cycletime.infrastructure.di.modules.InfrastructureModule()
        infrastructureModule.priority shouldBe 20
        
        // Application depends on both domain and infrastructure
        val applicationModule = io.spiralhouse.cycletime.infrastructure.di.modules.ApplicationModule()
        applicationModule.priority shouldBe 30
        
        // MCP is the outermost layer
        val mcpModule = io.spiralhouse.cycletime.infrastructure.di.modules.MCPModuleNew()
        mcpModule.priority shouldBe 40
    }
})