package io.spiralhouse.cycletime.application.exceptions

import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

/**
 * Base exception for application-layer errors.
 */
abstract class ApplicationException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Exception thrown when a project is not found.
 */
class ProjectNotFoundException(id: ProjectId) : ApplicationException("Project with ID ${id.value} not found")

/**
 * Exception thrown when an issue is not found.
 */
class IssueNotFoundException(id: IssueId) : ApplicationException("Issue with ID ${id.value} not found")

/**
 * Exception thrown when a session is not found.
 */
class SessionNotFoundException(sessionKey: SessionKey) : ApplicationException("Session with key ${sessionKey.value} not found")

/**
 * Exception thrown when a workflow is not found.
 */
class WorkflowNotFoundException(id: WorkflowId) : ApplicationException("Workflow with ID ${id.value} not found")

/**
 * Exception thrown when validation fails at the application layer.
 */
class ValidationException(message: String) : ApplicationException(message)

/**
 * Exception thrown when a business rule is violated at the application layer.
 */
class BusinessRuleViolationException(message: String) : ApplicationException(message)

/**
 * Exception thrown when issue hierarchy rules are violated.
 */
class HierarchyViolationException(message: String) : ApplicationException(message) {
    constructor(childType: IssueType, parentType: IssueType?) : this(
        "Issue of type ${childType.name} cannot have parent of type ${parentType?.name ?: "none"}"
    )

    constructor(childType: IssueType, parentType: IssueType?, customMessage: String) : this(
        "Issue of type ${childType.name} cannot have parent of type ${parentType?.name ?: "none"}: $customMessage"
    )
}

/**
 * Exception thrown when a circular dependency is detected.
 */
class CircularDependencyException(issueId: IssueId, dependencyId: IssueId) : ApplicationException(
    "Adding dependency from ${issueId.value} to ${dependencyId.value} would create a circular dependency"
)

/**
 * Exception thrown when an invalid status transition is attempted.
 */
class InvalidStatusTransitionException(
    fromStatus: IssueStatus, 
    toStatus: IssueStatus, 
    cause: Throwable? = null
) : ApplicationException(
    "Cannot transition from ${fromStatus.name} to ${toStatus.name}",
    cause
)
