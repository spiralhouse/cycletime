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
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database

/**
 * Dependency injection configuration using Ktor's native DI.
 * 
 * This is a simple, explicit configuration that:
 * - Takes a database as a parameter (no hidden initialization)
 * - Allows optional TimeProvider override for testing
 * - Has ONE way to configure (no profiles, no variations)
 * - Follows the principle: boring is better than clever
 */
fun Application.configureDependencies(
    database: Database,
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    dependencies {
        // Domain layer - Time provider with optional override for testing
        provide<TimeProvider> { 
            timeProvider ?: SystemTimeProvider()
        }
        
        // Infrastructure layer - Database passed in explicitly
        provide<Database> { database }
        
        // Unit of Work
        provide<UnitOfWork> { 
            ExposedUnitOfWork(resolve())
        }
        
        // Repositories - Constructor injection with resolved dependencies
        provide<ProjectRepository> { 
            ExposedProjectRepository(
                timeProvider = resolve(),
                database = resolve()
            )
        }
        
        provide<IssueRepository> { 
            ExposedIssueRepository(
                timeProvider = resolve(),
                database = resolve()
            )
        }
        
        provide<SessionRepository> { 
            ExposedSessionRepository(
                timeProvider = resolve(),
                database = resolve()
            )
        }
        
        // Application Services - Constructor injection with resolved dependencies
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
        
        // MCP layer - Optional for testing
        if (includeMCP) {
            with(MCPDependencies) {
                configureMCPDependencies()
            }
        }
    }
}