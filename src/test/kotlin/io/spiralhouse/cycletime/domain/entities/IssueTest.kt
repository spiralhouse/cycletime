package io.spiralhouse.cycletime.domain.entities

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.kotest.matchers.types.shouldBeInstanceOf
import io.spiralhouse.cycletime.domain.DomainConstants
import io.spiralhouse.cycletime.domain.exceptions.DomainException
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import kotlinx.datetime.Instant
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * TDD Tests for Issue Domain Entity - RED-GREEN-REFACTOR
 *
 * Following TDD methodology to define and verify Issue entity behavior.
 * Tests drive the implementation of hierarchy support, status transitions,
 * estimation rules, and business logic encapsulation.
 *
 * Requirements being tested:
 * 1. Epic → Story → Subtask hierarchy with validation
 * 2. Status transitions with business rules
 * 3. Estimation rules enforcement
 * 4. Parent-child relationship management
 * 5. Time tracking with testable TimeProvider injection
 */
class IssueTest : DescribeSpec({

    describe("Issue Entity") {
        val mockTimeProvider = MockTimeProvider()

        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        }

        describe("creation and validation") {

            it("should create issue with valid data") {
                val issue = Issue.create(
                    title = "Test Issue",
                    description = "Test Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.id shouldNotBe null
                issue.id.shouldBeInstanceOf<IssueId>()
                issue.title shouldBe "Test Issue"
                issue.description shouldBe "Test Description"
                issue.type shouldBe IssueType.STORY
                issue.status shouldBe IssueStatus.TODO
                issue.parentId shouldBe null
                issue.projectId shouldBe null
                issue.estimate shouldBe Estimate.none()
                issue.assigneeId shouldBe null
                issue.dependencies.shouldBeEmpty()
                issue.blockedBy.shouldBeEmpty()
                issue.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }

            it("should generate unique IssueId on creation") {
                val issue1 = Issue.create(
                    title = "Issue 1",
                    description = "Description 1",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val issue2 = Issue.create(
                    title = "Issue 2", 
                    description = "Description 2",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue1.id shouldNotBe issue2.id
                issue1.id.value.length shouldBe DomainConstants.UUID_STRING_LENGTH
                issue2.id.value.length shouldBe DomainConstants.UUID_STRING_LENGTH
            }

            it("should set initial status to TODO") {
                val issue = Issue.create(
                    title = "New Issue",
                    description = "Should start as TODO",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.status shouldBe IssueStatus.TODO
            }

            it("should reject empty title") {
                shouldThrow<DomainException> {
                    Issue.create(
                        title = "",
                        description = "Valid Description",
                        type = IssueType.STORY,
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "title cannot be empty"
            }

            it("should reject blank title with only whitespace") {
                shouldThrow<DomainException> {
                    Issue.create(
                        title = "   ",
                        description = "Valid Description", 
                        type = IssueType.STORY,
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "title cannot be empty"
            }

            it("should reject title longer than 255 characters") {
                val longTitle = "a".repeat(256)

                shouldThrow<DomainException> {
                    Issue.create(
                        title = longTitle,
                        description = "Valid Description",
                        type = IssueType.STORY,
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "title cannot exceed 255 characters"
            }

            it("should accept title exactly 255 characters") {
                val maxLengthTitle = "a".repeat(255)

                val issue = Issue.create(
                    title = maxLengthTitle,
                    description = "Valid Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.title shouldBe maxLengthTitle
            }

            it("should accept null description") {
                val issue = Issue.create(
                    title = "Valid Title",
                    description = null,
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.description shouldBe null
            }

            it("should use injected TimeProvider for timestamps") {
                val fixedTime = Instant.parse("2025-03-15T14:30:00Z")
                mockTimeProvider.setTime(fixedTime)

                val issue = Issue.create(
                    title = "Time Test Issue",
                    description = "Testing time injection",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.createdAt shouldBe fixedTime
                issue.updatedAt shouldBe fixedTime
            }
        }

        describe("hierarchy validation") {

            it("should allow creating Epic without parent") {
                val epic = Issue.create(
                    title = "Epic Issue",
                    description = "Top-level epic",
                    type = IssueType.EPIC,
                    timeProvider = mockTimeProvider
                )

                epic.type shouldBe IssueType.EPIC
                epic.parentId shouldBe null
            }

            it("should prevent Epics from having parents") {
                val parentEpic = Issue.create(
                    title = "Parent Epic",
                    description = "Parent",
                    type = IssueType.EPIC,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    Issue.create(
                        title = "Child Epic",
                        description = "Should not be allowed",
                        type = IssueType.EPIC,
                        parentId = parentEpic.id,
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "Epics cannot have parents"
            }

            it("should allow Story with Epic parent") {
                val epic = Issue.create(
                    title = "Parent Epic",
                    description = "Epic parent",
                    type = IssueType.EPIC,
                    timeProvider = mockTimeProvider
                )

                val story = Issue.create(
                    title = "Child Story",
                    description = "Story under epic",
                    type = IssueType.STORY,
                    parentId = epic.id,
                    timeProvider = mockTimeProvider
                )

                story.type shouldBe IssueType.STORY
                story.parentId shouldBe epic.id
            }

            it("should allow Subtask with Story parent") {
                val story = Issue.create(
                    title = "Parent Story",
                    description = "Story parent",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val subtask = Issue.create(
                    title = "Child Subtask",
                    description = "Subtask under story",
                    type = IssueType.SUBTASK,
                    parentId = story.id,
                    timeProvider = mockTimeProvider
                )

                subtask.type shouldBe IssueType.SUBTASK
                subtask.parentId shouldBe story.id
            }
        }

        describe("status transitions") {

            it("should transition from TODO to IN_PROGRESS") {
                val issue = Issue.create(
                    title = "Test Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(15.minutes)
                issue.updateStatus(IssueStatus.IN_PROGRESS)

                issue.status shouldBe IssueStatus.IN_PROGRESS
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:15:00Z")
            }

            it("should transition from IN_PROGRESS to DONE through IN_REVIEW") {
                val issue = Issue.create(
                    title = "Test Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.updateStatus(IssueStatus.IN_PROGRESS)
                mockTimeProvider.advance(20.minutes)
                issue.updateStatus(IssueStatus.IN_REVIEW)
                mockTimeProvider.advance(10.minutes)
                issue.updateStatus(IssueStatus.DONE)

                issue.status shouldBe IssueStatus.DONE
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")
            }

            it("should prevent invalid status transitions") {
                val issue = Issue.create(
                    title = "Test Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                // Try invalid transition (depends on IssueStatus implementation)
                shouldThrow<DomainException> {
                    issue.updateStatus(IssueStatus.DONE) // Skip IN_PROGRESS
                }.message shouldContain "Cannot transition"
            }
        }

        describe("estimation rules") {

            it("should prevent Epics from having estimates") {
                val epic = Issue.create(
                    title = "Epic Issue",
                    description = "Epic",
                    type = IssueType.EPIC,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    epic.setEstimate(Estimate.of(5))
                }.message shouldContain "Epics cannot have estimates"
            }

            it("should require Subtasks to have estimates") {
                val subtask = Issue.create(
                    title = "Subtask Issue",
                    description = "Subtask",
                    type = IssueType.SUBTASK,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    subtask.setEstimate(Estimate.none())
                }.message shouldContain "Subtasks must have estimates"
            }

            it("should allow Stories to have estimates") {
                val story = Issue.create(
                    title = "Story Issue",
                    description = "Story",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                story.setEstimate(Estimate.of(3))

                story.estimate shouldBe Estimate.of(3)
            }

            it("should update timestamp when setting estimate") {
                val story = Issue.create(
                    title = "Story Issue",
                    description = "Story",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(1.hours)
                story.setEstimate(Estimate.of(5))

                story.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
            }
        }

        describe("issue updates") {

            it("should update title") {
                val issue = Issue.create(
                    title = "Original Title",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(30.minutes)
                issue.updateTitle("Updated Title")

                issue.title shouldBe "Updated Title"
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")
            }

            it("should reject empty title when updating") {
                val issue = Issue.create(
                    title = "Valid Title",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    issue.updateTitle("")
                }.message shouldContain "title cannot be empty"

                // Original title should be preserved
                issue.title shouldBe "Valid Title"
            }

            it("should update description") {
                val issue = Issue.create(
                    title = "Issue Title",
                    description = "Original Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(15.minutes)
                issue.updateDescription("Updated Description")

                issue.description shouldBe "Updated Description"
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:15:00Z")
            }

            it("should allow setting description to null") {
                val issue = Issue.create(
                    title = "Issue Title",
                    description = "Original Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.updateDescription(null)

                issue.description shouldBe null
            }

            it("should update assignee") {
                val issue = Issue.create(
                    title = "Issue Title",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(45.minutes)
                issue.updateAssignee("user123")

                issue.assigneeId shouldBe "user123"
                issue.updatedAt shouldBe Instant.parse("2025-01-15T10:45:00Z")
            }
        }

        describe("dependency management") {

            it("should add dependencies") {
                val issue = Issue.create(
                    title = "Main Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val dependencyId = IssueId.generate()
                issue.addDependency(dependencyId)

                issue.dependencies shouldContain dependencyId
                issue.hasDependencies() shouldBe true
            }

            it("should prevent self-dependencies") {
                val issue = Issue.create(
                    title = "Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    issue.addDependency(issue.id)
                }.message shouldContain "cannot depend on itself"
            }

            it("should prevent duplicate dependencies") {
                val issue = Issue.create(
                    title = "Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val dependencyId = IssueId.generate()
                issue.addDependency(dependencyId)

                shouldThrow<DomainException> {
                    issue.addDependency(dependencyId)
                }.message shouldContain "Dependency already exists"
            }

            it("should remove dependencies") {
                val issue = Issue.create(
                    title = "Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val dependencyId = IssueId.generate()
                issue.addDependency(dependencyId)
                issue.removeDependency(dependencyId)

                issue.dependencies shouldNotContain dependencyId
                issue.hasDependencies() shouldBe false
            }

            it("should manage blocked by relationships") {
                val issue = Issue.create(
                    title = "Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val blockerId = IssueId.generate()
                issue.addBlockedBy(blockerId)

                issue.blockedBy shouldContain blockerId
                issue.isBlocked() shouldBe true
            }

            it("should prevent self-blocking") {
                val issue = Issue.create(
                    title = "Issue",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    issue.addBlockedBy(issue.id)
                }.message shouldContain "cannot be blocked by itself"
            }
        }

        describe("business rules") {

            it("should determine if issue can be estimated") {
                val epic = Issue.create("Epic", null, IssueType.EPIC, timeProvider = mockTimeProvider)
                val story = Issue.create("Story", null, IssueType.STORY, timeProvider = mockTimeProvider)
                val subtask = Issue.create("Subtask", null, IssueType.SUBTASK, timeProvider = mockTimeProvider)

                epic.canBeEstimated() shouldBe false
                story.canBeEstimated() shouldBe true
                subtask.canBeEstimated() shouldBe true
            }

            it("should validate hierarchy rules") {
                val issue = Issue.create(
                    title = "Story",
                    description = "Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                // Should not throw for valid parent type
                issue.validateHierarchy(IssueType.EPIC)

                // Should throw for invalid parent type (depends on IssueType implementation)
                // This test drives the implementation of hierarchy validation rules
            }
        }

        describe("snapshot and factory patterns") {

            it("should support factory pattern for creation") {
                val issue = Issue.create(
                    title = "Factory Test",
                    description = "Testing factory pattern",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                issue.shouldBeInstanceOf<Issue>()
                issue.id.shouldBeInstanceOf<IssueId>()
                issue.status shouldBe IssueStatus.TODO
            }

            it("should support snapshot pattern for reconstitution") {
                val originalIssue = Issue.create(
                    title = "Original Issue",
                    description = "Original Description",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                // Add some complexity to make it interesting
                originalIssue.addDependency(IssueId.generate())
                originalIssue.setEstimate(Estimate.of(3))
                originalIssue.updateStatus(IssueStatus.IN_PROGRESS)

                // Create snapshot
                val snapshot = originalIssue.toSnapshot()

                // Reconstitute from snapshot
                val reconstitutedIssue = Issue.fromSnapshot(
                    snapshot = snapshot,
                    timeProvider = mockTimeProvider
                )

                // Verify all data is preserved
                reconstitutedIssue.id shouldBe originalIssue.id
                reconstitutedIssue.title shouldBe originalIssue.title
                reconstitutedIssue.description shouldBe originalIssue.description
                reconstitutedIssue.type shouldBe originalIssue.type
                reconstitutedIssue.status shouldBe originalIssue.status
                reconstitutedIssue.estimate shouldBe originalIssue.estimate
                reconstitutedIssue.dependencies shouldBe originalIssue.dependencies
                reconstitutedIssue.createdAt shouldBe originalIssue.createdAt
                reconstitutedIssue.updatedAt shouldBe originalIssue.updatedAt
            }

            it("should maintain immutability of snapshots") {
                val issue = Issue.create(
                    title = "Snapshot Test",
                    description = "Testing immutability",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val snapshot1 = issue.toSnapshot()

                // Modify issue
                issue.updateTitle("Modified Title")

                val snapshot2 = issue.toSnapshot()

                // Original snapshot should be unchanged
                snapshot1.title shouldBe "Snapshot Test"
                snapshot2.title shouldBe "Modified Title"
                snapshot1 shouldNotBe snapshot2
            }
        }

        describe("edge cases and error conditions") {

            it("should handle null TimeProvider gracefully") {
                shouldThrow<IllegalArgumentException> {
                    Issue.create(
                        title = "Test Issue",
                        description = "Description",
                        type = IssueType.STORY,
                        timeProvider = null as TimeProvider?
                    )
                }.message shouldContain "TimeProvider cannot be null"
            }

            it("should maintain data integrity during exceptions") {
                val issue = Issue.create(
                    title = "Exception Test",
                    description = "Testing exception handling",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val originalTitle = issue.title
                val originalUpdateTime = issue.updatedAt

                // Attempt invalid operation
                shouldThrow<DomainException> {
                    issue.updateTitle("")
                }

                // State should be unchanged after exception
                issue.title shouldBe originalTitle
                issue.updatedAt shouldBe originalUpdateTime
            }

            it("should handle complex dependency scenarios") {
                val issue = Issue.create(
                    title = "Complex Dependencies Test",
                    description = "Testing complex scenarios",
                    type = IssueType.STORY,
                    timeProvider = mockTimeProvider
                )

                val dep1 = IssueId.generate()
                val dep2 = IssueId.generate()
                val blocker1 = IssueId.generate()
                val blocker2 = IssueId.generate()

                // Add multiple dependencies and blockers
                issue.addDependency(dep1)
                issue.addDependency(dep2)
                issue.addBlockedBy(blocker1)
                issue.addBlockedBy(blocker2)

                issue.dependencies shouldHaveSize 2
                issue.blockedBy shouldHaveSize 2
                issue.hasDependencies() shouldBe true
                issue.isBlocked() shouldBe true

                // Remove some
                issue.removeDependency(dep1)
                issue.removeBlockedBy(blocker1)

                issue.dependencies shouldHaveSize 1
                issue.dependencies shouldContain dep2
                issue.blockedBy shouldHaveSize 1
                issue.blockedBy shouldContain blocker2
            }
        }
    }
})