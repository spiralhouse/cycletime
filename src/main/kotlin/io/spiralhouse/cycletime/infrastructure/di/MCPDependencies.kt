package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.mcp.handlers.DefaultWebSocketHandler
import io.spiralhouse.cycletime.mcp.handlers.WebSocketHandler
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.mcp.integration.MCPServerConfig
import io.spiralhouse.cycletime.mcp.protocol.JsonRpcProtocolHandler
import io.spiralhouse.cycletime.mcp.protocol.ProtocolHandler
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.server.DefaultMCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPServerEngine
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandler
import io.spiralhouse.cycletime.mcp.server.handlers.McpMethodHandlers
import io.spiralhouse.cycletime.mcp.tools.*
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService

/**
 * MCP dependencies configuration for Ktor's native DI.
 * 
 * Simple, straightforward configuration with no profiles or variations.
 * If you need different behavior, pass different implementations.
 */
object MCPDependencies {
    
    /**
     * Configure MCP dependencies in the Ktor DI container.
     */
    fun DependencyRegistry.configureMCPDependencies() {
        // MCP Server Configuration
        provide<MCPServerConfig> {
            MCPServerConfig() // Uses environment variables by default
        }
        
        // Protocol Handler
        provide<ProtocolHandler> {
            JsonRpcProtocolHandler()
        }
        
        // Resource Registry
        provide<ResourceRegistry> {
            ResourceRegistry()
        }
        
        // Tool Registry - single instance used for both registry and invocation
        provide<ToolRegistry> {
            ToolRegistry()
        }
        
        // MCP Method Handler
        provide<McpMethodHandler> {
            McpMethodHandlers(
                resourceRegistry = resolve(),
                toolRegistry = resolve<ToolRegistry>(),
                toolInvoker = resolve<ToolRegistry>()
            )
        }
        
        // MCP Integration Service - The main entry point for MCP server
        provide<MCPIntegrationService> {
            MCPIntegrationService(
                methodHandler = resolve<McpMethodHandler>(),
                protocolHandler = resolve<ProtocolHandler>(),
                config = resolve<MCPServerConfig>(), // Resolve from DI
                resourceRegistry = resolve<ResourceRegistry>(),
                toolRegistry = resolve<ToolRegistry>(),
                projectResourceProvider = resolve<ProjectResourceProvider>(),
                issueResourceProvider = resolve<IssueResourceProvider>(),
                sessionResourceProvider = resolve<SessionResourceProvider>(),
                workflowResourceProvider = resolve<WorkflowResourceProvider>(),
                toolProviders = listOf(
                    resolve<DefaultProjectToolProvider>(),
                    resolve<DefaultIssueToolProvider>(),
                    resolve<DefaultSessionToolProvider>()
                )
            )
        }
        
        // MCP Server Engine
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
                    resolve<DefaultSessionToolProvider>()
                )
            )
        }
        
        // WebSocket Handler
        provide<WebSocketHandler> { 
            DefaultWebSocketHandler(resolve())
        }
        
        // Resource Providers - connected to application services
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
        
        provide<WorkflowResourceProvider> { 
            DefaultWorkflowResourceProvider()
        }
        
        // Tool Providers - connected to application services
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
    }
}