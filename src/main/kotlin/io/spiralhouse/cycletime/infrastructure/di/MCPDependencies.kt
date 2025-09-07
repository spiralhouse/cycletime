package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.mcp.handlers.DefaultWebSocketHandler
import io.spiralhouse.cycletime.mcp.handlers.WebSocketHandler
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.server.DefaultMCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPServerEngine
import io.spiralhouse.cycletime.mcp.tools.ToolProvider

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
                    // TODO: Add tool providers in Phase 8
                    // resolve<ProjectToolProvider>(),
                    // resolve<IssueToolProvider>(),
                    // resolve<SessionToolProvider>()
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
        // TODO: Add concrete tool provider implementations in Phase 8
    }
}