package io.spiralhouse.cycletime.mcp.providers

import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.ResourceFilter
import io.spiralhouse.cycletime.mcp.resources.ResourcePagination
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString

/**
 * Default implementation of ProjectResourceProvider.
 * Provides access to project data through MCP Resource protocol.
 */
class DefaultProjectResourceProvider(
    private val projectService: ProjectApplicationService
) : ProjectResourceProvider, ResourceProvider {
    
    override val name: String = "projects"
    override val isRunning: Boolean = true
    
    override suspend fun start() {
        // Provider is always ready
    }
    
    override suspend fun stop() {
        // No cleanup needed
    }
    
    override suspend fun listResources(
        filter: ResourceFilter?,
        pagination: ResourcePagination?
    ): List<Resource> {
        // Return descriptor resource for projects
        return listOf(
            Resource(
                uri = "cycletime://projects",
                name = "CycleTime Projects",
                description = "List of all projects in the CycleTime system",
                mimeType = "application/json"
            )
        )
    }
    
    override suspend fun getResource(uri: String): Resource? {
        return when (uri) {
            "cycletime://projects" -> Resource(
                uri = "cycletime://projects",
                name = "CycleTime Projects",
                description = "List of all projects in the CycleTime system",
                mimeType = "application/json"
            )
            else -> null
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://projects" -> {
                val projects = projectService.listProjects()
                Json.encodeToString(projects)
            }
            else -> throw IllegalArgumentException("Resource not found: $uri")
        }
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        return listResources()
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        throw UnsupportedOperationException("Project resources are read-only")
    }
}

/**
 * Default implementation of IssueResourceProvider.
 */
class DefaultIssueResourceProvider(
    private val issueService: IssueApplicationService
) : IssueResourceProvider, ResourceProvider {
    
    override val name: String = "issues"
    override val isRunning: Boolean = true
    
    override suspend fun start() {
        // Provider is always ready
    }
    
    override suspend fun stop() {
        // No cleanup needed
    }
    
    override suspend fun listResources(
        filter: ResourceFilter?,
        pagination: ResourcePagination?
    ): List<Resource> {
        return listOf(
            Resource(
                uri = "cycletime://issues",
                name = "CycleTime Issues",
                description = "List of all issues in the CycleTime system",
                mimeType = "application/json"
            )
        )
    }
    
    override suspend fun getResource(uri: String): Resource? {
        return when (uri) {
            "cycletime://issues" -> Resource(
                uri = "cycletime://issues",
                name = "CycleTime Issues",
                description = "List of all issues in the CycleTime system",
                mimeType = "application/json"
            )
            else -> null
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://issues" -> {
                val issues = issueService.listIssues()
                Json.encodeToString(issues)
            }
            else -> throw IllegalArgumentException("Resource not found: $uri")
        }
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        return listResources()
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        throw UnsupportedOperationException("Issue resources are read-only")
    }
}

/**
 * Default implementation of SessionResourceProvider.
 */
class DefaultSessionResourceProvider(
    private val sessionService: SessionApplicationService
) : SessionResourceProvider, ResourceProvider {
    
    override val name: String = "sessions"
    override val isRunning: Boolean = true
    
    override suspend fun start() {
        // Provider is always ready
    }
    
    override suspend fun stop() {
        // No cleanup needed
    }
    
    override suspend fun listResources(
        filter: ResourceFilter?,
        pagination: ResourcePagination?
    ): List<Resource> {
        return listOf(
            Resource(
                uri = "cycletime://sessions",
                name = "CycleTime Sessions",
                description = "List of all sessions in the CycleTime system",
                mimeType = "application/json"
            )
        )
    }
    
    override suspend fun getResource(uri: String): Resource? {
        return when (uri) {
            "cycletime://sessions" -> Resource(
                uri = "cycletime://sessions",
                name = "CycleTime Sessions",
                description = "List of all sessions in the CycleTime system",
                mimeType = "application/json"
            )
            else -> null
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://sessions" -> {
                val sessions = sessionService.listActiveSessions()
                Json.encodeToString(sessions)
            }
            else -> throw IllegalArgumentException("Resource not found: $uri")
        }
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        return listResources()
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        throw UnsupportedOperationException("Session resources are read-only")
    }
}

/**
 * Default implementation of WorkflowResourceProvider.
 */
class DefaultWorkflowResourceProvider : WorkflowResourceProvider