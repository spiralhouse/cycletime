package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus

/**
 * Repository interface for Project aggregate persistence.
 *
 * Defines the contract for Project persistence operations without coupling
 * to specific infrastructure implementations. This enables testability
 * through dependency injection and follows Domain-Driven Design principles.
 *
 * ## Design Principles:
 * - **Aggregate Root Focus**: All operations work with Project aggregates
 * - **Infrastructure Agnostic**: No dependencies on specific database technologies
 * - **Testability**: Easily mockable for unit testing
 * - **Consistency**: All methods are suspend functions for async compatibility
 *
 * ## Implementation Notes:
 * - Concrete implementations should handle transaction management
 * - Error handling should be consistent across implementations
 * - Performance characteristics may vary by implementation
 */
interface ProjectRepository {
    
    /**
     * Finds a project by its unique identifier.
     *
     * @param id The unique identifier of the project
     * @return The project if found, null otherwise
     */
    suspend fun findById(id: ProjectId): Project?
    
    /**
     * Finds all projects with a specific status.
     *
     * @param status The project status to filter by
     * @return List of projects with the specified status
     */
    suspend fun findByStatus(status: ProjectStatus): List<Project>
    
    /**
     * Retrieves all projects in the system.
     *
     * @return List of all projects
     */
    suspend fun findAll(): List<Project>
    
    /**
     * Persists a project aggregate.
     *
     * @param project The project to save (create or update)
     */
    suspend fun save(project: Project)
    
    /**
     * Deletes a project by its identifier.
     *
     * @param id The identifier of the project to delete
     */
    suspend fun delete(id: ProjectId)
    
    /**
     * Checks if a project exists with the given identifier.
     *
     * @param id The project identifier to check
     * @return true if the project exists, false otherwise
     */
    suspend fun exists(id: ProjectId): Boolean

    /**
     * Soft-deletes a project by setting deleted_at timestamp.
     *
     * **STUB IMPLEMENTATION**: Default implementation delegates to hard-delete
     * until SPI-875 implements soft-deletion. Projects with children cascade
     * the deletion to all child issues.
     *
     * @param id The project ID to soft-delete
     * @throws ProjectNotFoundException if project does not exist
     */
    suspend fun softDelete(id: ProjectId) {
        delete(id)  // Stub: Delegate to existing hard-delete
    }

    /**
     * Restores a soft-deleted project by clearing deleted_at timestamp.
     *
     * **STUB IMPLEMENTATION**: Default implementation is a no-op until
     * SPI-875 implements restoration logic.
     *
     * @param id The project ID to restore
     * @throws ProjectNotFoundException if project does not exist
     */
    suspend fun restore(id: ProjectId) {
        // Stub: No-op (not implemented until SPI-875)
    }

    /**
     * Finds all soft-deleted projects.
     *
     * **STUB IMPLEMENTATION**: Default implementation returns empty list
     * until SPI-875 implements soft-deletion tracking.
     *
     * @return List of deleted projects (empty until real implementation)
     */
    suspend fun findDeleted(): List<Project> {
        return emptyList()  // Stub: No deleted items tracked yet
    }

    /**
     * Finds a project by ID, including soft-deleted projects.
     *
     * **STUB IMPLEMENTATION**: Default implementation delegates to existing
     * findById() until SPI-875 implements deleted_at filtering.
     *
     * @param id The project ID to find
     * @return The project if found (including deleted), null otherwise
     */
    suspend fun findIncludingDeleted(id: ProjectId): Project? {
        return findById(id)  // Stub: Delegate to existing findById
    }
}