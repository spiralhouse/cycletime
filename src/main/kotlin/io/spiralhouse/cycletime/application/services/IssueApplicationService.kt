package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.application.exceptions.*
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.persistence.queries.HierarchyQueries

/**
 * Application service for managing Issue operations.
 *
 * This service acts as the orchestration layer between the domain and infrastructure,
 * coordinating complex business operations while maintaining transactional integrity
 * through the Unit of Work pattern. It enforces business rules, handles cross-aggregate
 * operations, and translates between domain entities and DTOs.
 *
 * ## Responsibilities:
 * - **Use Case Orchestration**: Each public method represents a complete use case
 * - **Transaction Management**: Ensures all operations within a use case are atomic
 * - **Domain Coordination**: Orchestrates operations across Issue and Project aggregates
 * - **DTO Translation**: Converts between domain entities and application DTOs
 * - **Business Rule Enforcement**: Validates commands and enforces application-level rules
 * - **Hierarchy Management**: Validates and maintains issue hierarchy rules
 * - **Dependency Management**: Handles issue dependencies and prevents circular references
 *
 * ## Design Patterns:
 * - **Unit of Work**: All operations wrapped in transactional boundaries
 * - **Command Pattern**: Uses command objects for complex operations
 * - **Repository Pattern**: Delegates persistence to repository interfaces
 * - **DTO Pattern**: Never exposes domain entities directly
 *
 * ## Thread Safety:
 * All methods are suspend functions designed for concurrent access.
 * The Unit of Work ensures transactional isolation between operations.
 *
 * @property issueRepository Repository for Issue aggregate persistence
 * @property projectRepository Repository for Project aggregate persistence
 * @property unitOfWork Transaction coordinator ensuring atomic operations
 * @property timeProvider Time provider for consistent temporal operations
 *
 * @constructor Creates a new IssueApplicationService with required dependencies
 */
