package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.application.exceptions.WorkflowNotFoundException
import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId

/**
 * Application service for managing Workflow operations.
 *
 * This service acts as the orchestration layer for workflow management, coordinating
 * complex business operations while maintaining transactional integrity through the
 * Unit of Work pattern. It provides a complete workflow management solution including
 * CRUD operations, state transition validation, and predefined workflow templates.
 *
 * ## Responsibilities:
 * - **Use Case Orchestration**: Each public method represents a complete use case
 * - **Transaction Management**: Ensures all operations within a use case are atomic
 * - **Domain Coordination**: Orchestrates workflow state transitions and validations
 * - **DTO Translation**: Converts between domain entities and application DTOs
 * - **Template Management**: Provides predefined workflow configurations
 *
 * ## Design Patterns:
 * - **Unit of Work**: All write operations wrapped in transactional boundaries
 * - **Command Pattern**: Uses command objects for complex operations
 * - **Repository Pattern**: Delegates persistence to repository interfaces
 * - **Factory Pattern**: Provides factory methods for common workflow types
 * - **DTO Pattern**: Never exposes domain entities directly to clients
 *
 * ## Thread Safety:
 * All methods are suspend functions designed for concurrent access.
 * The Unit of Work ensures transactional isolation between operations.
 * Repository operations are thread-safe through transaction boundaries.
 *
 * ## Performance Characteristics:
 * - Single aggregate loads per operation (no N+1 queries)
 * - Read operations bypass transaction overhead when possible
 * - Efficient status set operations using domain value objects
 * - Minimal database round-trips through aggregate design
 *
 * @property workflowRepository Repository for Workflow aggregate persistence
 * @property unitOfWork Transaction coordinator ensuring atomic operations
 * @property timeProvider Time provider for consistent temporal operations
 *
 * @constructor Creates a new WorkflowApplicationService with required dependencies
 */
