package io.spiralhouse.cycletime.mcp.tools

/**
 * Base interface for MCP tool providers.
 */
interface ToolProvider {
    val name: String
}

/**
 * Project-specific MCP tool provider.
 */
interface ProjectToolProvider : ToolProvider {
    override val name: String get() = "project"
}

/**
 * Issue-specific MCP tool provider.
 */
interface IssueToolProvider : ToolProvider {
    override val name: String get() = "issue"
}

/**
 * Session-specific MCP tool provider.
 */
interface SessionToolProvider : ToolProvider {
    override val name: String get() = "session"
}