class IssueApplicationService(
    private val issueRepository: IssueRepository,
    private val projectRepository: ProjectRepository,
    private val unitOfWork: UnitOfWork,
    private val timeProvider: TimeProvider
) : ApplicationServiceBase() {

    // ================================================================================
    // CRUD Operations
    // ================================================================================

    /**
     * Creates a new issue with the specified attributes.
     *
     * ## Business Rules:
     * - Issue title must be non-empty and <= 255 characters
     * - Description is optional but limited to 2000 characters if provided
     * - Hierarchy rules must be followed (Epic -> Story -> Subtask)
     * - Estimates required for Subtasks, forbidden for Epics
     * - Project inheritance from parent when parent has project
     *
     * @param command Command containing issue creation details
     * @return IssueDto representing the created issue with generated ID
     * @throws io.spiralhouse.cycletime.application.exceptions.HierarchyViolationException if hierarchy rules are violated
     * @throws io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException if project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if domain rules are violated
     */
    suspend fun createIssue(command: CreateIssueCommand): IssueDto {
        return unitOfWork.execute {
            // Validate project exists if specified
            command.projectId?.let { projectId ->
                if (projectRepository.findById(projectId) == null) {
                    throw ProjectNotFoundException(projectId)
                }
            }

            // Validate parent and determine project inheritance
            val finalProjectId = when {
                command.parentId != null -> {
                    val parent = issueRepository.findById(command.parentId)
                        ?: throw IssueNotFoundException(command.parentId)

                    // Validate hierarchy rules
                    validateHierarchy(command.type, parent.type)

                    // Inherit project from parent if not explicitly specified
                    command.projectId ?: parent.projectId
                }
                else -> {
                    // No parent - validate types that require parent
                    validateHierarchy(command.type, null)
                    command.projectId
                }
            }

            // Create the issue
            val issue = Issue.create(
                title = command.title,
                description = command.description,
                type = command.type,
                parentId = command.parentId,
                projectId = finalProjectId,
                timeProvider = timeProvider
            )

            // Set estimate if provided
            command.estimate?.let { estimate ->
                // Delegate to domain entity for validation
                // Domain exceptions will propagate to caller
                issue.setEstimate(estimate)
            }

            // Set assignee if provided
            command.assigneeId?.let { assigneeId ->
                issue.updateAssignee(assigneeId)
            }

            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Retrieves an issue by its unique identifier.
     *
     * @param issueId The unique identifier of the issue to retrieve
     * @return IssueDto if found, null otherwise
     */
    suspend fun getIssue(issueId: IssueId): IssueDto? {
        return unitOfWork.execute {
            issueRepository.findById(issueId)?.let { issue ->
                IssueDto.fromIssue(issue)
            }
        }
    }

    /**
     * Updates an existing issue's attributes.
     *
     * @param command Command containing issue ID and optional updates
     * @return IssueDto representing the updated issue state
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if updates violate domain rules
     */
    suspend fun updateIssue(command: UpdateIssueCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.id)

            // Apply updates
            command.title?.let { title ->
                issue.updateTitle(title)
            }

            command.description?.let { description ->
                issue.updateDescription(description)
            }

            command.estimate?.let { estimate ->
                // Delegate to domain entity for validation
                // Domain exceptions will propagate to caller
                issue.setEstimate(estimate)
            }

            command.assigneeId?.let { assigneeId ->
                issue.updateAssignee(assigneeId)
            }

            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Soft-deletes an issue from the system.
     *
     * This operation marks the issue as deleted by setting the deleted_at timestamp
     * but preserves the data for potential recovery via restoreIssue().
     * Child issues are cascade soft-deleted (handled by repository).
     *
     * @param issueId The ID of the issue to delete
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun deleteIssue(issueId: IssueId) {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(issueId)
            issueRepository.softDelete(issueId)
        }
    }

    /**
     * Restores a soft-deleted issue.
     *
     * This operation clears the deleted_at timestamp, making the issue
     * active again. Note that child issues are NOT automatically restored -
     * they must be restored individually if needed.
     *
     * ## Business Rules:
     * - Issue must exist (including deleted issues) or IssueNotFoundException is thrown
     * - Operation is idempotent - restoring an already-active issue succeeds
     * - Child issues remain deleted (explicit restoration required)
     * - CRITICAL: Cannot restore child issue if parent is still deleted (must restore parent first)
     *
     * ## State Transitions:
     * - DELETED → ACTIVE (clears deleted_at)
     * - ACTIVE → ACTIVE (idempotent, no-op)
     *
     * @param id The ID of the issue to restore
     * @return IssueDto representing the restored issue
     * @throws IssueNotFoundException if the issue doesn't exist at all
     * @throws IllegalStateException if attempting to restore child when parent is deleted
     */
    suspend fun restoreIssue(id: IssueId): IssueDto {
        return unitOfWork.execute {
            val issue = issueRepository.findIncludingDeleted(id)
                ?: throw IssueNotFoundException(id)

            // Validate parent is not deleted
            if (issue.parentId != null) {
                // Check if parent exists (including deleted)
                val parentIncludingDeleted = issueRepository.findIncludingDeleted(issue.parentId)
                if (parentIncludingDeleted != null) {
                    // Parent exists - check if it's deleted by verifying findById returns null
                    val activeParent = issueRepository.findById(issue.parentId)
                    if (activeParent == null) {
                        // Parent exists in findIncludingDeleted but not in findById = deleted
                        throw IllegalStateException(
                            "Cannot restore issue ${issue.id.value} - parent ${parentIncludingDeleted.id.value} is still deleted. " +
                            "Restore parent first or contact support."
                        )
                    }
                }
            }

            // Restore issue (does NOT auto-restore children)
            issueRepository.restore(id)

            val restoredIssue = issueRepository.findById(id)
                ?: throw IssueNotFoundException(id)

            IssueDto.fromIssue(restoredIssue)
        }
    }

    // ================================================================================
    // Hierarchy Operations
    // ================================================================================

    /**
     * Moves an issue to a different parent.
     *
     * This operation validates hierarchy rules before moving and preserves
     * all issue attributes except the parent relationship. Project inheritance
     * is recalculated based on the new parent.
     *
     * ## Business Rules:
     * - Move must respect hierarchy rules (Epic->Story->Subtask)
     * - Cannot create circular parent relationships
     * - Project is inherited from new parent if parent has project
     * - All other attributes (status, dependencies, etc.) are preserved
     *
     * @param command Command containing issue and new parent IDs
     * @return IssueDto representing the moved issue with new parent
     * @throws HierarchyViolationException if move violates hierarchy rules
     * @throws IssueNotFoundException if issue or parent doesn't exist
     */
    suspend fun moveIssue(command: MoveIssueCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            // Determine new parent type and project
            val (newParentType, newProjectId) = when (command.newParentId) {
                null -> Pair(null, issue.projectId) // No parent - keep existing project
                else -> {
                    val parent = issueRepository.findById(command.newParentId)
                        ?: throw IssueNotFoundException(command.newParentId)

                    // Check for circular dependency (cannot move to own descendant)
                    if (isDescendantOf(parent.id, issue.id)) {
                        throw HierarchyViolationException(
                            issue.type,
                            parent.type,
                            "Cannot move issue to its own descendant"
                        )
                    }

                    Pair(parent.type, parent.projectId ?: issue.projectId)
                }
            }

            // Validate hierarchy rules for the move
            validateHierarchy(issue.type, newParentType)

            // Create issue with new parent while preserving all other attributes
            val movedIssue = Issue.fromSnapshot(
                issue.toSnapshot().copy(
                    parentId = command.newParentId,
                    projectId = newProjectId,
                    updatedAt = timeProvider.now()
                ),
                timeProvider
            )

            issueRepository.save(movedIssue)
            IssueDto.fromIssue(movedIssue)
        }
    }

    /**
     * Checks if an issue is a descendant of another issue.
     * Used to prevent circular parent relationships.
     *
     * @param potentialDescendantId The ID of the potential descendant
     * @param ancestorId The ID of the potential ancestor
     * @return true if potentialDescendantId is a descendant of ancestorId
     */
    private suspend fun isDescendantOf(potentialDescendantId: IssueId, ancestorId: IssueId): Boolean {
        var currentId: IssueId? = potentialDescendantId
        val visited = mutableSetOf<IssueId>()

        while (currentId != null) {
            if (currentId == ancestorId) return true
            if (!visited.add(currentId)) break // Prevent infinite loop

            val issue = issueRepository.findById(currentId) ?: break
            currentId = issue.parentId
        }

        return false
    }

    /**
     * Gets the complete hierarchy for an issue (including all descendants).
     *
     * @param issueId The root issue ID
     * @return IssueHierarchyDto representing the complete hierarchy
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun getIssueHierarchy(issueId: IssueId): IssueHierarchyDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(issueId)

            buildHierarchy(issue)
        }
    }

    /**
     * Gets the extended hierarchy information for an issue.
     * Returns the issue with its parent, direct children, and total descendant count.
     *
     * @param issueId The issue ID
     * @return IssueHierarchyExtendedDto representing the extended hierarchy
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun getIssueHierarchyExtended(issueId: IssueId): IssueHierarchyExtendedDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(issueId)

            val parent = issue.parentId?.let { parentId ->
                issueRepository.findById(parentId)
            }

            val children = issueRepository.findByParent(issue.id)
            // Use optimized query to avoid N+1 problem
            val totalDescendants = HierarchyQueries.countDescendantsOptimized(issue.id)

            IssueHierarchyExtendedDto.fromIssueWithParentAndChildren(
                issue = issue,
                parent = parent,
                children = children,
                totalDescendants = totalDescendants
            )
        }
    }

    private suspend fun buildHierarchy(issue: Issue): IssueHierarchyDto {
        val children = issueRepository.findByParent(issue.id)
        val childHierarchies = children.map { child -> buildHierarchy(child) }

        return IssueHierarchyDto.fromIssueWithChildren(
            issue = issue,
            childHierarchies = childHierarchies
        )
    }


    /**
     * Lists all direct children of a parent issue.
     *
     * @param parentId The parent issue ID
     * @return List of IssueDto representing direct children
     */
    suspend fun listChildren(parentId: IssueId): List<IssueDto> {
        return unitOfWork.execute {
            val children = issueRepository.findByParent(parentId)
            children.map { issue -> IssueDto.fromIssue(issue) }
        }
    }

    // ================================================================================
    // Dependency Management
    // ================================================================================

    /**
     * Adds a dependency (this issue depends on another).
     *
     * @param command Command containing issue and dependency IDs
     * @return IssueDto representing the updated issue
     * @throws io.spiralhouse.cycletime.application.exceptions.CircularDependencyException if circular dependency detected
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if either issue doesn't exist
     */
    suspend fun addDependency(command: AddDependencyCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            // Validate dependency exists
            val dependency = findIssueOrThrow(command.dependencyId)

            // Check for circular dependency BEFORE adding
            // Note: Domain entity will handle self-dependency validation
            if (command.issueId != command.dependencyId && hasCircularDependency(command.issueId, command.dependencyId)) {
                throw CircularDependencyException(command.issueId, command.dependencyId)
            }

            // Add dependency - domain entity validates (including self-dependency)
            issue.addDependency(command.dependencyId)

            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Removes a dependency.
     *
     * @param command Command containing issue and dependency IDs
     * @return IssueDto representing the updated issue
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun removeDependency(command: RemoveDependencyCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            issue.removeDependency(command.dependencyId)
            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Adds a blocker (another issue blocks this one).
     *
     * @param command Command containing issue and blocker IDs
     * @return IssueDto representing the updated issue
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if either issue doesn't exist
     */
    suspend fun addBlocker(command: AddBlockerCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            // Validate blocker exists
            val blocker = findIssueOrThrow(command.blockerId)

            issue.addBlockedBy(command.blockerId)
            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Removes a blocker.
     *
     * @param command Command containing issue and blocker IDs
     * @return IssueDto representing the updated issue
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun removeBlocker(command: RemoveBlockerCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            issue.removeBlockedBy(command.blockerId)
            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    // ================================================================================
    // Status Operations
    // ================================================================================

    /**
     * Updates issue status with validation.
     *
     * @param command Command containing issue ID and new status
     * @return IssueDto representing the updated issue
     * @throws io.spiralhouse.cycletime.application.exceptions.InvalidStatusTransitionException if transition is invalid
     * @throws io.spiralhouse.cycletime.application.exceptions.IssueNotFoundException if the issue doesn't exist
     */
    suspend fun updateStatus(command: UpdateIssueStatusCommand): IssueDto {
        return unitOfWork.execute {
            val issue = findIssueOrThrow(command.issueId)

            try {
                issue.updateStatus(command.newStatus)
            } catch (e: DomainException) {
                throw InvalidStatusTransitionException(issue.status, command.newStatus, e)
            }

            issueRepository.save(issue)
            IssueDto.fromIssue(issue)
        }
    }

    /**
     * Gets all issues with a specific status.
     *
     * @param status The status to filter by
     * @return List of IssueDto matching the status
     */
    suspend fun getIssuesByStatus(status: IssueStatus): List<IssueDto> {
        return unitOfWork.execute {
            val issues = issueRepository.findByStatus(status)
            issues.map { issue -> IssueDto.fromIssue(issue) }
        }
    }

    // ================================================================================
    // Query Operations
    // ================================================================================

    /**
     * Retrieves all issues in the system.
     *
     * ## Implementation Note:
     * Uses separate queries by type rather than a single findAll() query to maintain
     * consistency with repository interface design. Each type query is optimized
     * separately and the results are combined in memory.
     *
     * @return IssueListDto containing all issues and total count
     */
    suspend fun listIssues(): IssueListDto {
        return unitOfWork.execute {
            // Query each issue type separately and combine results
            val allIssues = listOf(
                issueRepository.findByType(IssueType.EPIC),
                issueRepository.findByType(IssueType.STORY),
                issueRepository.findByType(IssueType.SUBTASK)
            ).flatten()
            
            IssueListDto.fromIssues(allIssues)
        }
    }

    /**
     * Gets all issues associated with a specific project.
     *
     * @param projectId The project ID to filter by
     * @return List of IssueDto associated with the project
     */
    suspend fun getIssuesByProject(projectId: ProjectId): List<IssueDto> {
        return unitOfWork.execute {
            val issues = issueRepository.findByProject(projectId)
            issues.map { issue -> IssueDto.fromIssue(issue) }
        }
    }

    /**
     * Gets all issues assigned to a specific user.
     *
     * @param assigneeId The assignee ID to filter by
     * @return List of IssueDto assigned to the user
     */
    suspend fun getIssuesByAssignee(assigneeId: String): List<IssueDto> {
        return unitOfWork.execute {
            val issues = issueRepository.findByAssignee(assigneeId)
            issues.map { issue -> IssueDto.fromIssue(issue) }
        }
    }

    /**
     * Gets all issues of a specific type.
     *
     * @param type The issue type to filter by
     * @return List of IssueDto of the specified type
     */
    suspend fun getIssuesByType(type: IssueType): List<IssueDto> {
        return unitOfWork.execute {
            val issues = issueRepository.findByType(type)
            issues.map { issue -> IssueDto.fromIssue(issue) }
        }
    }

    // ================================================================================
    // Private Helper Methods
    // ================================================================================

    /**
     * Finds an issue by ID or throws IssueNotFoundException.
     * Reduces duplication of the common find-or-throw pattern.
     *
     * @param issueId The ID of the issue to find
     * @return The found Issue
     * @throws IssueNotFoundException if the issue doesn't exist
     */
    private suspend fun findIssueOrThrow(issueId: IssueId): Issue {
        return issueRepository.findById(issueId)
            ?: throw IssueNotFoundException(issueId)
    }

    /**
     * Validates hierarchy rules between child and parent issue types.
     *
     * ## Hierarchy Rules:
     * - **Epic**: Cannot have any parent (top-level only)
     * - **Story**: Can have Epic parent or no parent (orphaned stories allowed)
     * - **Subtask**: MUST have Story parent (orphaned subtasks NOT allowed)
     *
     * Note: The application layer enforces strict hierarchy for Subtasks to maintain
     * data integrity and prevent orphaned work items. Stories can be orphaned to allow
     * flexible workflow organization. Invalid parent types are always rejected
     * (e.g., Epic with Epic parent, Story with Subtask parent).
     *
     * @param childType The type of the child issue
     * @param parentType The type of the parent issue (null if no parent)
     * @throws HierarchyViolationException if the hierarchy rules are violated
     */
    private fun validateHierarchy(childType: IssueType, parentType: IssueType?) {
        val isValid = when (childType) {
            IssueType.EPIC -> {
                // Epics cannot have any parent
                parentType == null
            }
            IssueType.STORY -> {
                // Stories can have no parent or an Epic parent only
                parentType == null || parentType == IssueType.EPIC
            }
            IssueType.SUBTASK -> {
                // Subtasks MUST have a Story parent (not null, not Epic)
                parentType == IssueType.STORY
            }
        }

        if (!isValid) {
            throw HierarchyViolationException(childType, parentType)
        }
    }

    /**
     * Checks if adding a dependency would create a circular dependency.
     *
     * Uses depth-first search to detect cycles in the dependency graph.
     * Also handles self-dependencies as a special case.
     *
     * @param fromIssueId The issue that would depend on toIssueId
     * @param toIssueId The issue that fromIssueId would depend on
     * @return true if adding this dependency would create a cycle
     */
    private suspend fun hasCircularDependency(fromIssueId: IssueId, toIssueId: IssueId): Boolean {
        // Self-dependency check
        if (fromIssueId == toIssueId) return true

        // DFS to detect circular dependency through the graph
        val visited = mutableSetOf<IssueId>()
        val recursionStack = mutableSetOf<IssueId>()

        suspend fun dfs(currentId: IssueId): Boolean {
            if (currentId == fromIssueId) return true // Found cycle back to start
            if (recursionStack.contains(currentId)) return false // Already in current path
            if (visited.contains(currentId)) return false // Already fully explored

            visited.add(currentId)
            recursionStack.add(currentId)

            val issue = issueRepository.findById(currentId) ?: return false
            for (dependencyId in issue.dependencies) {
                if (dfs(dependencyId)) return true
            }

            recursionStack.remove(currentId)
            return false
        }

        return dfs(toIssueId)
    }
}
