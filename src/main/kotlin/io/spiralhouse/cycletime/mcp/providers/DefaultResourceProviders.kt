package io.spiralhouse.cycletime.mcp.providers

import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.mcp.resources.*
import io.spiralhouse.cycletime.mcp.resources.exceptions.*
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.serialization.json.*
import kotlinx.serialization.encodeToString
import java.time.Instant
import java.util.*

/**
 * Default implementation of ProjectResourceProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultProjectResourceProvider(
    private val projectService: ProjectApplicationService
) : ProjectResourceProvider {
    
    fun canHandle(uri: String): Boolean {
        return uri.startsWith("cycletime://projects") || 
               uri.startsWith("cycletime://project/") ||
               uri.matches(Regex("cycletime://project/[^/]+/state"))
    }
    
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        if (!canHandle(uri)) {
            throw InvalidResourceUriException("Unsupported URI: $uri")
        }
        
        when {
            uri == "cycletime://projects" -> {
                val projects = projectService.listProjects()
                val json = Json.encodeToString(projects)
                return Resource(
                    uri = uri,
                    name = "Projects",
                    description = "List of all projects",
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            uri.startsWith("cycletime://project/") && !uri.endsWith("/state") -> {
                val projectId = uri.removePrefix("cycletime://project/")
                val project = projectService.getProject(ProjectId(projectId))
                    ?: throw ResourceNotFoundException(uri)
                val json = Json.encodeToString(project)
                return Resource(
                    uri = uri,
                    name = project.name,
                    description = project.description,
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            uri.endsWith("/state") -> {
                val projectId = uri.removePrefix("cycletime://project/").removeSuffix("/state")
                val project = projectService.getProject(ProjectId(projectId))
                    ?: throw ResourceNotFoundException(uri)
                val stateJson = """{"status": "active", "lastModified": "${Instant.now()}"}"""
                return Resource(
                    uri = uri,
                    name = "${project.name} State",
                    description = "Current state of project ${project.name}",
                    mimeType = "application/json",
                    content = ResourceContent.Text(stateJson),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = stateJson.length.toLong()
                    )
                )
            }
            else -> throw ResourceNotFoundException(uri)
        }
    }
}

/**
 * Default implementation of IssueResourceProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultIssueResourceProvider(
    private val issueService: IssueApplicationService
) : IssueResourceProvider {
    
    fun canHandle(uri: String): Boolean {
        return uri.startsWith("cycletime://issues") || 
               uri.startsWith("cycletime://issue/") ||
               uri.matches(Regex("cycletime://issue/[^/]+/tree"))
    }
    
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        if (!canHandle(uri)) {
            throw InvalidResourceUriException("Unsupported URI: $uri")
        }
        
        when {
            uri == "cycletime://issues" -> {
                val command = ListIssuesCommand()
                val issues = issueService.listIssues(command)
                val json = Json.encodeToString(issues)
                return Resource(
                    uri = uri,
                    name = "Issues",
                    description = "List of all issues",
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            uri.startsWith("cycletime://issue/") && !uri.endsWith("/tree") -> {
                val issueId = uri.removePrefix("cycletime://issue/")
                val issue = issueService.getIssue(IssueId(issueId))
                    ?: throw ResourceNotFoundException(uri)
                val json = Json.encodeToString(issue)
                return Resource(
                    uri = uri,
                    name = issue.title,
                    description = issue.description,
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            uri.endsWith("/tree") -> {
                val issueId = uri.removePrefix("cycletime://issue/").removeSuffix("/tree")
                val tree = issueService.getIssueTree(IssueId(issueId))
                val json = Json.encodeToString(tree)
                return Resource(
                    uri = uri,
                    name = "Issue Tree",
                    description = "Hierarchical tree structure for issue",
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            else -> throw ResourceNotFoundException(uri)
        }
    }
}

/**
 * Default implementation of SessionResourceProvider.
 * GREEN PHASE: Minimal implementation to make tests pass.
 */
class DefaultSessionResourceProvider(
    private val sessionService: SessionApplicationService
) : SessionResourceProvider {
    
    fun canHandle(uri: String): Boolean {
        return uri.startsWith("cycletime://sessions") || 
               uri.startsWith("cycletime://session/")
    }
    
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        if (!canHandle(uri)) {
            throw InvalidResourceUriException("Unsupported URI: $uri")
        }
        
        when {
            uri == "cycletime://sessions" -> {
                val command = io.spiralhouse.cycletime.application.commands.ListSessionsCommand()
                val sessions = sessionService.listSessions(command)
                val json = Json.encodeToString(sessions)
                return Resource(
                    uri = uri,
                    name = "Sessions",
                    description = "List of all sessions",
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            uri.startsWith("cycletime://session/") -> {
                val sessionId = uri.removePrefix("cycletime://session/")
                val session = sessionService.getSession(SessionId(sessionId))
                    ?: throw ResourceNotFoundException(uri)
                val json = Json.encodeToString(session)
                return Resource(
                    uri = uri,
                    name = "Session ${sessionId}",
                    description = "Session details",
                    mimeType = "application/json",
                    content = ResourceContent.Text(json),
                    metadata = ResourceMetadata(
                        created = Instant.now(),
                        modified = Instant.now(),
                        size = json.length.toLong()
                    )
                )
            }
            else -> throw ResourceNotFoundException(uri)
        }
    }
}

/**
 * Default implementation of WorkflowResourceProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultWorkflowResourceProvider(
    private val workflowService: WorkflowApplicationService? = null
) : WorkflowResourceProvider