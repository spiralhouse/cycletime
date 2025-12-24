package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.application.services.DashboardCache
import io.spiralhouse.cycletime.application.services.DashboardApplicationService
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database
import org.slf4j.LoggerFactory
import io.spiralhouse.cycletime.infrastructure.database.DatabaseProvider
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.integration.MCPServerConfig
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.tools.*
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.infrastructure.health.HealthCheckService
import io.spiralhouse.cycletime.infrastructure.alerting.AlertService

/**
 * Dependency injection configuration using Ktor's native DI.
 * Simple, explicit configuration with singleton scope for all services.
 */

/**
 * Helper for standardized error handling in dependency creation.
 */
private inline fun <T> safeCreate(serviceName: String, factory: () -> T): T {
    return try {
        factory()
    } catch (e: Exception) {
        val logger = LoggerFactory.getLogger("DependencyInjection")
        logger.error("Failed to create $serviceName", e)
        throw IllegalStateException("$serviceName initialization failed", e)
    }
}
fun Application.configureDependencies(
    database: Database,
    databaseProvider: DatabaseProvider? = null,
    timeProvider: TimeProvider? = null,
    includeMCP: Boolean = true
) {
    val logger = LoggerFactory.getLogger("DependencyInjection")
    val configStartTime = System.currentTimeMillis()
    
    dependencies {
        // Core dependencies
        provide<TimeProvider> {
            safeCreate("TimeProvider") { timeProvider ?: SystemTimeProvider() }
        }
        provide<Database> { database }
        // Provide DatabaseProvider if supplied (for clean DI pattern)
        if (databaseProvider != null) {
            provide<DatabaseProvider> { databaseProvider }
        }
        provide<ExposedUnitOfWork> {
            safeCreate("ExposedUnitOfWork") { ExposedUnitOfWork(resolve()) }
        }
        
        // Repositories
        provide<ExposedProjectRepository> { 
            safeCreate("ExposedProjectRepository") {
                ExposedProjectRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            }
        }
        
        provide<ExposedIssueRepository> { 
            safeCreate("ExposedIssueRepository") {
                ExposedIssueRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            }
        }
        
        provide<ExposedSessionRepository> { 
            safeCreate("ExposedSessionRepository") {
                ExposedSessionRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            }
        }
        
        provide<ExposedWorkflowRepository> { 
            safeCreate("ExposedWorkflowRepository") {
                ExposedWorkflowRepository(
                    timeProvider = resolve(),
                    database = resolve()
                )
            }
        }
        
        // Application Services
        provide<ProjectApplicationService> {
            safeCreate("ProjectApplicationService") {
                ProjectApplicationService(
                    projectRepository = resolve<ExposedProjectRepository>(),
                    issueRepository = resolve<ExposedIssueRepository>(),
                    unitOfWork = resolve<ExposedUnitOfWork>(),
                    timeProvider = resolve()
                )
            }
        }
        
        provide<IssueApplicationService> {
            safeCreate("IssueApplicationService") {
                IssueApplicationService(
                    issueRepository = resolve<ExposedIssueRepository>(),
                    projectRepository = resolve<ExposedProjectRepository>(),
                    unitOfWork = resolve<ExposedUnitOfWork>(),
                    timeProvider = resolve()
                )
            }
        }
        
        provide<SessionApplicationService> {
            safeCreate("SessionApplicationService") {
                SessionApplicationService(
                    sessionRepository = resolve<ExposedSessionRepository>(),
                    projectRepository = resolve<ExposedProjectRepository>(),
                    unitOfWork = resolve<ExposedUnitOfWork>(),
                    timeProvider = resolve()
                )
            }
        }
        
        provide<WorkflowApplicationService> {
            safeCreate("WorkflowApplicationService") {
                WorkflowApplicationService(
                    workflowRepository = resolve<ExposedWorkflowRepository>(),
                    unitOfWork = resolve<ExposedUnitOfWork>(),
                    timeProvider = resolve()
                )
            }
        }

        // Dashboard Services
        provide<DashboardCache> {
            safeCreate("DashboardCache") {
                DashboardCache(
                    maxSize = 100,
                    defaultTTL = kotlin.time.Duration.parse("PT5M"), // 5 minutes
                    timeProvider = resolve()
                )
            }
        }

        provide<DashboardApplicationService> {
            safeCreate("DashboardApplicationService") {
                DashboardApplicationService(
                    projectRepository = resolve<ExposedProjectRepository>(),
                    issueRepository = resolve<ExposedIssueRepository>(),
                    unitOfWork = resolve<ExposedUnitOfWork>(),
                    dashboardCache = resolve(),
                    timeProvider = resolve()
                )
            }
        }

        // Health Check and Alerting Services
        provide<HealthCheckService> {
            safeCreate("HealthCheckService") {
                HealthCheckService(
                    databaseProvider = resolve<DatabaseProvider>(),
                    projectService = resolve<ProjectApplicationService>(),
                    sessionService = resolve<SessionApplicationService>()
                )
            }
        }

        provide<AlertService> {
            safeCreate("AlertService") {
                AlertService(
                    logger = LoggerFactory.getLogger(AlertService::class.java)
                )
            }
        }

        // MCP layer
        if (includeMCP) {
            val mcpStartTime = System.currentTimeMillis()
            try {
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
    val serviceCount = 11 + if (includeMCP) 8 else 0  // Core services + MCP SDK services (SPI-707)
    logger.info("Configured $serviceCount dependency bindings in ${totalConfigTime}ms")
}

private fun DependencyRegistry.configureMCPDependencies() {
    // SDK v0.7.2 Components (SPI-700, SPI-707)
    // Legacy EventBus transport removed - SDK now provides all transport functionality
    provide<MCPServerConfig> { MCPServerConfig() }

    provide<SDKSessionManager> {
        SDKSessionManager(
            sessionService = resolve<SessionApplicationService>()
        )
    }
    provide<MCPSdkServer> {
        val version = System.getProperty("cycletime.version") ?: "unknown"

        // Tool providers (business logic unchanged)
        val toolProviders = listOf(
            resolve<DefaultProjectToolProvider>(),
            resolve<DefaultIssueToolProvider>(),
            resolve<DefaultSessionToolProvider>(),
            resolve<DefaultWorkflowToolProvider>()
        )

        // Resource providers (business logic unchanged)
        // Cast to full ResourceProvider interface (from mcp.resources package)
        val resourceProviders = listOf(
            resolve<ProjectResourceProvider>() as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            resolve<IssueResourceProvider>() as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            resolve<SessionResourceProvider>() as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            resolve<WorkflowResourceProvider>() as io.spiralhouse.cycletime.mcp.resources.ResourceProvider
        )

        MCPSdkServer(
            version = version,
            sessionManager = resolve<SDKSessionManager>(),
            toolProviders = toolProviders,
            resourceProviders = resourceProviders
        )
    }

    // Integration service (simplified facade for SDK server) (SPI-707)
    provide<MCPIntegrationService> {
        MCPIntegrationService(
            sdkServer = resolve<MCPSdkServer>(),
            config = resolve<MCPServerConfig>()
        )
    }

    // Resource Providers
    provide<ProjectResourceProvider> { 
        DefaultProjectResourceProvider(
            projectService = resolve<ProjectApplicationService>()
        )
    }
    
    provide<IssueResourceProvider> { 
        DefaultIssueResourceProvider(
            issueService = resolve<IssueApplicationService>()
        )
    }
    
    provide<SessionResourceProvider> { 
        DefaultSessionResourceProvider(
            sessionService = resolve<SessionApplicationService>()
        )
    }
    
    provide<WorkflowResourceProvider> { DefaultWorkflowResourceProvider() }
    
    // Tool Providers
    provide<DefaultProjectToolProvider> {
        DefaultProjectToolProvider(
            projectService = resolve<ProjectApplicationService>(),
            projectRepository = resolve<ProjectRepository>()
        )
    }

    provide<DefaultIssueToolProvider> {
        DefaultIssueToolProvider(
            issueService = resolve<IssueApplicationService>(),
            issueRepository = resolve<IssueRepository>()
        )
    }
    
    provide<DefaultSessionToolProvider> { 
        DefaultSessionToolProvider(
            sessionService = resolve<SessionApplicationService>()
        )
    }
    
    provide<DefaultWorkflowToolProvider> {
        DefaultWorkflowToolProvider(
            workflowService = resolve<WorkflowApplicationService>(),
            workflowRepository = resolve<WorkflowRepository>(),
            timeProvider = resolve<TimeProvider>()
        )
    }
}