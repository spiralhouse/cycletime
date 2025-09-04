package io.spiralhouse.cycletime.mcp.tools

/**
 * Base interface for MCP tool providers.
 * 
 * Tool providers are responsible for creating and managing a set of related tools
 * within a specific namespace.
 */
interface ToolProvider {
    /**
     * The namespace for this provider's tools.
     * All tools from this provider will be prefixed with this namespace.
     */
    val namespace: String
    
    /**
     * Get all synchronous tools provided by this provider.
     */
    fun getTools(): List<Tool> = emptyList()
    
    /**
     * Get all asynchronous tools provided by this provider.
     */
    fun getAsyncTools(): List<AsyncTool> = emptyList()
}

/**
 * Project-specific MCP tool provider.
 */
interface ProjectToolProvider : ToolProvider {
    override val namespace: String get() = "project"
}

/**
 * Issue-specific MCP tool provider.
 */
interface IssueToolProvider : ToolProvider {
    override val namespace: String get() = "issue"
}

/**
 * Session-specific MCP tool provider.
 */
interface SessionToolProvider : ToolProvider {
    override val namespace: String get() = "session"
}