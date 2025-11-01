package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.valueobjects.*

/**
 * Repository interface for Issue aggregate persistence.
 *
 * This interface defines the contract for Issue entity persistence operations,
 * abstracting the underlying storage implementation. It follows the Repository
 * pattern from Domain-Driven Design, keeping persistence concerns separate
 * from domain logic.
 *
 * ## Design Principles:
 * - **Aggregate Root Focus**: Only provides operations for Issue aggregates
 * - **Query by Identifier**: All queries use strongly-typed value objects
 * - **Batch Operations**: Supports efficient bulk operations when needed
 * - **No Leaky Abstractions**: Interface doesn't expose implementation details
 *
 * ## Usage Patterns:
 * All methods are designed to be called within a Unit of Work transaction.
 * The implementation is responsible for handling database connections and
 * ensuring proper transaction boundaries.
 *
 * @see Issue The aggregate root this repository manages
 * @see UnitOfWork For transaction management
 */
interface IssueRepository {
    
    /**
     * Finds an issue by its unique identifier.
     *
     * @param id The issue identifier
     * @return The issue if found, null otherwise
     */
    suspend fun findById(id: IssueId): Issue?
    
    /**
     * Finds all issues associated with a project.
     *
     * @param projectId The project identifier
     * @return List of issues belonging to the project
     */
    suspend fun findByProject(projectId: ProjectId): List<Issue>
    
    /**
     * Finds all direct children of a parent issue.
     *
     * @param parentId The parent issue identifier
     * @return List of child issues
     */
    suspend fun findByParent(parentId: IssueId): List<Issue>
    
    /**
     * Finds all issues assigned to a specific user.
     *
     * @param assigneeId The assignee identifier
     * @return List of issues assigned to the user
     */
    suspend fun findByAssignee(assigneeId: String): List<Issue>
    
    /**
     * Finds all issues with a specific status.
     *
     * @param status The issue status
     * @return List of issues with the specified status
     */
    suspend fun findByStatus(status: IssueStatus): List<Issue>
    
    /**
     * Finds all issues of a specific type.
     *
     * @param type The issue type
     * @return List of issues of the specified type
     */
    suspend fun findByType(type: IssueType): List<Issue>
    
    /**
     * Persists an issue to storage.
     *
     * This method handles both insert and update operations based on
     * whether the issue already exists in storage.
     *
     * @param issue The issue to persist
     */
    suspend fun save(issue: Issue)
    
    /**
     * Persists multiple issues in a batch operation.
     *
     * This method is optimized for bulk operations and may be more
     * efficient than multiple individual save() calls.
     *
     * @param issues The issues to persist
     */
    suspend fun saveAll(issues: List<Issue>)
    
    /**
     * Removes an issue from storage.
     *
     * @param id The identifier of the issue to delete
     */
    suspend fun delete(id: IssueId)
    
    /**
     * Checks if an issue exists without loading it.
     *
     * This method is optimized for existence checks and may be more
     * efficient than findById() when only existence needs to be verified.
     *
     * @param id The issue identifier
     * @return true if the issue exists, false otherwise
     */
    suspend fun exists(id: IssueId): Boolean

    /**
     * Soft-deletes an issue by setting deleted_at timestamp.
     *
     * **STUB IMPLEMENTATION**: Default implementation delegates to hard-delete
     * until SPI-876 implements soft-deletion. Issues with children cascade
     * the deletion to all child issues.
     *
     * @param id The issue ID to soft-delete
     * @throws IssueNotFoundException if issue does not exist
     */
    suspend fun softDelete(id: IssueId) {
        delete(id)  // Stub: Delegate to existing hard-delete
    }

    /**
     * Restores a soft-deleted issue by clearing deleted_at timestamp.
     *
     * **STUB IMPLEMENTATION**: Default implementation is a no-op until
     * SPI-876 implements restoration logic.
     *
     * @param id The issue ID to restore
     * @throws IssueNotFoundException if issue does not exist
     */
    suspend fun restore(id: IssueId) {
        // Stub: No-op (not implemented until SPI-876)
    }

    /**
     * Finds all soft-deleted issues.
     *
     * **STUB IMPLEMENTATION**: Default implementation returns empty list
     * until SPI-876 implements soft-deletion tracking.
     *
     * @return List of deleted issues (empty until real implementation)
     */
    suspend fun findDeleted(): List<Issue> {
        return emptyList()  // Stub: No deleted items tracked yet
    }

    /**
     * Finds an issue by ID, including soft-deleted issues.
     *
     * **STUB IMPLEMENTATION**: Default implementation delegates to existing
     * findById() until SPI-876 implements deleted_at filtering.
     *
     * @param id The issue ID to find
     * @return The issue if found (including deleted), null otherwise
     */
    suspend fun findIncludingDeleted(id: IssueId): Issue? {
        return findById(id)  // Stub: Delegate to existing findById
    }
}