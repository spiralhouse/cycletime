package io.spiralhouse.cycletime.mcp.providers

/**
 * Base interface for MCP resource providers.
 */
interface ResourceProvider {
    val name: String
    val resourceType: String
}

/**
 * Project resource provider.
 */
interface ProjectResourceProvider : ResourceProvider {
    override val name: String get() = "projects"
    override val resourceType: String get() = "project"
}

/**
 * Issue resource provider.
 */
interface IssueResourceProvider : ResourceProvider {
    override val name: String get() = "issues"
    override val resourceType: String get() = "issue"
}

/**
 * Session resource provider.
 */
interface SessionResourceProvider : ResourceProvider {
    override val name: String get() = "sessions"
    override val resourceType: String get() = "session"
}

/**
 * Workflow resource provider.
 */
interface WorkflowResourceProvider : ResourceProvider {
    override val name: String get() = "workflows"
    override val resourceType: String get() = "workflow"
}