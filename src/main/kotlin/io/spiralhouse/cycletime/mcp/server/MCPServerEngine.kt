package io.spiralhouse.cycletime.mcp.server

import io.spiralhouse.cycletime.mcp.providers.ResourceProvider
import io.spiralhouse.cycletime.mcp.tools.ToolProvider

/**
 * MCP server engine interface.
 */
interface MCPServerEngine {
    fun getResourceProviders(): List<ResourceProvider>
    fun getToolProviders(): List<ToolProvider>
}

/**
 * Default MCP server engine implementation.
 */
class DefaultMCPServerEngine(
    private val resourceProviders: List<ResourceProvider> = emptyList(),
    private val toolProviders: List<ToolProvider> = emptyList()
) : MCPServerEngine {
    
    override fun getResourceProviders(): List<ResourceProvider> = resourceProviders
    
    override fun getToolProviders(): List<ToolProvider> = toolProviders
}