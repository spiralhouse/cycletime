package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

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
     * Retrieves all workflows from the repository.
     *
     * @return List of all workflows, ordered by creation date
     */
    suspend fun findAll(): List<Workflow>
    
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
     * **STUB IMPLEMENTATION**: Default implementation delegates to hard-delete
     * until SPI-877 implements soft-deletion. Workflows with children cascade
     * the deletion to all child entities.
     *
     * @param id The workflow ID to soft-delete
     * @throws WorkflowNotFoundException if workflow does not exist
     */
    suspend fun softDelete(id: WorkflowId): Boolean {
        return delete(id)  // Stub: Delegate to existing hard-delete
    }

    /**
     * Restores a soft-deleted workflow by clearing deleted_at timestamp.
     *
     * **STUB IMPLEMENTATION**: Default implementation is a no-op until
     * SPI-877 implements restoration logic.
     *
     * @param id The workflow ID to restore
     * @throws WorkflowNotFoundException if workflow does not exist
     */
    suspend fun restore(id: WorkflowId) {
        // Stub: No-op (not implemented until SPI-877)
    }

    /**
     * Finds all soft-deleted workflows.
     *
     * **STUB IMPLEMENTATION**: Default implementation returns empty list
     * until SPI-877 implements soft-deletion tracking.
     *
     * @return List of deleted workflows (empty until real implementation)
     */
    suspend fun findDeleted(): List<Workflow> {
        return emptyList()  // Stub: No deleted items tracked yet
    }

    /**
     * Finds a workflow by ID, including soft-deleted workflows.
     *
     * **STUB IMPLEMENTATION**: Default implementation delegates to existing
     * findById() until SPI-877 implements deleted_at filtering.
     *
     * @param id The workflow ID to find
     * @return The workflow if found (including deleted), null otherwise
     */
    suspend fun findIncludingDeleted(id: WorkflowId): Workflow? {
        return findById(id)  // Stub: Delegate to existing findById
    }
}