class WorkflowApplicationService(
    private val workflowRepository: WorkflowRepository,
    private val unitOfWork: UnitOfWork,
    private val timeProvider: TimeProvider
) : ApplicationServiceBase() {

    /**
     * Creates a new workflow with the specified configuration.
     *
     * This operation creates a new Workflow aggregate with the provided name,
     * description, initial status, and allowed status transitions. The workflow
     * is immediately persisted within a transactional boundary.
     *
     * ## Business Rules:
     * - Workflow name must be non-empty and <= 255 characters
     * - Description is optional but limited to 2000 characters if provided
     * - Initial status must be included in the allowed statuses set
     * - Allowed statuses must contain at least the initial status
     * - Workflow ID is auto-generated using UUID v4
     *
     * ## Transactional Guarantees:
     * - Workflow creation is atomic - either fully succeeds or rolls back
     * - Timestamps (createdAt, updatedAt) are set to current time
     * - Transition matrix is validated before persistence
     *
     * @param command Command containing workflow configuration
     * @return WorkflowDto representing the created workflow with generated ID
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if domain rules are violated
     */
    suspend fun createWorkflow(command: CreateWorkflowCommand): WorkflowDto {
        return unitOfWork.execute {
            val workflow = Workflow.create(
                name = command.name,
                description = command.description,
                initialStatus = command.initialStatus,
                allowedStatuses = command.allowedStatuses,
                timeProvider = timeProvider
            )

            workflowRepository.save(workflow)
            WorkflowDto.fromWorkflow(workflow)
        }
    }

    /**
     * Retrieves a workflow by its unique identifier.
     *
     * This is a read-only operation that returns the current state of a workflow
     * including its configuration and allowed transitions. Returns null if the
     * workflow doesn't exist.
     *
     * ## Performance Considerations:
     * - Single database query for workflow data
     * - No transaction overhead for read operation
     * - Efficient status set deserialization
     *
     * @param id The workflow's unique identifier
     * @return WorkflowDto containing workflow data, or null if not found
     */
    suspend fun getWorkflow(id: WorkflowId): WorkflowDto? {
        return workflowRepository.findById(id)?.let { workflow ->
            WorkflowDto.fromWorkflow(workflow)
        }
    }

    /**
     * Updates an existing workflow's metadata.
     *
     * This operation allows updating the workflow's name and/or description.
     * The workflow must exist, and all updates are validated against domain rules
     * before being persisted.
     *
     * ## Business Rules:
     * - Only name and description can be updated (not status configuration)
     * - Name must be non-empty and <= 255 characters if provided
     * - Description is limited to 2000 characters if provided
     * - Updates are applied atomically within a transaction
     *
     * ## Partial Updates:
     * - Null values in the command are ignored (no change)
     * - Empty strings are validated and may be rejected by domain rules
     *
     * @param command Command containing the workflow ID and optional updates
     * @return WorkflowDto representing the updated workflow
     * @throws WorkflowNotFoundException if the workflow doesn't exist
     * @throws io.spiralhouse.cycletime.domain.exceptions.DomainException if validation fails
     */
    suspend fun updateWorkflow(command: UpdateWorkflowCommand): WorkflowDto {
        return unitOfWork.execute {
            val workflow = workflowRepository.findById(command.id)
                ?: throw WorkflowNotFoundException(command.id)

            command.name?.let { workflow.updateName(it) }
            command.description?.let { workflow.updateDescription(it) }

            workflowRepository.save(workflow)
            WorkflowDto.fromWorkflow(workflow)
        }
    }

    /**
     * Deletes a workflow by its unique identifier.
     *
     * This operation is idempotent - deleting a non-existent workflow
     * returns false without error. The operation bypasses transaction
     * overhead as it's a single atomic database operation.
     *
     * ## Important:
     * - Deletion is permanent and cannot be undone
     * - Consider workflow archival for audit trails
     * - Existing issues using this workflow may be affected
     *
     * @param id The workflow's unique identifier
     * @return true if the workflow was deleted, false if it didn't exist
     */
    suspend fun deleteWorkflow(id: WorkflowId): Boolean {
        return workflowRepository.delete(id)
    }

    /**
     * Lists all workflows in the system.
     *
     * Returns all workflows ordered by creation date for consistent iteration.
     * This operation is optimized for small to medium workflow counts typical
     * in project management systems.
     *
     * ## Performance Considerations:
     * - Single database query with eager loading
     * - Results are ordered by creation date
     * - Consider pagination for large datasets
     *
     * @return List of all workflows as DTOs, ordered by creation date
     */
    suspend fun listWorkflows(): List<WorkflowDto> {
        return workflowRepository.findAll().map { workflow ->
            WorkflowDto.fromWorkflow(workflow)
        }
    }


    /**
     * Gets valid transitions from a specific status in a workflow.
     *
     * This query operation returns all statuses that are reachable from the
     * given status according to the workflow's transition rules. This is useful
     * for building dynamic UI elements or validating state changes.
     *
     * ## Use Cases:
     * - Populating status dropdown menus in UI
     * - Pre-validating transitions before attempting them
     * - Building workflow visualization diagrams
     * - Implementing workflow-aware automation
     *
     * @param workflowId The workflow's unique identifier
     * @param fromStatus The current status to check transitions from
     * @return List of statuses that can be transitioned to from the given status
     * @throws WorkflowNotFoundException if the workflow doesn't exist
     */
    suspend fun getValidTransitions(workflowId: WorkflowId, fromStatus: IssueStatus): List<IssueStatus> {
        val workflow = workflowRepository.findById(workflowId)
            ?: throw WorkflowNotFoundException(workflowId)
        
        return workflow.getValidTransitions(fromStatus)
    }

    /**
     * Validates if a specific status transition is allowed in a workflow.
     *
     * This validation operation checks whether a transition from one status to
     * another is permitted by the workflow's configuration. Returns a detailed
     * validation result with error messages if the transition is invalid.
     *
     * ## Validation Rules:
     * - Both statuses must be in the workflow's allowed statuses
     * - The transition must be explicitly permitted by the workflow
     * - Self-transitions are allowed if configured
     *
     * ## Use Cases:
     * - Pre-flight validation before updating issue status
     * - Implementing workflow enforcement in UI
     * - Batch validation of planned transitions
     * - Audit and compliance checking
     *
     * @param workflowId The workflow's unique identifier
     * @param from The current status
     * @param to The target status
     * @return ValidationResult with success flag and optional error message
     * @throws WorkflowNotFoundException if the workflow doesn't exist
     */
    suspend fun validateTransition(workflowId: WorkflowId, from: IssueStatus, to: IssueStatus): ValidationResult {
        val workflow = workflowRepository.findById(workflowId)
            ?: throw WorkflowNotFoundException(workflowId)
        
        return if (workflow.canTransition(from, to)) {
            ValidationResult.valid()
        } else {
            ValidationResult.invalid("Invalid transition from ${from.name} to ${to.name}")
        }
    }

    /**
     * Finds a workflow by its name.
     *
     * This search operation performs a case-sensitive exact match on workflow names.
     * Note that workflow names are not guaranteed to be unique, so this method
     * returns the first match found.
     *
     * ## Performance Note:
     * Currently performs a full table scan. Consider adding an index on the
     * name column if this becomes a frequently used operation.
     *
     * @param name The exact workflow name to search for (case-sensitive)
     * @return WorkflowDto if found, null otherwise
     */
    suspend fun getWorkflowByName(name: String): WorkflowDto? {
        return workflowRepository.findAll()
            .find { it.name == name }
            ?.let { WorkflowDto.fromWorkflow(it) }
    }


    /**
     * Creates a default workflow suitable for most issue types.
     *
     * This factory method creates a general-purpose workflow with the standard
     * TODO → IN_PROGRESS → DONE flow. This workflow is suitable for most
     * task and story tracking scenarios.
     *
     * ## Default Configuration:
     * - Name: "Default Workflow"
     * - Initial Status: TODO
     * - Allowed Transitions:
     *   - TODO → IN_PROGRESS
     *   - IN_PROGRESS → TODO (for re-planning)
     *   - IN_PROGRESS → DONE
     *   - DONE → TODO (for reopening)
     *
     * @return WorkflowDto representing the created default workflow
     */
    suspend fun createDefaultWorkflow(): WorkflowDto {
        return unitOfWork.execute {
            val workflow = Workflow.createDefault(timeProvider)
            workflowRepository.save(workflow)
            WorkflowDto.fromWorkflow(workflow)
        }
    }

    /**
     * Creates a bug workflow optimized for bug tracking.
     *
     * This factory method creates a workflow specifically designed for bug
     * tracking with additional verification and validation states to ensure
     * quality resolution.
     *
     * ## Bug Workflow Configuration:
     * - Name: "Bug Workflow"
     * - Initial Status: TODO
     * - Includes verification states for QA process
     * - Supports reopening from DONE state
     * - Additional states for triage and verification
     *
     * @return WorkflowDto representing the created bug workflow
     */
    suspend fun createBugWorkflow(): WorkflowDto {
        return unitOfWork.execute {
            val workflow = Workflow.createBugWorkflow(timeProvider)
            workflowRepository.save(workflow)
            WorkflowDto.fromWorkflow(workflow)
        }
    }

    /**
     * Creates a feature workflow with mandatory review step.
     *
     * This factory method creates a workflow designed for feature development
     * that enforces a code review process before completion. This ensures all
     * features go through proper review gates.
     *
     * ## Feature Workflow Configuration:
     * - Name: "Feature Workflow"
     * - Initial Status: TODO
     * - Mandatory IN_REVIEW state before DONE
     * - Enforces linear progression through review
     * - Supports sending back from review to IN_PROGRESS
     *
     * ## Transition Flow:
     * - TODO → IN_PROGRESS → IN_REVIEW → DONE
     * - IN_REVIEW → IN_PROGRESS (for rework)
     * - DONE → TODO (for reopening)
     *
     * @return WorkflowDto representing the created feature workflow
     */
    suspend fun createFeatureWorkflow(): WorkflowDto {
        return unitOfWork.execute {
            val workflow = Workflow.createFeatureWorkflow(timeProvider)
            workflowRepository.save(workflow)
            WorkflowDto.fromWorkflow(workflow)
        }
    }
}