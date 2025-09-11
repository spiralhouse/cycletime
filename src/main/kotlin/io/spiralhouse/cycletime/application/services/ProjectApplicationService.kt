package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.ProjectDto
import io.spiralhouse.cycletime.application.dto.ProjectListDto
import io.spiralhouse.cycletime.application.exceptions.ProjectNotFoundException
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus

/**
 * Application service for managing Project operations.
 *
 * This service acts as the orchestration layer between the domain and infrastructure,
 * coordinating complex business operations while maintaining transactional integrity
 * through the Unit of Work pattern. It enforces business rules, handles cross-aggregate
 * operations, and translates between domain entities and DTOs.
 *
 * ## Responsibilities:
 * - **Use Case Orchestration**: Each public method represents a complete use case
 * - **Transaction Management**: Ensures all operations within a use case are atomic
 * - **Domain Coordination**: Orchestrates operations across Project and Issue aggregates
 * - **DTO Translation**: Converts between domain entities and application DTOs
 * - **Business Rule Enforcement**: Validates commands and enforces application-level rules
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
 * ## Performance Characteristics:
 * - Single aggregate loads per operation (no N+1 queries)
 * - Eager loading of issue IDs within Project aggregate
 * - Transaction scope minimized to reduce lock contention
 *
 * @property projectRepository Repository for Project aggregate persistence
 * @property issueRepository Repository for Issue aggregate persistence
 * @property unitOfWork Transaction coordinator ensuring atomic operations
 * @property timeProvider Time provider for consistent temporal operations
 *
 * @constructor Creates a new ProjectApplicationService with required dependencies
 */
