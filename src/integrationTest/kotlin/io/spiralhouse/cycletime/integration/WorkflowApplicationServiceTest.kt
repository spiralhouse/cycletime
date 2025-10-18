package io.spiralhouse.cycletime.integration

import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.mockk.*
import io.spiralhouse.cycletime.application.commands.*
import io.spiralhouse.cycletime.application.dto.*
import io.spiralhouse.cycletime.application.exceptions.WorkflowNotFoundException
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.exceptions.DomainException


import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant

/**
 * TDD RED Phase Tests for WorkflowApplicationService
 *
 * These comprehensive tests define the expected behavior of WorkflowApplicationService
 * that orchestrates workflow operations at the application layer. The tests will 
 * initially FAIL because:
 *
 * 1. WorkflowApplicationService implementation returns TODO() for all methods
 * 2. Complex business logic for workflow transitions isn't implemented
 * 3. Transactional behavior with UnitOfWork isn't implemented
 * 4. Predefined workflow creation logic isn't implemented
 *
 * This follows the TDD RED-GREEN-REFACTOR cycle where we first write comprehensive
 * failing tests that define the desired behavior, then implement the minimum code
 * to make them pass.
 *
 * Expected Interface (currently returns TODO()):
 *
 * ```kotlin
 * class WorkflowApplicationService(
 *     private val workflowRepository: ExposedWorkflowRepository,
 *     private val unitOfWork: ExposedUnitOfWork,
 *     private val timeProvider: TimeProvider
 * ) {
 *     // CRUD Operations
 *     suspend fun createWorkflow(command: CreateWorkflowCommand): WorkflowDto
 *     suspend fun getWorkflow(id: WorkflowId): WorkflowDto?
 *     suspend fun updateWorkflow(command: UpdateWorkflowCommand): WorkflowDto
 *     suspend fun deleteWorkflow(id: WorkflowId): Boolean
 *     suspend fun listWorkflows(): List<WorkflowDto>
 *
 *     // Query Operations
 *     suspend fun getValidTransitions(workflowId: WorkflowId, fromStatus: IssueStatus): List<IssueStatus>
 *     suspend fun validateTransition(workflowId: WorkflowId, from: IssueStatus, to: IssueStatus): ValidationResult
 *     suspend fun getWorkflowByName(name: String): WorkflowDto?
 *
 *     // Predefined Workflows
 *     suspend fun createDefaultWorkflow(): WorkflowDto
 *     suspend fun createBugWorkflow(): WorkflowDto  
 *     suspend fun createFeatureWorkflow(): WorkflowDto
 * }
 * ```
 */
