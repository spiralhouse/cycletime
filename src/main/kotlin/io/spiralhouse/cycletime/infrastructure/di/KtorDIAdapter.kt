package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig
import io.spiralhouse.cycletime.infrastructure.config.Profile
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.di.core.DIModule
import org.jetbrains.exposed.sql.Database

/**
 * Adapter to integrate the enhanced DI container with Ktor's native DI plugin.
 * 
 * This adapter provides seamless integration between our custom DI container
 * and Ktor's dependency injection system, allowing for gradual migration
 * and backward compatibility.
 */
object KtorDIAdapter {
    
    /**
     * Configure Ktor's DI plugin to use the enhanced DI container.
     */
    fun Application.configureKtorDI(
        container: DIContainer
    ) {
        dependencies {
            // Register all common dependencies with Ktor's DI
            // This allows both systems to work together
            
            // Domain Services
            provide<TimeProvider> { container.resolve() }
            
            // Infrastructure
            provide<Database> { container.resolve() }
            provide<UnitOfWork> { container.resolve() }
            
            // Repositories
            provide<ProjectRepository> { container.resolve() }
            provide<IssueRepository> { container.resolve() }
            provide<SessionRepository> { container.resolve() }
            
            // Application Services
            provide<ProjectApplicationService> { container.resolve() }
            provide<IssueApplicationService> { container.resolve() }
            provide<SessionApplicationService> { container.resolve() }
            
            // Register the container itself for advanced usage
            provide<DIContainer> { container }
        }
    }
    
    /**
     * Configure enhanced dependencies with proper Ktor integration.
     */
    fun Application.setupEnhancedDI(
        config: ApplicationConfig? = null,
        modules: List<DIModule> = emptyList()
    ) {
        val profile = config?.let { Profile.fromString(it.profile) } 
            ?: Profile.fromString(
                environment.config.propertyOrNull("application.profile")?.getString() ?: "dev"
            )
        
        // Initialize the DI configuration
        if (modules.isNotEmpty()) {
            DIConfiguration.initialize(profile, modules)
        } else {
            DIConfiguration.initialize(profile)
        }
        
        // Get the container and configure Ktor
        val container = DIConfiguration.getContainer()
        configureKtorDI(container)
    }
}

/**
 * Extension function for simplified enhanced DI configuration.
 */
fun Application.configureEnhancedDI(
    config: ApplicationConfig? = null,
    modules: List<DIModule> = emptyList()
) {
    with(KtorDIAdapter) {
        setupEnhancedDI(config, modules)
    }
}