package io.spiralhouse.cycletime.infrastructure.di

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.mcp.handlers.DefaultWebSocketHandler
import io.spiralhouse.cycletime.mcp.handlers.WebSocketHandler
import io.spiralhouse.cycletime.mcp.providers.*
import io.spiralhouse.cycletime.mcp.server.DefaultMCPServerEngine
import io.spiralhouse.cycletime.mcp.server.MCPServerEngine
import io.spiralhouse.cycletime.mcp.tools.*

/**
 * Simplified MCP configuration for Ktor's native DI.
 * 
 * This replaces the complex MCPModule with a straightforward
 * configuration using Ktor's built-in dependency injection.
 */
object SimplifiedMCPConfig {
    
    /**
     * Configure MCP dependencies in the Ktor DI container.
     * 
     * This should be called as part of the main dependency configuration.
     */
    fun DependencyRegistry.configureMCPDependencies(profile: DIProfile = DIProfile.DEV) {
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
        
        // Profile-specific configurations
        when (profile) {
            DIProfile.DEV -> {
                // Development: Could add debug logging wrappers here
            }
            DIProfile.TEST -> {
                // Test: Minimal configuration already set
            }
            DIProfile.PROD -> {
                // Production: Could add monitoring wrappers here
            }
        }
    }
}