class WorkflowApplicationServiceTest : StringSpec({

    lateinit var mockWorkflowRepository: ExposedWorkflowRepository
    lateinit var mockUnitOfWork: ExposedUnitOfWork
    lateinit var mockTimeProvider: MockTimeProvider
    lateinit var workflowApplicationService: WorkflowApplicationService

    beforeEach {
        mockWorkflowRepository = mockk()
        mockUnitOfWork = mockk()
        mockTimeProvider = MockTimeProvider()
        
        workflowApplicationService = WorkflowApplicationService(
            workflowRepository = mockWorkflowRepository,
            unitOfWork = mockUnitOfWork,
            timeProvider = mockTimeProvider
        )

        // Reset time to deterministic value
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterEach {
        clearAllMocks()
    }

    // ================================================================================
    // CRUD Operations - Basic Functionality Tests
    // ================================================================================

    "should create workflow with valid data" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "Test Workflow",
                description = "A test workflow for QA",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.DONE
                )
            )

            val mockWorkflow = mockk<Workflow>()
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Test Workflow"
            every { mockWorkflow.description } returns "A test workflow for QA"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.DONE
            )
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createWorkflow(command)

            result.name shouldBe "Test Workflow"
            result.description shouldBe "A test workflow for QA"
            result.initialStatus shouldBe "TODO"
            result.allowedStatuses shouldContain "TODO"
            result.allowedStatuses shouldContain "IN_PROGRESS"
            result.allowedStatuses shouldContain "DONE"
            result.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    "should get workflow by ID when it exists" {
        runTest {
            val workflowId = WorkflowId.generate()
            val mockWorkflow = mockk<Workflow>()
            
            every { mockWorkflow.id } returns workflowId
            every { mockWorkflow.name } returns "Existing Workflow"
            every { mockWorkflow.description } returns "Description"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockWorkflowRepository.findById(workflowId) } returns mockWorkflow

            val result = workflowApplicationService.getWorkflow(workflowId)

            result shouldNotBe null
            result!!.name shouldBe "Existing Workflow"
            result.description shouldBe "Description"

            coVerify { mockWorkflowRepository.findById(workflowId) }
        }
    }

    "should return null when getting non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()
            
            coEvery { mockWorkflowRepository.findById(nonExistentId) } returns null

            val result = workflowApplicationService.getWorkflow(nonExistentId)

            result shouldBe null

            coVerify { mockWorkflowRepository.findById(nonExistentId) }
        }
    }

    "should update workflow with valid changes" {
        runTest {
            val workflowId = WorkflowId.generate()
            val existingWorkflow = mockk<Workflow>(relaxed = true)
            
            // Configure the existing workflow to properly return updated values after method calls
            every { existingWorkflow.id } returns workflowId
            every { existingWorkflow.name } returns "Updated Workflow"
            every { existingWorkflow.description } returns "Updated description"
            every { existingWorkflow.initialStatus } returns IssueStatus.TODO
            every { existingWorkflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { existingWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { existingWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:30:00Z")

            val command = UpdateWorkflowCommand(
                id = workflowId,
                name = "Updated Workflow",
                description = "Updated description"
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.findById(workflowId) } returns existingWorkflow
            coEvery { mockWorkflowRepository.save(existingWorkflow) } returns existingWorkflow

            mockTimeProvider.advance(kotlin.time.Duration.parse("30m"))

            val result = workflowApplicationService.updateWorkflow(command)

            result.name shouldBe "Updated Workflow"
            result.description shouldBe "Updated description"
            result.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.findById(workflowId) }
            verify { existingWorkflow.updateName("Updated Workflow") }
            verify { existingWorkflow.updateDescription("Updated description") }
            coVerify { mockWorkflowRepository.save(existingWorkflow) }
        }
    }

    "should throw WorkflowNotFoundException when updating non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()
            val command = UpdateWorkflowCommand(
                id = nonExistentId,
                name = "Updated Name"
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.findById(nonExistentId) } returns null

            val exception = shouldThrow<WorkflowNotFoundException> {
                workflowApplicationService.updateWorkflow(command)
            }

            exception.message!! shouldContain nonExistentId.value.toString()

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.findById(nonExistentId) }
        }
    }

    "should delete existing workflow" {
        runTest {
            val workflowId = WorkflowId.generate()

            coEvery { mockWorkflowRepository.delete(workflowId) } returns true

            val result = workflowApplicationService.deleteWorkflow(workflowId)

            result shouldBe true

            coVerify { mockWorkflowRepository.delete(workflowId) }
        }
    }

    "should return false when deleting non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()

            coEvery { mockWorkflowRepository.delete(nonExistentId) } returns false

            val result = workflowApplicationService.deleteWorkflow(nonExistentId)

            result shouldBe false

            coVerify { mockWorkflowRepository.delete(nonExistentId) }
        }
    }

    "should list all workflows" {
        runTest {
            val workflow1 = mockk<Workflow>()
            val workflow2 = mockk<Workflow>()

            every { workflow1.id } returns WorkflowId.generate()
            every { workflow1.name } returns "Workflow 1"
            every { workflow1.description } returns null
            every { workflow1.initialStatus } returns IssueStatus.TODO
            every { workflow1.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { workflow1.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { workflow1.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            every { workflow2.id } returns WorkflowId.generate()
            every { workflow2.name } returns "Workflow 2"
            every { workflow2.description } returns "Second workflow"
            every { workflow2.initialStatus } returns IssueStatus.TODO
            every { workflow2.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            every { workflow2.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { workflow2.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockWorkflowRepository.findAll() } returns listOf(workflow1, workflow2)

            val result = workflowApplicationService.listWorkflows()

            result shouldHaveSize 2
            result.map { it.name } shouldContain "Workflow 1"
            result.map { it.name } shouldContain "Workflow 2"

            coVerify { mockWorkflowRepository.findAll() }
        }
    }

    "should return empty list when no workflows exist" {
        runTest {
            coEvery { mockWorkflowRepository.findAll() } returns emptyList()

            val result = workflowApplicationService.listWorkflows()

            result shouldHaveSize 0

            coVerify { mockWorkflowRepository.findAll() }
        }
    }

    // ================================================================================
    // Workflow Query Operations Tests
    // ================================================================================

    "should get valid transitions for existing workflow and status" {
        runTest {
            val workflowId = WorkflowId.generate()
            val mockWorkflow = mockk<Workflow>()

            every { mockWorkflow.getValidTransitions(IssueStatus.TODO) } returns listOf(
                IssueStatus.IN_PROGRESS,
                IssueStatus.CANCELED
            )

            coEvery { mockWorkflowRepository.findById(workflowId) } returns mockWorkflow

            val result = workflowApplicationService.getValidTransitions(workflowId, IssueStatus.TODO)

            result shouldHaveSize 2
            result shouldContain IssueStatus.IN_PROGRESS
            result shouldContain IssueStatus.CANCELED
            result shouldNotContain IssueStatus.DONE

            coVerify { mockWorkflowRepository.findById(workflowId) }
            verify { mockWorkflow.getValidTransitions(IssueStatus.TODO) }
        }
    }

    "should throw WorkflowNotFoundException when getting transitions for non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()

            coEvery { mockWorkflowRepository.findById(nonExistentId) } returns null

            val exception = shouldThrow<WorkflowNotFoundException> {
                workflowApplicationService.getValidTransitions(nonExistentId, IssueStatus.TODO)
            }

            exception.message!! shouldContain nonExistentId.value.toString()

            coVerify { mockWorkflowRepository.findById(nonExistentId) }
        }
    }

    "should validate valid transition" {
        runTest {
            val workflowId = WorkflowId.generate()
            val mockWorkflow = mockk<Workflow>()

            every { mockWorkflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) } returns true

            coEvery { mockWorkflowRepository.findById(workflowId) } returns mockWorkflow

            val result = workflowApplicationService.validateTransition(
                workflowId,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS
            )

            result.isValid shouldBe true
            result.reason shouldBe null

            coVerify { mockWorkflowRepository.findById(workflowId) }
            verify { mockWorkflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) }
        }
    }

    "should validate invalid transition with reason" {
        runTest {
            val workflowId = WorkflowId.generate()
            val mockWorkflow = mockk<Workflow>()

            every { mockWorkflow.canTransition(IssueStatus.TODO, IssueStatus.DONE) } returns false

            coEvery { mockWorkflowRepository.findById(workflowId) } returns mockWorkflow

            val result = workflowApplicationService.validateTransition(
                workflowId,
                IssueStatus.TODO,
                IssueStatus.DONE
            )

            result.isValid shouldBe false
            result.reason shouldNotBe null
            result.reason!! shouldContain "transition"

            coVerify { mockWorkflowRepository.findById(workflowId) }
            verify { mockWorkflow.canTransition(IssueStatus.TODO, IssueStatus.DONE) }
        }
    }

    "should throw WorkflowNotFoundException when validating transition for non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()

            coEvery { mockWorkflowRepository.findById(nonExistentId) } returns null

            val exception = shouldThrow<WorkflowNotFoundException> {
                workflowApplicationService.validateTransition(
                    nonExistentId,
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS
                )
            }

            exception.message!! shouldContain nonExistentId.value.toString()

            coVerify { mockWorkflowRepository.findById(nonExistentId) }
        }
    }

    "should find workflow by name when it exists" {
        runTest {
            val workflow = mockk<Workflow>()
            
            every { workflow.id } returns WorkflowId.generate()
            every { workflow.name } returns "Bug Workflow"
            every { workflow.description } returns "For tracking bugs"
            every { workflow.initialStatus } returns IssueStatus.TODO
            every { workflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
            every { workflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { workflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockWorkflowRepository.findAll() } returns listOf(workflow)

            val result = workflowApplicationService.getWorkflowByName("Bug Workflow")

            result shouldNotBe null
            result!!.name shouldBe "Bug Workflow"
            result.description shouldBe "For tracking bugs"

            coVerify { mockWorkflowRepository.findAll() }
        }
    }

    "should return null when workflow name not found" {
        runTest {
            val workflow = mockk<Workflow>()
            every { workflow.name } returns "Different Workflow"

            coEvery { mockWorkflowRepository.findAll() } returns listOf(workflow)

            val result = workflowApplicationService.getWorkflowByName("Non-existent Workflow")

            result shouldBe null

            coVerify { mockWorkflowRepository.findAll() }
        }
    }

    // ================================================================================
    // Predefined Workflow Operations Tests
    // ================================================================================

    "should create default workflow with correct configuration" {
        runTest {
            val mockWorkflow = mockk<Workflow>()
            
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Default Workflow"
            every { mockWorkflow.description } returns "Standard workflow for general issues with review step"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createDefaultWorkflow()

            result.name shouldBe "Default Workflow"
            result.description shouldBe "Standard workflow for general issues with review step"
            result.initialStatus shouldBe "TODO"
            result.allowedStatuses shouldContain "TODO"
            result.allowedStatuses shouldContain "IN_PROGRESS"
            result.allowedStatuses shouldContain "IN_REVIEW"
            result.allowedStatuses shouldContain "DONE"
            result.allowedStatuses shouldContain "CANCELED"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    "should create bug workflow with correct configuration" {
        runTest {
            val mockWorkflow = mockk<Workflow>()
            
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Bug Workflow"
            every { mockWorkflow.description } returns "Optimized workflow for bug tracking and resolution"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createBugWorkflow()

            result.name shouldBe "Bug Workflow"
            result.description shouldBe "Optimized workflow for bug tracking and resolution"
            result.initialStatus shouldBe "TODO"
            result.allowedStatuses shouldContain "TODO"
            result.allowedStatuses shouldContain "IN_PROGRESS"
            result.allowedStatuses shouldContain "DONE"
            result.allowedStatuses shouldContain "CANCELED"
            result.allowedStatuses shouldNotContain "IN_REVIEW" // Bug workflow skips review

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    "should create feature workflow with correct configuration" {
        runTest {
            val mockWorkflow = mockk<Workflow>()
            
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Feature Workflow"
            every { mockWorkflow.description } returns "Workflow for feature development with mandatory review step"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createFeatureWorkflow()

            result.name shouldBe "Feature Workflow"
            result.description shouldBe "Workflow for feature development with mandatory review step"
            result.initialStatus shouldBe "TODO"
            result.allowedStatuses shouldContain "TODO"
            result.allowedStatuses shouldContain "IN_PROGRESS"
            result.allowedStatuses shouldContain "IN_REVIEW" // Feature workflow requires review
            result.allowedStatuses shouldContain "DONE"
            result.allowedStatuses shouldContain "CANCELED"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    // ================================================================================
    // Validation and Error Handling Tests
    // ================================================================================

    "should validate workflow creation command" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "", // Invalid - empty name
                description = null,
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }

            val exception = shouldThrow<DomainException> {
                workflowApplicationService.createWorkflow(command)
            }

            exception.message shouldContain "name"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
        }
    }

    "should validate workflow creation with invalid allowed statuses" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "Invalid Workflow",
                description = null,
                initialStatus = IssueStatus.IN_PROGRESS, // Not in allowed statuses
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE) // Missing initial status
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }

            val exception = shouldThrow<DomainException> {
                workflowApplicationService.createWorkflow(command)
            }

            exception.message shouldContain "Initial status"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
        }
    }

    "should validate workflow creation with empty allowed statuses" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "Empty Workflow",
                description = null,
                initialStatus = IssueStatus.TODO,
                allowedStatuses = emptySet() // Invalid - must have at least one status
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }

            val exception = shouldThrow<DomainException> {
                workflowApplicationService.createWorkflow(command)
            }

            exception.message shouldContain "At least one"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
        }
    }

    // ================================================================================
    // Transaction Management Tests
    // ================================================================================

    "should execute create workflow within transaction" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "Transactional Workflow",
                description = null,
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )

            val mockWorkflow = mockk<Workflow>()
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Transactional Workflow"
            every { mockWorkflow.description } returns null
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createWorkflow(command)

            result shouldNotBe null

            // Verify transaction was used
            coVerify(exactly = 1) { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    "should execute update workflow within transaction" {
        runTest {
            val workflowId = WorkflowId.generate()
            val existingWorkflow = mockk<Workflow>(relaxed = true)
            val updatedWorkflow = mockk<Workflow>()

            every { existingWorkflow.id } returns workflowId
            every { updatedWorkflow.id } returns workflowId
            every { updatedWorkflow.name } returns "Updated in Transaction"
            every { updatedWorkflow.description } returns null
            every { updatedWorkflow.initialStatus } returns IssueStatus.TODO
            every { updatedWorkflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { updatedWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { updatedWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            val command = UpdateWorkflowCommand(
                id = workflowId,
                name = "Updated in Transaction"
            )

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.findById(workflowId) } returns existingWorkflow
            coEvery { mockWorkflowRepository.save(existingWorkflow) } returns updatedWorkflow

            val result = workflowApplicationService.updateWorkflow(command)

            result shouldNotBe null

            // Verify transaction was used
            coVerify(exactly = 1) { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.findById(workflowId) }
            coVerify { mockWorkflowRepository.save(existingWorkflow) }
        }
    }

    "should rollback transaction on workflow creation failure" {
        runTest {
            val command = CreateWorkflowCommand(
                name = "Failing Workflow",
                description = null,
                initialStatus = IssueStatus.TODO,
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )

            // Simulate repository failure
            val repositoryException = RuntimeException("Database connection failed")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } throws repositoryException

            val exception = shouldThrow<RuntimeException> {
                workflowApplicationService.createWorkflow(command)
            }

            exception.message shouldBe "Database connection failed"

            // Verify transaction was attempted but failed
            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    // ================================================================================
    // Edge Cases and Complex Scenarios
    // ================================================================================

    "should handle concurrent workflow updates gracefully" {
        runTest {
            val workflowId = WorkflowId.generate()
            val workflow = mockk<Workflow>(relaxed = true)

            every { workflow.id } returns workflowId
            every { workflow.name } returns "Concurrent Workflow"
            every { workflow.description } returns null
            every { workflow.initialStatus } returns IssueStatus.TODO
            every { workflow.allowedStatuses } returns setOf(IssueStatus.TODO, IssueStatus.DONE)
            every { workflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { workflow.updatedAt } returns Instant.parse("2025-01-15T10:01:00Z")

            val command1 = UpdateWorkflowCommand(id = workflowId, name = "Update 1")
            val command2 = UpdateWorkflowCommand(id = workflowId, name = "Update 2")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.findById(workflowId) } returns workflow
            coEvery { mockWorkflowRepository.save(workflow) } returns workflow

            // Both updates should succeed (last one wins in this implementation)
            val result1 = workflowApplicationService.updateWorkflow(command1)
            val result2 = workflowApplicationService.updateWorkflow(command2)

            result1 shouldNotBe null
            result2 shouldNotBe null

            // Verify both transactions were executed
            coVerify(exactly = 2) { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify(exactly = 2) { mockWorkflowRepository.findById(workflowId) }
            coVerify(exactly = 2) { mockWorkflowRepository.save(workflow) }
        }
    }

    "should handle workflow with maximum allowed statuses" {
        runTest {
            val allStatuses = IssueStatus.entries.toSet()
            val command = CreateWorkflowCommand(
                name = "Maximum Workflow",
                description = "Workflow with all possible statuses",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = allStatuses
            )

            val mockWorkflow = mockk<Workflow>()
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Maximum Workflow"
            every { mockWorkflow.description } returns "Workflow with all possible statuses"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns allStatuses
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createWorkflow(command)

            result shouldNotBe null
            result.allowedStatuses shouldHaveSize allStatuses.size

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }

    "should handle workflow with single allowed status" {
        runTest {
            val singleStatus = setOf(IssueStatus.TODO)
            val command = CreateWorkflowCommand(
                name = "Minimal Workflow",
                description = "Workflow with only TODO status",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = singleStatus
            )

            val mockWorkflow = mockk<Workflow>()
            every { mockWorkflow.id } returns WorkflowId.generate()
            every { mockWorkflow.name } returns "Minimal Workflow"
            every { mockWorkflow.description } returns "Workflow with only TODO status"
            every { mockWorkflow.initialStatus } returns IssueStatus.TODO
            every { mockWorkflow.allowedStatuses } returns singleStatus
            every { mockWorkflow.createdAt } returns Instant.parse("2025-01-15T10:00:00Z")
            every { mockWorkflow.updatedAt } returns Instant.parse("2025-01-15T10:00:00Z")

            coEvery { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) } coAnswers {
                val block = firstArg<suspend () -> WorkflowDto>()
                block()
            }
            coEvery { mockWorkflowRepository.save(any()) } returns mockWorkflow

            val result = workflowApplicationService.createWorkflow(command)

            result shouldNotBe null
            result.allowedStatuses shouldHaveSize 1
            result.allowedStatuses shouldContain "TODO"

            coVerify { mockUnitOfWork.execute(any<suspend () -> WorkflowDto>()) }
            coVerify { mockWorkflowRepository.save(any()) }
        }
    }
})