package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.infrastructure.di.MCPDependencies.configureMCPDependencies
import org.jetbrains.exposed.sql.Database
import org.slf4j.LoggerFactory

/**
 * Dependency injection configuration using Ktor's native DI.
 * 
 * This is a simple, explicit configuration that:
 * - Takes a database as a parameter (no hidden initialization)
 * - Allows optional TimeProvider override for testing
 * - Has ONE way to configure (no profiles, no variations)
 * - Follows the principle: boring is better than clever
 * 
 * ## Thread-Safety and Scoping Strategy
 * 
 * All repositories and services are registered as **SINGLETONS** because:
 * - They are stateless (only immutable dependencies)
 * - Thread-safety is guaranteed at the transaction level
 * - Connection pooling is handled by HikariCP
 * - This minimizes memory overhead and object creation
 * 
 * ### Why Singleton Scope is Correct Here
 * 
 * 1. **Repositories**: Thread-safe via transaction isolation
 *    - Each operation gets its own transaction context
 *    - No mutable state between operations
 *    - Database connections are pooled, not held
 * 
 * 2. **Application Services**: Stateless orchestrators
 *    - Only coordinate between repositories
 *    - Business logic operates on entities, not service state
 *    - Transaction boundaries managed via UnitOfWork
 * 
 * 3. **Infrastructure**: Designed for sharing
 *    - Database instance is thread-safe (HikariCP)
 *    - TimeProvider is immutable
 *    - UnitOfWork creates new transaction contexts
 * 
 * ### Performance Benefits
 * 
 * - No object creation overhead per request
 * - Better CPU cache utilization
 * - Reduced GC pressure
 * - Predictable memory footprint
 */
fun Application.configureDependencies(
    database: Database,
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    val logger = LoggerFactory.getLogger("DependencyInjection")
    val configStartTime = System.currentTimeMillis()
    
    dependencies {
        // Domain layer - Time provider with optional override for testing
        provide<TimeProvider> { 
            try {
                timeProvider ?: SystemTimeProvider()
            } catch (e: Exception) {
                logger.error("Failed to create TimeProvider", e)
                throw IllegalStateException("TimeProvider initialization failed", e)
            }
        }
        
        // Infrastructure layer - Database passed in explicitly
        provide<Database> { database }
        
        // Unit of Work
        provide<UnitOfWork> { 
            try {
                ExposedUnitOfWork(resolve())
            } catch (e: Exception) {
                logger.error("Failed to create UnitOfWork", e)
                throw IllegalStateException("UnitOfWork initialization failed", e)
            }
        }
        
        // Repositories - Constructor injection with resolved dependencies
        provide<ProjectRepository> { 
            try {
                ExposedProjectRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create ProjectRepository", e)
                throw IllegalStateException("ProjectRepository initialization failed", e)
            }
        }
        
        provide<IssueRepository> { 
            try {
                ExposedIssueRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create IssueRepository", e)
                throw IllegalStateException("IssueRepository initialization failed", e)
            }
        }
        
        provide<SessionRepository> { 
            try {
                ExposedSessionRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create SessionRepository", e)
                throw IllegalStateException("SessionRepository initialization failed", e)
            }
        }
        
        provide<WorkflowRepository> { 
            try {
                ExposedWorkflowRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create WorkflowRepository", e)
                throw IllegalStateException("WorkflowRepository initialization failed", e)
            }
        }
        
        // Application Services - Constructor injection with resolved dependencies
        provide<ProjectApplicationService> {
            try {
                ProjectApplicationService(
                    projectRepository = resolve(),
                    issueRepository = resolve(),
                    unitOfWork = resolve(),
                    timeProvider = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create ProjectApplicationService", e)
                throw IllegalStateException("ProjectApplicationService initialization failed", e)
            }
        }
        
        provide<IssueApplicationService> {
            try {
                IssueApplicationService(
                    issueRepository = resolve(),
                    projectRepository = resolve(),
                    unitOfWork = resolve(),
                    timeProvider = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create IssueApplicationService", e)
                throw IllegalStateException("IssueApplicationService initialization failed", e)
            }
        }
        
        provide<SessionApplicationService> {
            try {
                SessionApplicationService(
                    sessionRepository = resolve(),
                    projectRepository = resolve(),
                    unitOfWork = resolve(),
                    timeProvider = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create SessionApplicationService", e)
                throw IllegalStateException("SessionApplicationService initialization failed", e)
            }
        }
        
        provide<WorkflowApplicationService> {
            try {
                WorkflowApplicationService(
                    workflowRepository = resolve(),
                    unitOfWork = resolve(),
                    timeProvider = resolve()
                )
            } catch (e: Exception) {
                logger.error("Failed to create WorkflowApplicationService", e)
                throw IllegalStateException("WorkflowApplicationService initialization failed", e)
            }
        }
        
        // MCP layer - Optional for testing
        if (includeMCP) {
            val mcpStartTime = System.currentTimeMillis()
            try {
                // We're already in a DependencyRegistry context, just call the extension function
                configureMCPDependencies()
                val mcpEndTime = System.currentTimeMillis()
                logger.debug("MCP dependencies configured in ${mcpEndTime - mcpStartTime}ms")
            } catch (e: Exception) {
                logger.error("Failed to configure MCP dependencies", e)
                throw IllegalStateException("MCP dependencies initialization failed", e)
            }
        }
    }
    
    val configEndTime = System.currentTimeMillis()
    val totalConfigTime = configEndTime - configStartTime
    logger.debug("Total dependency configuration completed in ${totalConfigTime}ms")
    
    // Log dependency resolution count (approximation based on configured services)
    val serviceCount = 11 + if (includeMCP) 8 else 0  // Core services + MCP services (added Workflow repo & service)
    logger.info("Configured $serviceCount dependency bindings in ${totalConfigTime}ms")
}