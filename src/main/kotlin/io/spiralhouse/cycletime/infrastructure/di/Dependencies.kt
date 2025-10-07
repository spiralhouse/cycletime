package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
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
import io.spiralhouse.cycletime.mcp.handlers.DefaultWebSocketHandler
import io.spiralhouse.cycletime.mcp.handlers.WebSocketHandler
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.integration.MCPServerConfig
import io.spiralhouse.cycletime.mcp.integration.MCPProviderRegistry
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.server.DefaultMCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPConnectionManager
import io.spiralhouse.cycletime.mcp.server.MCPConfiguration
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.tools.*
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import io.spiralhouse.cycletime.mcp.session.MCPSessionManager
import io.spiralhouse.cycletime.mcp.correlation.EventBus
import io.spiralhouse.cycletime.mcp.correlation.MessageCorrelator

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
    val serviceCount = 11 + if (includeMCP) 8 else 0  // Core services + MCP services (added Workflow repo & service)
    logger.info("Configured $serviceCount dependency bindings in ${totalConfigTime}ms")
}

private fun DependencyRegistry.configureMCPDependencies() {
    provide<MCPServerConfig> { MCPServerConfig() }
    provide<MCPConnectionManager> {
        MCPConnectionManager(MCPConfiguration.fromEnvironment())
    }
    provide<ProtocolHandler> { JsonRpcProtocolHandler() }
    provide<ResourceRegistry> { ResourceRegistry() }
    provide<ToolRegistry> { ToolRegistry() }

    // SSE Transport Components (SPI-665)
    provide<MCPSessionManager> {
        MCPSessionManager(
            timeProvider = resolve()
        )
    }
    provide<EventBus> { EventBus() }
    provide<MessageCorrelator> {
        MessageCorrelator(
            timeProvider = resolve()
        )
    }
    provide<McpToolHandler> {
        DefaultMcpToolHandler(
            toolRegistry = resolve<ToolRegistry>()
        )
    }
    provide<MCPProviderRegistry> {
        MCPProviderRegistry(
            resourceRegistry = resolve<ResourceRegistry>(),
            toolRegistry = resolve<ToolRegistry>()
        )
    }
    
    provide<McpMethodHandler> {
        McpMethodHandler(
            protocolHandler = resolve<ProtocolHandler>() as JsonRpcProtocolHandler,
            toolHandler = resolve<McpToolHandler>(),
            resourceRegistry = resolve<ResourceRegistry>()
        )
    }
    provide<MCPIntegrationService> {
        MCPIntegrationService(
            methodHandler = resolve<McpMethodHandler>(),
            protocolHandler = resolve<ProtocolHandler>(),
            connectionManager = resolve<MCPConnectionManager>(),
            config = resolve<MCPServerConfig>(),
            resourceRegistry = resolve<ResourceRegistry>(),
            toolRegistry = resolve<ToolRegistry>(),
            projectResourceProvider = resolve<ProjectResourceProvider>(),
            issueResourceProvider = resolve<IssueResourceProvider>(),
            sessionResourceProvider = resolve<SessionResourceProvider>(),
            workflowResourceProvider = resolve<WorkflowResourceProvider>(),
            toolProviders = listOf(
                resolve<DefaultProjectToolProvider>(),
                resolve<DefaultIssueToolProvider>(),
                resolve<DefaultSessionToolProvider>(),
                resolve<DefaultWorkflowToolProvider>()
            )
        )
    }
    
    provide<MCPServerEngine> { 
        DefaultMCPServerEngine(
            resourceProviders = listOf(
                resolve<ProjectResourceProvider>(),
                resolve<IssueResourceProvider>(),
                resolve<SessionResourceProvider>(),
                resolve<WorkflowResourceProvider>()
            ),
            toolProviders = listOf(
                resolve<DefaultProjectToolProvider>(),
                resolve<DefaultIssueToolProvider>(),
                resolve<DefaultSessionToolProvider>(),
                resolve<DefaultWorkflowToolProvider>()
            )
        )
    }
    
    provide<WebSocketHandler> { DefaultWebSocketHandler(resolve()) }
    
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
            projectService = resolve<ProjectApplicationService>()
        )
    }
    
    provide<DefaultIssueToolProvider> { 
        DefaultIssueToolProvider(
            issueService = resolve<IssueApplicationService>()
        )
    }
    
    provide<DefaultSessionToolProvider> { 
        DefaultSessionToolProvider(
            sessionService = resolve<SessionApplicationService>()
        )
    }
    
    provide<DefaultWorkflowToolProvider> { 
        DefaultWorkflowToolProvider()
    }
}