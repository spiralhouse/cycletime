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
import io.spiralhouse.cycletime.mcp.tools.providers.*
import io.spiralhouse.cycletime.mcp.tools.interfaces.ToolInvoker
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
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
        // Protocol Handler
        provide<ProtocolHandler> {
            JsonRpcProtocolHandler()
        }
        
        // Resource Registry
        provide<ResourceRegistry> {
            ResourceProviderRegistry()
        }
        
        // Tool Registry
        provide<ToolRegistry> {
            ToolRegistry()
        }
        
        // MCP Method Handler
        provide<McpMethodHandler> {
            McpMethodHandlers(
                resourceRegistry = resolve(),
                toolRegistry = resolve()
            )
        }
        
        // MCP Integration Service - The main entry point for MCP server
        provide<MCPIntegrationService> {
            MCPIntegrationService(
                methodHandler = resolve(),
                protocolHandler = resolve(),
                config = MCPServerConfig(), // Uses environment variables by default
                resourceRegistry = resolve(),
                toolRegistry = resolve(),
                resourceProviders = listOf(
                    resolve<ProjectResourceProvider>(),
                    resolve<IssueResourceProvider>(),
                    resolve<SessionResourceProvider>(),
                    resolve<WorkflowResourceProvider>()
                ),
                toolProviders = listOf(
                    resolve<ProjectToolProvider>(),
                    resolve<IssueToolProvider>(),
                    resolve<SessionToolProvider>()
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
                    resolve<ProjectToolProvider>(),
                    resolve<IssueToolProvider>(),
                    resolve<SessionToolProvider>()
                )
            )
        }
        
        // WebSocket Handler
        provide<WebSocketHandler> { 
            DefaultWebSocketHandler(resolve())
        }
        
        // Resource Providers - placeholder implementations for now
        provide<ProjectResourceProvider> { 
            DefaultProjectResourceProvider()
        }
        
        provide<IssueResourceProvider> { 
            DefaultIssueResourceProvider()
        }
        
        provide<SessionResourceProvider> { 
            DefaultSessionResourceProvider()
        }
        
        provide<WorkflowResourceProvider> { 
            DefaultWorkflowResourceProvider()
        }
        
        // Tool Providers - connected to application services
        provide<ProjectToolProvider> { 
            DefaultProjectToolProvider(
                projectService = resolve<ProjectApplicationService>()
            )
        }
        
        provide<IssueToolProvider> { 
            DefaultIssueToolProvider(
                issueService = resolve<IssueApplicationService>()
            )
        }
        
        provide<SessionToolProvider> { 
            DefaultSessionToolProvider(
                sessionService = resolve<SessionApplicationService>()
            )
        }
        
        // Tool Invoker
        provide<ToolInvoker> {
            DefaultToolInvoker(resolve<ToolRegistry>())
        }
    }
}