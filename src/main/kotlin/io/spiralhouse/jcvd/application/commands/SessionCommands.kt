package io.spiralhouse.jcvd.application.commands

import io.spiralhouse.jcvd.domain.entities.SessionContext
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey

/**
 * Command to create a new session.
 */
data class CreateSessionCommand(
    val projectId: ProjectId?
)

/**
 * Command to update a session's context.
 */
data class UpdateSessionContextCommand(
    val sessionKey: SessionKey,
    val context: SessionContext
)

/**
 * Command to add a context entry to a session.
 */
data class AddContextEntryCommand(
    val sessionKey: SessionKey,
    val key: String,
    val value: String
)

/**
 * Command to update a context entry in a session.
 */
data class UpdateContextEntryCommand(
    val sessionKey: SessionKey,
    val key: String,
    val value: String
)

/**
 * Command to remove a context entry from a session.
 */
data class RemoveContextEntryCommand(
    val sessionKey: SessionKey,
    val key: String
)

/**
 * Command to associate a session with a project.
 */
data class AssociateSessionWithProjectCommand(
    val sessionKey: SessionKey,
    val projectId: ProjectId
)

/**
 * Command to disassociate a session from a project.
 */
data class DisassociateSessionFromProjectCommand(
    val sessionKey: SessionKey
)

/**
 * Command to add an active issue to a session.
 */
data class AddActiveIssueCommand(
    val sessionKey: SessionKey,
    val issueId: String
)

/**
 * Command to remove an active issue from a session.
 */
data class RemoveActiveIssueCommand(
    val sessionKey: SessionKey,
    val issueId: String
)

/**
 * Command to set the workflow stage of a session.
 */
data class SetWorkflowStageCommand(
    val sessionKey: SessionKey,
    val stage: String?
)

/**
 * Command to clear the workflow stage of a session.
 */
data class ClearWorkflowStageCommand(
    val sessionKey: SessionKey
)

/**
 * Command to set the last action of a session.
 */
data class SetLastActionCommand(
    val sessionKey: SessionKey,
    val action: String?
)

/**
 * Command to clear the last action of a session.
 */
data class ClearLastActionCommand(
    val sessionKey: SessionKey
)