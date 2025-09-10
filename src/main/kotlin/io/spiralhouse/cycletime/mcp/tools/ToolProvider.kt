package io.spiralhouse.cycletime.mcp.tools

/**
 * Simple interface for tool providers.
 * This is a minimal interface to support tool registration without over-abstraction.
 */
interface ToolProvider {
    val namespace: String
    fun getTools(): List<Tool> = emptyList()
    fun getAsyncTools(): List<Tool> = emptyList()
}