package io.spiralhouse.cycletime.mcp.tools.providers

import io.spiralhouse.cycletime.mcp.tools.*

/**
 * Default implementation of ProjectToolProvider.
 * 
 * Provides project-related tools for MCP operations.
 * Currently returns an empty list - tools will be added in future phases.
 */
class DefaultProjectToolProvider : ProjectToolProvider {
    override fun getTools(): List<Tool> = emptyList()
    override fun getAsyncTools(): List<AsyncTool> = emptyList()
}

/**
 * Default implementation of IssueToolProvider.
 * 
 * Provides issue-related tools for MCP operations.
 * Currently returns an empty list - tools will be added in future phases.
 */
class DefaultIssueToolProvider : IssueToolProvider {
    override fun getTools(): List<Tool> = emptyList()
    override fun getAsyncTools(): List<AsyncTool> = emptyList()
}

/**
 * Default implementation of SessionToolProvider.
 * 
 * Provides session-related tools for MCP operations.
 * Currently returns an empty list - tools will be added in future phases.
 */
class DefaultSessionToolProvider : SessionToolProvider {
    override fun getTools(): List<Tool> = emptyList()
    override fun getAsyncTools(): List<AsyncTool> = emptyList()
}