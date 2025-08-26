package io.spiralhouse.cycletime.domain.entities

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.minutes

/**
 * TDD Tests for Workflow Domain Entity - RED-GREEN-REFACTOR
 *
 * Following TDD methodology to define and verify Workflow entity behavior.
 * The Workflow entity manages state transitions for issues with predefined 
 * workflows and transition validation rules.
 *
 * Requirements being tested:
 * 1. State machine for managing issue state transitions
 * 2. Predefined workflows (Default, Bug, Feature)
 * 3. Transition validation rules
 * 4. Terminal state handling
 * 5. Factory methods for standard workflows
 */
class WorkflowTest : DescribeSpec({

    describe("Workflow Entity") {
        val mockTimeProvider = MockTimeProvider()

        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        }

        describe("creation and validation") {

            it("should create workflow with valid data") {
                val workflow = Workflow.create(
                    name = "Test Workflow",
                    description = "Test workflow description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                workflow.id shouldNotBe null
                workflow.id.shouldBeInstanceOf<WorkflowId>()
                workflow.name shouldBe "Test Workflow"
                workflow.description shouldBe "Test workflow description"
                workflow.initialStatus shouldBe IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.IN_PROGRESS
                workflow.allowedStatuses shouldContain IssueStatus.DONE
                workflow.terminalStatuses shouldContain IssueStatus.DONE
                workflow.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                workflow.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }

            it("should generate unique WorkflowId on creation") {
                val workflow1 = Workflow.create(
                    name = "Workflow 1",
                    description = "Description 1",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                val workflow2 = Workflow.create(
                    name = "Workflow 2",
                    description = "Description 2", 
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                workflow1.id shouldNotBe workflow2.id
            }

            it("should reject empty name") {
                shouldThrow<DomainException> {
                    Workflow.create(
                        name = "",
                        description = "Valid Description",
                        initialStatus = IssueStatus.TODO,
                        allowedStatuses = setOf(IssueStatus.TODO),
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "name cannot be empty"
            }

            it("should reject name longer than 255 characters") {
                val longName = "a".repeat(256)

                shouldThrow<DomainException> {
                    Workflow.create(
                        name = longName,
                        description = "Valid Description",
                        initialStatus = IssueStatus.TODO,
                        allowedStatuses = setOf(IssueStatus.TODO),
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "name cannot exceed 255 characters"
            }

            it("should require initial status to be in allowed statuses") {
                shouldThrow<DomainException> {
                    Workflow.create(
                        name = "Test Workflow",
                        description = "Description",
                        initialStatus = IssueStatus.IN_PROGRESS,
                        allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "Initial status must be in allowed statuses"
            }

            it("should require at least one allowed status") {
                shouldThrow<DomainException> {
                    Workflow.create(
                        name = "Test Workflow",
                        description = "Description",
                        initialStatus = IssueStatus.TODO,
                        allowedStatuses = emptySet(),
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "At least one status must be allowed"
            }

            it("should use injected TimeProvider for timestamps") {
                val fixedTime = Instant.parse("2025-03-15T14:30:00Z")
                mockTimeProvider.setTime(fixedTime)

                val workflow = Workflow.create(
                    name = "Time Test Workflow",
                    description = "Testing time injection",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO),
                    timeProvider = mockTimeProvider
                )

                workflow.createdAt shouldBe fixedTime
                workflow.updatedAt shouldBe fixedTime
            }
        }

        describe("transition validation") {

            it("should allow valid transitions") {
                val workflow = Workflow.create(
                    name = "Standard Workflow",
                    description = "Standard workflow",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                workflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
                workflow.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.DONE) shouldBe true
            }

            it("should reject transitions to disallowed statuses") {
                val workflow = Workflow.create(
                    name = "Limited Workflow", 
                    description = "Limited workflow",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE), // No IN_PROGRESS
                    timeProvider = mockTimeProvider
                )

                workflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe false
            }

            it("should validate transitions using IssueStatus rules") {
                val workflow = Workflow.create(
                    name = "Validation Workflow",
                    description = "Workflow with validation",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                // Valid transition according to IssueStatus rules
                workflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
                
                // Invalid direct transition (must go through IN_PROGRESS)
                workflow.canTransition(IssueStatus.TODO, IssueStatus.DONE) shouldBe false
            }

            it("should get valid transitions from a status") {
                val workflow = Workflow.create(
                    name = "Full Workflow",
                    description = "Full workflow",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW, IssueStatus.DONE, IssueStatus.CANCELED),
                    timeProvider = mockTimeProvider
                )

                val validTransitions = workflow.getValidTransitions(IssueStatus.TODO)
                validTransitions shouldContain IssueStatus.IN_PROGRESS
                validTransitions shouldContain IssueStatus.CANCELED
                validTransitions.size shouldBe 2
            }

            it("should validate transition and throw exception for invalid transitions") {
                val workflow = Workflow.create(
                    name = "Strict Workflow",
                    description = "Strict workflow",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    workflow.validateTransition(IssueStatus.TODO, IssueStatus.DONE)
                }.message shouldContain "Invalid transition"
            }
        }

        describe("terminal status handling") {

            it("should identify terminal statuses") {
                val workflow = Workflow.create(
                    name = "Terminal Test Workflow",
                    description = "Testing terminal statuses",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE, IssueStatus.CANCELED),
                    timeProvider = mockTimeProvider
                )

                workflow.terminalStatuses shouldContain IssueStatus.DONE
                workflow.isTerminalStatus(IssueStatus.DONE) shouldBe true
                workflow.isTerminalStatus(IssueStatus.IN_PROGRESS) shouldBe false
            }

            it("should prevent transitions from terminal statuses") {
                val workflow = Workflow.create(
                    name = "Terminal Workflow",
                    description = "Terminal workflow",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                workflow.canTransition(IssueStatus.DONE, IssueStatus.TODO) shouldBe false
                workflow.getValidTransitions(IssueStatus.DONE).shouldBeEmpty()
            }
        }

        describe("predefined workflow factories") {

            it("should create default workflow") {
                val workflow = Workflow.createDefault(mockTimeProvider)

                workflow.name shouldBe "Default Workflow"
                workflow.initialStatus shouldBe IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.IN_PROGRESS
                workflow.allowedStatuses shouldContain IssueStatus.IN_REVIEW
                workflow.allowedStatuses shouldContain IssueStatus.DONE
                workflow.allowedStatuses shouldContain IssueStatus.CANCELED
            }

            it("should create bug workflow") {
                val workflow = Workflow.createBugWorkflow(mockTimeProvider)

                workflow.name shouldBe "Bug Workflow"
                workflow.initialStatus shouldBe IssueStatus.TODO
                workflow.description shouldContain "bug"
                // Bug workflow should have specific statuses for bug lifecycle
                workflow.allowedStatuses shouldContain IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.IN_PROGRESS
                workflow.allowedStatuses shouldContain IssueStatus.DONE
                workflow.allowedStatuses shouldContain IssueStatus.CANCELED
            }

            it("should create feature workflow") {
                val workflow = Workflow.createFeatureWorkflow(mockTimeProvider)

                workflow.name shouldBe "Feature Workflow"
                workflow.initialStatus shouldBe IssueStatus.TODO
                workflow.description shouldContain "feature"
                // Feature workflow should have review step
                workflow.allowedStatuses shouldContain IssueStatus.TODO
                workflow.allowedStatuses shouldContain IssueStatus.IN_PROGRESS
                workflow.allowedStatuses shouldContain IssueStatus.IN_REVIEW
                workflow.allowedStatuses shouldContain IssueStatus.DONE
                workflow.allowedStatuses shouldContain IssueStatus.CANCELED
            }

            it("should create workflows with correct transition rules") {
                val defaultWorkflow = Workflow.createDefault(mockTimeProvider)
                val bugWorkflow = Workflow.createBugWorkflow(mockTimeProvider)
                val featureWorkflow = Workflow.createFeatureWorkflow(mockTimeProvider)

                // All workflows should allow basic progression
                defaultWorkflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
                bugWorkflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
                featureWorkflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true

                // Feature workflow should require review
                featureWorkflow.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW) shouldBe true
                featureWorkflow.canTransition(IssueStatus.IN_REVIEW, IssueStatus.DONE) shouldBe true
            }
        }

        describe("workflow updates") {

            it("should update workflow name") {
                val workflow = Workflow.create(
                    name = "Original Name",
                    description = "Description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(30.minutes)
                workflow.updateName("Updated Name")

                workflow.name shouldBe "Updated Name"
                workflow.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")
            }

            it("should reject empty name when updating") {
                val workflow = Workflow.create(
                    name = "Valid Name",
                    description = "Description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    workflow.updateName("")
                }.message shouldContain "name cannot be empty"

                // Original name should be preserved
                workflow.name shouldBe "Valid Name"
            }

            it("should update workflow description") {
                val workflow = Workflow.create(
                    name = "Workflow Name",
                    description = "Original Description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(15.minutes)
                workflow.updateDescription("Updated Description")

                workflow.description shouldBe "Updated Description"
                workflow.updatedAt shouldBe Instant.parse("2025-01-15T10:15:00Z")
            }

            it("should allow setting description to null") {
                val workflow = Workflow.create(
                    name = "Workflow Name",
                    description = "Original Description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                workflow.updateDescription(null)

                workflow.description shouldBe null
            }
        }

        describe("snapshot and factory patterns") {

            it("should support snapshot pattern for reconstitution") {
                val originalWorkflow = Workflow.create(
                    name = "Original Workflow",
                    description = "Original Description",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                // Create snapshot
                val snapshot = originalWorkflow.toSnapshot()

                // Reconstitute from snapshot
                val reconstitutedWorkflow = Workflow.fromSnapshot(
                    snapshot = snapshot,
                    timeProvider = mockTimeProvider
                )

                // Verify all data is preserved
                reconstitutedWorkflow.id shouldBe originalWorkflow.id
                reconstitutedWorkflow.name shouldBe originalWorkflow.name
                reconstitutedWorkflow.description shouldBe originalWorkflow.description
                reconstitutedWorkflow.initialStatus shouldBe originalWorkflow.initialStatus
                reconstitutedWorkflow.allowedStatuses shouldBe originalWorkflow.allowedStatuses
                reconstitutedWorkflow.createdAt shouldBe originalWorkflow.createdAt
                reconstitutedWorkflow.updatedAt shouldBe originalWorkflow.updatedAt
            }

            it("should maintain immutability of snapshots") {
                val workflow = Workflow.create(
                    name = "Snapshot Test",
                    description = "Testing immutability",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                val snapshot1 = workflow.toSnapshot()

                // Modify workflow
                workflow.updateName("Modified Name")

                val snapshot2 = workflow.toSnapshot()

                // Original snapshot should be unchanged
                snapshot1.name shouldBe "Snapshot Test"
                snapshot2.name shouldBe "Modified Name"
                snapshot1 shouldNotBe snapshot2
            }
        }

        describe("edge cases and error conditions") {

            it("should handle null TimeProvider gracefully") {
                shouldThrow<IllegalArgumentException> {
                    Workflow.create(
                        name = "Test Workflow",
                        description = "Description",
                        initialStatus = IssueStatus.TODO,
                        allowedStatuses = setOf(IssueStatus.TODO),
                        timeProvider = null as TimeProvider?
                    )
                }.message shouldContain "TimeProvider cannot be null"
            }

            it("should maintain data integrity during exceptions") {
                val workflow = Workflow.create(
                    name = "Exception Test",
                    description = "Testing exception handling",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE),
                    timeProvider = mockTimeProvider
                )

                val originalName = workflow.name
                val originalUpdateTime = workflow.updatedAt

                // Attempt invalid operation
                shouldThrow<DomainException> {
                    workflow.updateName("")
                }

                // State should be unchanged after exception
                workflow.name shouldBe originalName
                workflow.updatedAt shouldBe originalUpdateTime
            }

            it("should handle complex workflow scenarios") {
                val workflow = Workflow.create(
                    name = "Complex Workflow",
                    description = "Testing complex scenarios",
                    initialStatus = IssueStatus.TODO,
                    allowedStatuses = setOf(
                        IssueStatus.TODO, 
                        IssueStatus.IN_PROGRESS, 
                        IssueStatus.IN_REVIEW, 
                        IssueStatus.DONE, 
                        IssueStatus.CANCELED
                    ),
                    timeProvider = mockTimeProvider
                )

                // Test multiple transition paths
                workflow.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
                workflow.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW) shouldBe true
                workflow.canTransition(IssueStatus.IN_REVIEW, IssueStatus.DONE) shouldBe true

                // Test cancellation from any status
                workflow.canTransition(IssueStatus.TODO, IssueStatus.CANCELED) shouldBe true
                workflow.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.CANCELED) shouldBe true
                workflow.canTransition(IssueStatus.IN_REVIEW, IssueStatus.CANCELED) shouldBe true

                // Test that DONE is terminal
                workflow.getValidTransitions(IssueStatus.DONE).shouldBeEmpty()
                workflow.isTerminalStatus(IssueStatus.DONE) shouldBe true
            }
        }
    }
})