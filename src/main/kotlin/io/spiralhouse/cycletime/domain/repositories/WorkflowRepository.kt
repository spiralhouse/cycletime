package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.datetime.Instant

/**
 * Repository interface for Workflow aggregate persistence.
 *
 * This interface defines the contract for persisting and retrieving Workflow
 * aggregates without coupling to specific infrastructure implementations.
 * Follows Domain-Driven Design patterns and enables testability through
 * dependency injection.
 *
 * ## Design Principles:
 * - **Aggregate Boundary**: Operations work with complete Workflow aggregates
 * - **Infrastructure Agnostic**: No dependencies on specific database technologies
 * - **Testability**: Easily mockable for unit testing
 * - **Consistency**: All methods are suspend functions for async compatibility
 *
 * ## Implementation Notes:
 * - Concrete implementations should handle transaction coordination
 * - All operations should be atomic at the aggregate level
 * - Repository should not contain business logic
 */
interface WorkflowRepository {
    
    /**
     * Saves a workflow aggregate to the repository.
     *
     * For new workflows, this performs an insert operation.
     * For existing workflows, this performs an update operation.
     * The implementation should handle the distinction automatically.
     *
     * @param workflow The workflow to save
     * @return The saved workflow with any generated identifiers
     */
    suspend fun save(workflow: Workflow): Workflow
    
    /**
     * Finds a workflow by its unique identifier.
     *
     * @param id The workflow's unique identifier
     * @return The workflow if found, null otherwise
     */
    suspend fun findById(id: WorkflowId): Workflow?
    
    /**
     * Retrieves all workflows.
     *
     * @param includeDeleted if true, includes soft-deleted workflows in results.
     *                       Default: false (exclude deleted)
     * @return list of workflows (empty if none found)
     */
    suspend fun findAll(includeDeleted: Boolean = false): List<Workflow>
    
    /**
     * Updates an existing workflow in the repository.
     *
     * @param workflow The workflow to update
     * @return The updated workflow
     */
    suspend fun update(workflow: Workflow): Workflow
    
    /**
     * Deletes a workflow from the repository.
     *
     * @param id The unique identifier of the workflow to delete
     * @return true if the workflow was deleted, false if it didn't exist
     */
    suspend fun delete(id: WorkflowId): Boolean
    
    /**
     * Checks if a workflow exists in the repository.
     *
     * @param id The workflow's unique identifier
     * @return true if the workflow exists, false otherwise
     */
    suspend fun existsById(id: WorkflowId): Boolean

    /**
     * Soft-deletes a workflow by setting deleted_at timestamp.
     *
     * Workflows have no child entities, so no cascade operations are performed.
     * Future enhancement: Add validation to prevent deletion of workflows
     * assigned to active issues when workflow-issue assignment is implemented.
     *
     * @param id The workflow ID to soft-delete
     * @throws WorkflowNotFoundException if workflow does not exist
     */
    suspend fun softDelete(id: WorkflowId)

    /**
     * Restores a soft-deleted workflow by clearing deleted_at timestamp.
     *
     * This operation is idempotent - restoring an already active workflow
     * will succeed without error.
     *
     * @param id The workflow ID to restore
     */
    suspend fun restore(id: WorkflowId)

    /**
     * Finds all soft-deleted workflows.
     *
     * @return List of deleted workflows ordered by deletion date
     */
    suspend fun findDeleted(): List<Workflow>

    /**
     * Finds a workflow by ID, including soft-deleted workflows.
     *
     * Unlike findById(), this method does not filter by deleted_at status,
     * allowing retrieval of deleted workflows for restoration purposes.
     *
     * @param id The workflow ID to find
     * @return The workflow if found (including deleted), null otherwise
     */
    suspend fun findIncludingDeleted(id: WorkflowId): Workflow?

    /**
     * Finds all soft-deleted workflows that were deleted before the specified cutoff date.
     *
     * Used by the data retention service to identify workflows eligible for permanent deletion
     * after the retention period expires.
     *
     * @param cutoffDate Only workflows deleted before this timestamp are returned
     * @return List of workflows eligible for permanent deletion
     */
    suspend fun findDeletedBefore(cutoffDate: Instant): List<Workflow>

    /**
     * Permanently deletes a workflow from the database (hard delete).
     *
     * This operation is IRREVERSIBLE and should only be called by the data retention service
     * after the retention period has expired. Workflows have no child entities, so no
     * cascade considerations are needed.
     *
     * @param id The workflow ID to permanently delete
     */
    suspend fun purge(id: WorkflowId)

    /**
     * Permanently deletes all soft-deleted workflows that were deleted before the cutoff date.
     *
     * This is an atomic batch operation used by the data retention service.
     *
     * @param cutoffDate Only workflows deleted before this timestamp are purged
     * @return Number of workflows permanently deleted
     */
    suspend fun purgeDeletedBefore(cutoffDate: Instant): Int
}