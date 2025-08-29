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
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database

/**
 * Profile enum for environment-specific configuration.
 */
enum class DIProfile {
    DEV,
    TEST,
    PROD;
    
    companion object {
        fun fromString(value: String): DIProfile = when (value.lowercase()) {
            "dev", "development" -> DEV
            "test", "testing" -> TEST
            "prod", "production" -> PROD
            else -> DEV
        }
    }
}

/**
 * Simplified dependency injection configuration using Ktor's native DI.
 * 
 * This replaces the overly complex custom DI container with a straightforward
 * approach using Ktor's built-in dependency injection features.
 */
object SimplifiedDI {
    
    /**
     * Configure dependencies for the application using Ktor's native DI.
     * 
     * @param profile The environment profile (dev/test/prod)
     * @param customTimeProvider Optional custom time provider for testing
     */
    fun Application.configureDependencies(
        profile: DIProfile = DIProfile.DEV,
        customTimeProvider: TimeProvider? = null
    ) {
        dependencies {
            // Domain layer dependencies
            configureDomainDependencies(customTimeProvider)
            
            // Infrastructure layer dependencies
            configureInfrastructureDependencies(profile)
            
            // Application layer dependencies
            configureApplicationDependencies()
            
            // MCP layer dependencies
            with(SimplifiedMCPConfig) {
                configureMCPDependencies(profile)
            }
        }
    }
    
    /**
     * Configure domain layer dependencies.
     */
    private fun DependencyRegistry.configureDomainDependencies(
        customTimeProvider: TimeProvider? = null
    ) {
        // Time provider - allow override for testing
        provide<TimeProvider> { 
            customTimeProvider ?: SystemTimeProvider()
        }
    }
    
    /**
     * Configure infrastructure layer dependencies.
     */
    private fun DependencyRegistry.configureInfrastructureDependencies(
        profile: DIProfile
    ) {
        // Database - different configuration per profile
        provide<Database> {
            when (profile) {
                DIProfile.TEST -> {
                    // In-memory database for tests
                    Database.connect(
                        url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                        driver = "org.h2.Driver"
                    )
                }
                DIProfile.DEV, DIProfile.PROD -> {
                    // Use configured database
                    DatabaseFactory.getInstance()
                }
            }
        }
        
        // Unit of Work
        provide<UnitOfWork> { 
            ExposedUnitOfWork(resolve())
        }
        
        // Repositories
        provide<ProjectRepository> { 
            ExposedProjectRepository(resolve(), resolve())
        }
        
        provide<IssueRepository> { 
            ExposedIssueRepository(resolve(), resolve())
        }
        
        provide<SessionRepository> { 
            ExposedSessionRepository(resolve(), resolve())
        }
    }
    
    /**
     * Configure application layer dependencies.
     */
    private fun DependencyRegistry.configureApplicationDependencies() {
        // Application Services
        provide<ProjectApplicationService> {
            ProjectApplicationService(
                projectRepository = resolve(),
                issueRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }
        
        provide<IssueApplicationService> {
            IssueApplicationService(
                issueRepository = resolve(),
                projectRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }
        
        provide<SessionApplicationService> {
            SessionApplicationService(
                sessionRepository = resolve(),
                projectRepository = resolve(),
                unitOfWork = resolve(),
                timeProvider = resolve()
            )
        }
    }
}

/**
 * Extension function for simplified dependency configuration.
 * This provides the main entry point for configuring dependencies.
 */
fun Application.configureSimplifiedDependencies(
    profile: String? = null,
    customTimeProvider: TimeProvider? = null
) {
    val diProfile = profile?.let { DIProfile.fromString(it) }
        ?: environment.config.propertyOrNull("application.profile")?.getString()?.let { DIProfile.fromString(it) }
        ?: DIProfile.DEV
    
    with(SimplifiedDI) {
        configureDependencies(diProfile, customTimeProvider)
    }
}

/**
 * Backward compatibility function that delegates to the simplified implementation.
 * This maintains the existing API while using the new simplified approach.
 */
fun Application.configureEnhancedDependencies(
    config: io.spiralhouse.cycletime.infrastructure.config.ApplicationConfig? = null,
    customModules: List<Any> = emptyList()
) {
    val profile = config?.profile ?: "dev"
    configureSimplifiedDependencies(profile)
}