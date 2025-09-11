package io.spiralhouse.cycletime.mcp.integration

import io.spiralhouse.cycletime.mcp.providers.ProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.IssueResourceProvider  
import io.spiralhouse.cycletime.mcp.providers.SessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.WorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.resources.ResourceRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolRegistry
import io.spiralhouse.cycletime.mcp.tools.ToolProvider
import org.slf4j.LoggerFactory

/**
 * Focused component responsible for registering MCP providers.
 * Extracted from MCPIntegrationService to reduce complexity and improve maintainability.
 */
class MCPProviderRegistry(
    private val resourceRegistry: ResourceRegistry?,
    private val toolRegistry: ToolRegistry?
) {
    private val logger = LoggerFactory.getLogger(MCPProviderRegistry::class.java)
    
    /**
     * Register all resource and tool providers.
     * Returns number of successfully registered providers.
     */
    suspend fun registerProviders(
        resourceProviders: List<io.spiralhouse.cycletime.mcp.resources.ResourceProvider>,
        toolProviders: List<ToolProvider>
    ): ProviderRegistrationResult {
        val resourceCount = registerResourceProviders(resourceProviders)
        val toolCount = registerToolProviders(toolProviders)
        
        logger.info("Provider registration complete: $resourceCount resources, $toolCount tools")
        return ProviderRegistrationResult(resourceCount, toolCount)
    }
    
    private suspend fun registerResourceProviders(
        providers: List<io.spiralhouse.cycletime.mcp.resources.ResourceProvider>
    ): Int {
        if (resourceRegistry == null) {
            logger.warn("ResourceRegistry is null - skipping resource provider registration")
            return 0
        }
        
        var successCount = 0
        providers.forEach { provider ->
            try {
                resourceRegistry.register(provider)
                successCount++
                logger.debug("Registered resource provider: ${provider::class.java.simpleName}")
            } catch (e: Exception) {
                logger.error("Failed to register resource provider ${provider::class.java.simpleName}: ${e.message}", e)
            }
        }
        
        return successCount
    }
    
    private suspend fun registerToolProviders(toolProviders: List<ToolProvider>): Int {
        if (toolRegistry == null) {
            logger.warn("ToolRegistry is null - skipping tool provider registration")
            return 0
        }
        
        var successCount = 0
        toolProviders.forEach { provider ->
            try {
                // Register sync tools
                val syncTools = provider.getTools()
                syncTools.forEach { tool ->
                    if (toolRegistry.register(tool)) {
                        successCount++
                        logger.debug("Registered sync tool: ${tool.name}")
                    }
                }
                
                // Register async tools
                val asyncTools = provider.getAsyncTools()
                asyncTools.forEach { tool ->
                    if (toolRegistry.register(tool)) {
                        successCount++
                        logger.debug("Registered async tool: ${tool.name}")
                    }
                }
                
                logger.debug("Completed tool provider: ${provider::class.java.simpleName}")
            } catch (e: Exception) {
                logger.error("Failed to register tool provider ${provider::class.java.simpleName}: ${e.message}", e)
            }
        }
        
        return successCount
    }
}

/**
 * Result of provider registration operation.
 */
data class ProviderRegistrationResult(
    val resourceCount: Int,
    val toolCount: Int
) {
    val totalCount: Int get() = resourceCount + toolCount
}