class ProjectApplicationService(
    private val projectRepository: ExposedProjectRepository,
    private val issueRepository: ExposedIssueRepository,
    private val unitOfWork: ExposedUnitOfWork,
    private val timeProvider: TimeProvider
) : ApplicationServiceBase() {

    /**
     * Creates a new project with the specified attributes.
     *
     * This operation creates a new Project aggregate in the ACTIVE status.
     * The project is immediately persisted within a transactional boundary.
     *
     * ## Business Rules:
     * - Project name must be non-empty and <= 255 characters
     * - Description is optional but limited to 2000 characters if provided
     * - New projects always start in ACTIVE status
     * - Project ID is auto-generated using UUID v4
     *
     * ## Transactional Guarantees:
     * - Project creation is atomic - either fully succeeds or rolls back
     * - Timestamps (createdAt, updatedAt) are set to current time
     *
     * @param command Command containing project name and optional description
     * @return ProjectDto representing the created project with generated ID
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if domain rules are violated
     */
    suspend fun createProject(command: CreateProjectCommand): ProjectDto {
        return unitOfWork.execute {
            val project = Project.create(
                name = command.name,
                description = command.description,
                timeProvider = timeProvider
            )

            projectRepository.save(project)
            ProjectDto.fromProject(project)
        }
    }

    /**
     * Retrieves a project by its unique identifier.
     *
     * This is a read-only operation that returns the current state of a project
     * including all associated issue IDs. Returns null if the project doesn't exist.
     *
     * ## Performance Considerations:
     * - Single database query for project data
     * - Issue IDs are loaded eagerly as part of the aggregate
     * - Consider caching for frequently accessed projects
     *
     * @param projectId The unique identifier of the project to retrieve
     * @return ProjectDto if found, null otherwise
     */
    suspend fun getProject(projectId: ProjectId): ProjectDto? {
        return unitOfWork.execute {
            projectRepository.findById(projectId)?.let { project ->
                ProjectDto.fromProject(project)
            }
        }
    }

    /**
     * Updates an existing project's attributes.
     *
     * Applies partial updates to a project. Only non-null fields in the command
     * are updated. The updatedAt timestamp is automatically set to current time.
     *
     * ## Business Rules:
     * - Project must exist or ProjectNotFoundException is thrown
     * - Name updates must comply with validation rules (non-empty, <= 255 chars)
     * - Description updates are optional but limited to 2000 characters
     * - Status cannot be updated via this method (use specific status transition methods)
     *
     * ## Atomicity:
     * All updates are applied within a single transaction. If any update fails,
     * all changes are rolled back.
     *
     * @param command Command containing project ID and optional updates
     * @return ProjectDto representing the updated project state
     * @throws ProjectNotFoundException if the project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if updates violate domain rules
     */
    suspend fun updateProject(command: UpdateProjectCommand): ProjectDto {
        return unitOfWork.execute {
            val project = loadProjectOrThrow(command.id)

            applyProjectUpdates(project, command)

            projectRepository.save(project)
            ProjectDto.fromProject(project)
        }
    }

    /**
     * Permanently deletes a project from the system.
     *
     * This is a destructive operation that cannot be undone. Consider using
     * archiveProject() for soft deletion if recovery might be needed.
     *
     * ## Business Rules:
     * - Project must exist or ProjectNotFoundException is thrown
     * - Associated issues are cascade deleted (handled by repository)
     * - No recovery possible after deletion
     *
     * ## Implementation Note:
     * Future enhancement could check for active issues and prevent deletion
     * if the project has unresolved work items.
     *
     * @param projectId The ID of the project to delete
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    suspend fun deleteProject(projectId: ProjectId) {
        unitOfWork.execute {
            ensureProjectExists(projectId)
            projectRepository.delete(projectId)
        }
    }

    /**
     * Retrieves all projects in the system.
     *
     * Returns a complete list of all projects regardless of status.
     * Projects are returned in their natural repository order (typically by creation date).
     *
     * ## Performance Considerations:
     * - Loads all projects into memory - consider pagination for large datasets
     * - Each project includes its full issue ID list
     * - Future enhancement: Add pagination support via limit/offset parameters
     *
     * @return ProjectListDto containing all projects and total count
     */
    suspend fun listProjects(): ProjectListDto {
        return unitOfWork.execute {
            val projects = projectRepository.findAll()
            ProjectListDto.fromProjects(projects)
        }
    }

    /**
     * Retrieves all projects with a specific status.
     *
     * Filters projects by their current status (ACTIVE, COMPLETED, ARCHIVED).
     * Useful for dashboard views and status-based workflows.
     *
     * ## Use Cases:
     * - Show only active projects in work views
     * - List archived projects for recovery/audit
     * - Display completed projects for reporting
     *
     * @param status The project status to filter by
     * @return List of ProjectDto matching the specified status
     */
    suspend fun listProjectsByStatus(status: ProjectStatus): List<ProjectDto> {
        return unitOfWork.execute {
            projectRepository.findByStatus(status)
                .map { project -> ProjectDto.fromProject(project) }
        }
    }

    /**
     * Finds projects by status.
     *
     * Alias for listProjectsByStatus() maintained for API compatibility.
     * Prefer using listProjectsByStatus() in new code for consistency.
     *
     * @param status The project status to filter by
     * @return List of ProjectDto matching the specified status
     * @deprecated Use listProjectsByStatus() for consistency
     */
    @Deprecated(
        message = "Use listProjectsByStatus() for consistency",
        replaceWith = ReplaceWith("listProjectsByStatus(status)")
    )
    suspend fun findProjectsByStatus(status: ProjectStatus): List<ProjectDto> {
        return listProjectsByStatus(status)
    }

    /**
     * Associates an issue with a project.
     *
     * Adds an issue ID to the project's issue collection. The issue itself
     * should be created separately through the IssueApplicationService.
     *
     * ## Business Rules:
     * - Project must exist and be in ACTIVE status
     * - Cannot add issues to ARCHIVED or COMPLETED projects
     * - Duplicate issue IDs are prevented by domain logic
     * - Issue existence is not validated (assumes IssueApplicationService handles this)
     *
     * ## Cross-Aggregate Coordination:
     * This operation updates the Project aggregate only. The Issue aggregate
     * should maintain its own project reference independently.
     *
     * @param projectId The project to add the issue to
     * @param issueId The issue to associate with the project
     * @throws ProjectNotFoundException if the project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if project is not ACTIVE
     */
    suspend fun addIssueToProject(projectId: ProjectId, issueId: IssueId) {
        unitOfWork.execute {
            val project = loadProjectOrThrow(projectId)

            project.addIssue(issueId)
            projectRepository.save(project)
        }
    }

    /**
     * Associates an issue with a project using a command object.
     *
     * Command-based variant of addIssueToProject for consistency with
     * command pattern usage throughout the application service layer.
     *
     * @param command Command containing project and issue IDs
     * @throws ProjectNotFoundException if the project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if project is not ACTIVE
     * @see addIssueToProject
     */
    suspend fun addIssueToProject(command: AddIssueToProjectCommand) {
        addIssueToProject(command.projectId, command.issueId)
    }

    /**
     * Disassociates an issue from a project.
     *
     * Removes an issue ID from the project's issue collection. This does not
     * delete the issue itself, only the association.
     *
     * ## Business Rules:
     * - Project must exist
     * - No error if issue ID doesn't exist in project (idempotent operation)
     * - Can remove issues from projects in any status
     *
     * ## Implementation Note:
     * The Issue aggregate should be updated separately to remove its
     * project reference if needed.
     *
     * @param projectId The project to remove the issue from
     * @param issueId The issue to disassociate from the project
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    suspend fun removeIssueFromProject(projectId: ProjectId, issueId: IssueId) {
        unitOfWork.execute {
            val project = loadProjectOrThrow(projectId)

            project.removeIssue(issueId)
            projectRepository.save(project)
        }
    }

    /**
     * Disassociates an issue from a project using a command object.
     *
     * Command-based variant of removeIssueFromProject for consistency.
     *
     * @param command Command containing project and issue IDs
     * @throws ProjectNotFoundException if the project doesn't exist
     * @see removeIssueFromProject
     */
    suspend fun removeIssueFromProject(command: RemoveIssueFromProjectCommand) {
        removeIssueFromProject(command.projectId, command.issueId)
    }

    /**
     * Transitions a project to ARCHIVED status.
     *
     * Archives mark projects as inactive while preserving all data.
     * This is a soft-delete operation that can be reversed via reactivateProject().
     *
     * ## Business Rules:
     * - Project must exist
     * - Can archive from any status (ACTIVE or COMPLETED)
     * - Archived projects cannot have new issues added
     * - All project data and associations are preserved
     *
     * ## State Transitions:
     * - ACTIVE → ARCHIVED
     * - COMPLETED → ARCHIVED
     * - ARCHIVED → ARCHIVED (idempotent)
     *
     * @param id The ID of the project to archive
     * @return ProjectDto representing the archived project
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    suspend fun archiveProject(id: ProjectId): ProjectDto {
        return unitOfWork.execute {
            val project = loadProjectOrThrow(id)

            project.archive()
            projectRepository.save(project)
            ProjectDto.fromProject(project)
        }
    }

    /**
     * Transitions a project to ARCHIVED status using a command object.
     *
     * Command-based variant of archiveProject for consistency.
     *
     * @param command Command containing the project ID to archive
     * @return ProjectDto representing the archived project
     * @throws ProjectNotFoundException if the project doesn't exist
     * @see archiveProject
     */
    suspend fun archiveProject(command: ArchiveProjectCommand): ProjectDto {
        return archiveProject(command.id)
    }

    /**
     * Transitions a project to COMPLETED status.
     *
     * Marks a project as successfully completed. Completed projects
     * represent finished work that met its objectives.
     *
     * ## Business Rules:
     * - Project must exist
     * - Can only complete ACTIVE projects
     * - Cannot complete ARCHIVED projects
     * - Completed projects can still be archived later
     *
     * ## State Transitions:
     * - ACTIVE → COMPLETED
     * - COMPLETED → COMPLETED (idempotent)
     * - ARCHIVED → Error (cannot complete archived projects)
     *
     * ## Future Enhancement:
     * Could validate all issues are resolved before allowing completion.
     *
     * @param id The ID of the project to complete
     * @return ProjectDto representing the completed project
     * @throws ProjectNotFoundException if the project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if project is ARCHIVED
     */
    suspend fun completeProject(id: ProjectId): ProjectDto {
        return unitOfWork.execute {
            val project = loadProjectOrThrow(id)

            project.complete()
            projectRepository.save(project)
            ProjectDto.fromProject(project)
        }
    }

    /**
     * Transitions a project to COMPLETED status using a command object.
     *
     * Command-based variant of completeProject for consistency.
     *
     * @param command Command containing the project ID to complete
     * @return ProjectDto representing the completed project
     * @throws ProjectNotFoundException if the project doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if project is ARCHIVED
     * @see completeProject
     */
    suspend fun completeProject(command: CompleteProjectCommand): ProjectDto {
        return completeProject(command.id)
    }

    /**
     * Transitions a project back to ACTIVE status.
     *
     * Reactivates a previously archived or completed project, allowing
     * new work to be added and tracked.
     *
     * ## Business Rules:
     * - Project must exist
     * - Can reactivate from COMPLETED or ARCHIVED status
     * - Already ACTIVE projects remain ACTIVE (idempotent)
     *
     * ## State Transitions:
     * - ARCHIVED → ACTIVE
     * - COMPLETED → ACTIVE
     * - ACTIVE → ACTIVE (idempotent)
     *
     * ## Use Cases:
     * - Reopening a completed project for additional work
     * - Restoring an accidentally archived project
     * - Resuming work on a previously suspended project
     *
     * @param id The ID of the project to reactivate
     * @return ProjectDto representing the reactivated project
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    suspend fun reactivateProject(id: ProjectId): ProjectDto {
        return unitOfWork.execute {
            val project = loadProjectOrThrow(id)

            project.reactivate()
            projectRepository.save(project)
            ProjectDto.fromProject(project)
        }
    }

    /**
     * Transitions a project back to ACTIVE status using a command object.
     *
     * Command-based variant of reactivateProject for consistency.
     *
     * @param command Command containing the project ID to reactivate
     * @return ProjectDto representing the reactivated project
     * @throws ProjectNotFoundException if the project doesn't exist
     * @see reactivateProject
     */
    suspend fun reactivateProject(command: ReactivateProjectCommand): ProjectDto {
        return reactivateProject(command.id)
    }

    // ================================================================================
    // Private Helper Methods
    // ================================================================================

    /**
     * Loads a project by ID or throws ProjectNotFoundException.
     *
     * Centralizes the common pattern of loading a project and handling
     * the not-found case with a consistent exception.
     *
     * @param projectId The ID of the project to load
     * @return The loaded project entity
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    private suspend fun loadProjectOrThrow(projectId: ProjectId): Project {
        return projectRepository.findById(projectId)
            ?: throw ProjectNotFoundException(projectId)
    }

    /**
     * Ensures a project exists without loading the full entity.
     *
     * More efficient than loadProjectOrThrow when only existence check is needed.
     *
     * @param projectId The ID of the project to check
     * @throws ProjectNotFoundException if the project doesn't exist
     */
    private suspend fun ensureProjectExists(projectId: ProjectId) {
        if (!projectRepository.exists(projectId)) {
            throw ProjectNotFoundException(projectId)
        }
    }

    /**
     * Applies updates from a command to a project entity.
     *
     * Centralizes the update logic for maintainability.
     *
     * @param project The project to update
     * @param command The command containing updates
     */
    private fun applyProjectUpdates(project: Project, command: UpdateProjectCommand) {
        command.name?.let { newName ->
            project.updateName(newName)
        }
        command.description?.let { newDescription ->
            project.updateDescription(newDescription)
        }
    }
}
