package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

/**
 * Repository interface for Workflow entities.
 *
 * Defines the contract for persistence operations on Workflow aggregates.
 * Implementations should handle the conversion between domain entities
 * and their persistent representation using the snapshot pattern.
 */
interface WorkflowRepository {
    /**
     * Saves a workflow to the repository.
     * If the workflow already exists, it will be updated.
     *
     * @param workflow The workflow to save
     * @return The saved workflow
     */
    suspend fun save(workflow: Workflow): Workflow

    /**
     * Finds a workflow by its unique identifier.
     *
     * @param id The workflow identifier
     * @return The workflow if found, null otherwise
     */
    suspend fun findById(id: WorkflowId): Workflow?

    /**
     * Retrieves all workflows from the repository.
     *
     * @return List of all workflows
     */
    suspend fun findAll(): List<Workflow>

    /**
     * Updates an existing workflow.
     *
     * @param workflow The workflow to update
     * @return The updated workflow
     * @throws IllegalArgumentException if workflow doesn't exist
     */
    suspend fun update(workflow: Workflow): Workflow

    /**
     * Deletes a workflow by its unique identifier.
     *
     * @param id The workflow identifier
     * @return true if the workflow was deleted, false if it didn't exist
     */
    suspend fun delete(id: WorkflowId): Boolean

    /**
     * Checks if a workflow exists with the given identifier.
     *
     * @param id The workflow identifier
     * @return true if the workflow exists, false otherwise
     */
    suspend fun existsById(id: WorkflowId): Boolean
}