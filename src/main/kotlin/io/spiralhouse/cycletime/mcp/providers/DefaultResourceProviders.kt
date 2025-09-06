package io.spiralhouse.cycletime.mcp.providers

import io.spiralhouse.cycletime.application.services.*
import io.spiralhouse.cycletime.mcp.resources.*

/**
 * Default implementation of ProjectResourceProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultProjectResourceProvider(
    private val projectService: ProjectApplicationService? = null
) : ProjectResourceProvider {
    // RED PHASE: Missing methods that tests expect
    fun canHandle(uri: String): Boolean = false
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        throw NotImplementedError("RED PHASE: Not implemented yet")
    }
}

/**
 * Default implementation of IssueResourceProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultIssueResourceProvider(
    private val issueService: IssueApplicationService? = null
) : IssueResourceProvider {
    // RED PHASE: Missing methods that tests expect
    fun canHandle(uri: String): Boolean = false
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        throw NotImplementedError("RED PHASE: Not implemented yet")
    }
}

/**
 * Default implementation of SessionResourceProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultSessionResourceProvider(
    private val sessionService: SessionApplicationService? = null
) : SessionResourceProvider {
    // RED PHASE: Missing methods that tests expect
    fun canHandle(uri: String): Boolean = false
    suspend fun getResource(uri: String, pagination: ResourcePagination? = null, filter: ResourceFilter? = null): Resource {
        throw NotImplementedError("RED PHASE: Not implemented yet")
    }
}

/**
 * Default implementation of WorkflowResourceProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultWorkflowResourceProvider(
    private val workflowService: WorkflowApplicationService? = null
) : WorkflowResourceProvider