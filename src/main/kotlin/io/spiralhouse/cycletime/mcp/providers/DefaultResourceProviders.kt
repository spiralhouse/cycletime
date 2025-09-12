package io.spiralhouse.cycletime.mcp.providers

import io.spiralhouse.cycletime.mcp.resources.ResourceProvider
import io.spiralhouse.cycletime.mcp.resources.Resource
import io.spiralhouse.cycletime.mcp.resources.ResourceContent
import io.spiralhouse.cycletime.mcp.resources.ResourceFilter
import io.spiralhouse.cycletime.mcp.resources.ResourcePagination
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
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
        // Return descriptor resources for projects
        return listOf(
            Resource(
                uri = "cycletime://projects",
                name = "CycleTime Projects",
                description = "List of all projects in the CycleTime system",
                mimeType = "application/json"
            ),
            Resource(
                uri = "cycletime://projects/{id}",
                name = "CycleTime Project",
                description = "Individual project resource by ID",
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
            else -> {
                // Check for project ID pattern
                if (uri.startsWith("cycletime://projects/") && uri.length > "cycletime://projects/".length) {
                    Resource(
                        uri = uri,
                        name = "CycleTime Project",
                        description = "Individual project resource by ID",
                        mimeType = "application/json"
                    )
                } else {
                    null
                }
            }
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://projects" -> {
                val projects = projectService.listProjects()
                Json.encodeToString(projects)
            }
            else -> {
                if (uri.startsWith("cycletime://projects/")) {
                    // Extract project ID and get specific project
                    val projectIdString = uri.substringAfterLast("/")
                    try {
                        val projectId = ProjectId(projectIdString)
                        val project = projectService.getProject(projectId)
                        Json.encodeToString(project)
                    } catch (e: Exception) {
                        throw IllegalArgumentException("Project not found: $projectIdString", e)
                    }
                } else {
                    throw IllegalArgumentException("Resource not found: $uri")
                }
            }
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
            ),
            Resource(
                uri = "cycletime://issues/{id}",
                name = "CycleTime Issue",
                description = "Individual issue resource by ID",
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
            else -> {
                // Check for issue ID pattern
                if (uri.startsWith("cycletime://issues/") && uri.length > "cycletime://issues/".length) {
                    Resource(
                        uri = uri,
                        name = "CycleTime Issue",
                        description = "Individual issue resource by ID",
                        mimeType = "application/json"
                    )
                } else {
                    null
                }
            }
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://issues" -> {
                val issues = issueService.listIssues()
                Json.encodeToString(issues)
            }
            else -> {
                if (uri.startsWith("cycletime://issues/")) {
                    // Extract issue ID and get specific issue
                    val issueIdString = uri.substringAfterLast("/")
                    try {
                        val issueId = IssueId(issueIdString)
                        val issue = issueService.getIssue(issueId)
                        Json.encodeToString(issue)
                    } catch (e: Exception) {
                        throw IllegalArgumentException("Issue not found: $issueIdString", e)
                    }
                } else {
                    throw IllegalArgumentException("Resource not found: $uri")
                }
            }
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
            ),
            Resource(
                uri = "cycletime://sessions/{id}",
                name = "CycleTime Session",
                description = "Individual session resource by ID",
                mimeType = "application/json"
            ),
            Resource(
                uri = "cycletime://sessions/active",
                name = "Active Sessions",
                description = "List of currently active sessions",
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
            "cycletime://sessions/active" -> Resource(
                uri = "cycletime://sessions/active",
                name = "Active Sessions",
                description = "List of currently active sessions",
                mimeType = "application/json"
            )
            else -> {
                // Check for session ID pattern (but exclude "active" which is handled above)
                if (uri.startsWith("cycletime://sessions/") && uri.length > "cycletime://sessions/".length && !uri.endsWith("/active")) {
                    Resource(
                        uri = uri,
                        name = "CycleTime Session",
                        description = "Individual session resource by ID",
                        mimeType = "application/json"
                    )
                } else {
                    null
                }
            }
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://sessions" -> {
                val sessions = sessionService.listActiveSessions()
                Json.encodeToString(sessions)
            }
            "cycletime://sessions/active" -> {
                val activeSessions = sessionService.listActiveSessions()
                Json.encodeToString(activeSessions)
            }
            else -> {
                if (uri.startsWith("cycletime://sessions/") && !uri.endsWith("/active")) {
                    // Extract session ID and get specific session
                    val sessionIdString = uri.substringAfterLast("/")
                    try {
                        val sessionKey = SessionKey(sessionIdString)
                        val session = sessionService.getSession(sessionKey)
                        Json.encodeToString(session)
                    } catch (e: Exception) {
                        throw IllegalArgumentException("Session not found: $sessionIdString", e)
                    }
                } else {
                    throw IllegalArgumentException("Resource not found: $uri")
                }
            }
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
class DefaultWorkflowResourceProvider : WorkflowResourceProvider, ResourceProvider {
    
    override val name: String = "workflows"
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
                uri = "cycletime://workflows",
                name = "CycleTime Workflows",
                description = "List of all workflows in the CycleTime system",
                mimeType = "application/json"
            ),
            Resource(
                uri = "cycletime://workflows/{id}",
                name = "CycleTime Workflow",
                description = "Individual workflow resource by ID",
                mimeType = "application/json"
            ),
            Resource(
                uri = "cycletime://tasks/next",
                name = "Next Task",
                description = "Next available task from workflow queue",
                mimeType = "application/json"
            )
        )
    }
    
    override suspend fun getResource(uri: String): Resource? {
        return when (uri) {
            "cycletime://workflows" -> Resource(
                uri = "cycletime://workflows",
                name = "CycleTime Workflows",
                description = "List of all workflows in the CycleTime system",
                mimeType = "application/json"
            )
            "cycletime://tasks/next" -> Resource(
                uri = "cycletime://tasks/next",
                name = "Next Task",
                description = "Next available task from workflow queue",
                mimeType = "application/json"
            )
            else -> {
                // Check for workflow ID pattern
                if (uri.startsWith("cycletime://workflows/") && uri.length > "cycletime://workflows/".length) {
                    Resource(
                        uri = uri,
                        name = "CycleTime Workflow",
                        description = "Individual workflow resource by ID",
                        mimeType = "application/json"
                    )
                } else {
                    null
                }
            }
        }
    }
    
    override suspend fun readResource(uri: String): String {
        return when (uri) {
            "cycletime://workflows" -> {
                // Return empty workflow list for now
                Json.encodeToString(emptyList<Map<String, Any>>())
            }
            "cycletime://tasks/next" -> {
                // Return no next task available for now
                Json.encodeToString(mapOf("message" to "No tasks available"))
            }
            else -> {
                if (uri.startsWith("cycletime://workflows/")) {
                    // Extract workflow ID and return placeholder data
                    val workflowId = uri.substringAfterLast("/")
                    Json.encodeToString(mapOf(
                        "id" to workflowId,
                        "name" to "Workflow $workflowId",
                        "status" to "active"
                    ))
                } else {
                    throw IllegalArgumentException("Resource not found: $uri")
                }
            }
        }
    }
    
    override suspend fun searchResources(query: String): List<Resource> {
        return listResources()
    }
    
    override suspend fun updateResource(uri: String, content: ResourceContent) {
        throw UnsupportedOperationException("Workflow resources are read-only")
    }
}