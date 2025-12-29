package io.spiralhouse.cycletime.domain.repositories

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant

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
     * Cascades the deletion to all descendant issues (children, grandchildren, etc.)
     * in a single atomic transaction. Preserves all relationships and data for
     * potential restoration.
     *
     * @param id The issue ID to soft-delete
     * @throws IssueNotFoundException if issue does not exist
     */
    suspend fun softDelete(id: IssueId)

    /**
     * Restores a soft-deleted issue by clearing deleted_at timestamp.
     *
     * Does NOT automatically restore child issues - they must be restored explicitly.
     * Validates that the parent issue (if any) is not deleted before allowing restoration.
     *
     * @param id The issue ID to restore
     * @throws IssueNotFoundException if issue does not exist
     * @throws ParentIssueDeletedException if parent issue is still deleted
     */
    suspend fun restore(id: IssueId)

    /**
     * Finds all soft-deleted issues.
     *
     * @return List of deleted issues (where deleted_at IS NOT NULL)
     */
    suspend fun findDeleted(): List<Issue>

    /**
     * Finds an issue by ID, including soft-deleted issues.
     *
     * Useful for admin operations and restoration workflows where deleted
     * issues need to be queried.
     *
     * @param id The issue ID to find
     * @return The issue if found (including deleted), null otherwise
     */
    suspend fun findIncludingDeleted(id: IssueId): Issue?

    /**
     * Finds all soft-deleted issues that were deleted before the specified cutoff date.
     *
     * Used by the data retention service to identify issues eligible for permanent deletion
     * after the retention period expires.
     *
     * @param cutoffDate Only issues deleted before this timestamp are returned
     * @return List of issues eligible for permanent deletion
     */
    suspend fun findDeletedBefore(cutoffDate: Instant): List<Issue>

    /**
     * Permanently deletes an issue from the database (hard delete).
     *
     * This operation is IRREVERSIBLE and should only be called by the data retention service
     * after the retention period has expired. No cascade is performed - caller must ensure
     * child entities are purged first.
     *
     * @param id The issue ID to permanently delete
     */
    suspend fun purge(id: IssueId)

    /**
     * Permanently deletes all soft-deleted issues that were deleted before the cutoff date.
     *
     * This is an atomic batch operation used by the data retention service. Child issues
     * (subtasks) must be purged first to maintain referential integrity.
     *
     * @param cutoffDate Only issues deleted before this timestamp are purged
     * @return Number of issues permanently deleted
     */
    suspend fun purgeDeletedBefore(cutoffDate: Instant): Int
}