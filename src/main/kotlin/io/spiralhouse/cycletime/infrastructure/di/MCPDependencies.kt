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
import io.spiralhouse.cycletime.mcp.resources.ResourceProviderRegistry
import io.spiralhouse.cycletime.mcp.resources.interfaces.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry

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
                config = MCPServerConfig() // Uses environment variables by default
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
        
        // Resource Providers
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
        
        // Tool Providers  
        provide<ProjectToolProvider> { 
            DefaultProjectToolProvider()
        }
        
        provide<IssueToolProvider> { 
            DefaultIssueToolProvider()
        }
        
        provide<SessionToolProvider> { 
            DefaultSessionToolProvider()
        }
    }
}