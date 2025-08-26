package io.spiralhouse.cycletime.domain.entities

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
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
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * TDD Tests for Project Domain Entity - RED PHASE
 *
 * These tests define the required behavior for the Project entity following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 *
 * Requirements being tested:
 * 1. Creation and Validation
 * 2. Business Logic (issue management, archiving)
 * 3. Value Objects integration
 * 4. Time tracking with TimeProvider injection
 */
class ProjectTest : DescribeSpec({

    describe("Project Entity") {
        val mockTimeProvider = MockTimeProvider()

        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        }

        describe("creation and validation") {

            it("should create project with valid data") {
                // RED: Test will fail initially until proper factory method implementation
                val project = Project.create(
                    name = "Test Project",
                    description = "Test Description",
                    timeProvider = mockTimeProvider
                )

                // Drive implementation requirements
                project.id shouldNotBe null
                project.id.shouldBeInstanceOf<ProjectId>()
                project.name shouldBe "Test Project"
                project.description shouldBe "Test Description"
                project.status shouldBe ProjectStatus.ACTIVE
                project.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                project.issues.shouldBeEmpty()
                project.issueCount shouldBe 0
            }

            it("should generate unique ProjectId on creation") {
                val project1 = Project.create(
                    name = "Project 1",
                    description = "Description 1",
                    timeProvider = mockTimeProvider
                )

                val project2 = Project.create(
                    name = "Project 2",
                    description = "Description 2",
                    timeProvider = mockTimeProvider
                )

                project1.id shouldNotBe project2.id
                project1.id.value.length shouldBe 36 // UUID format
                project2.id.value.length shouldBe 36 // UUID format
            }

            it("should set initial status to ACTIVE") {
                val project = Project.create(
                    name = "Active Project",
                    description = "Should start active",
                    timeProvider = mockTimeProvider
                )

                project.status shouldBe ProjectStatus.ACTIVE
            }

            it("should reject empty name") {
                // RED: Test validation requirements
                shouldThrow<DomainException> {
                    Project.create(
                        name = "",
                        description = "Valid Description",
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "name cannot be empty"
            }

            it("should reject blank name with only whitespace") {
                shouldThrow<DomainException> {
                    Project.create(
                        name = "   ",
                        description = "Valid Description",
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "name cannot be empty"
            }

            it("should reject name longer than 255 characters") {
                val longName = "a".repeat(256)

                shouldThrow<DomainException> {
                    Project.create(
                        name = longName,
                        description = "Valid Description",
                        timeProvider = mockTimeProvider
                    )
                }.message shouldContain "name cannot exceed 255 characters"
            }

            it("should accept name exactly 255 characters") {
                val maxLengthName = "a".repeat(255)

                val project = Project.create(
                    name = maxLengthName,
                    description = "Valid Description",
                    timeProvider = mockTimeProvider
                )

                project.name shouldBe maxLengthName
            }

            it("should accept null description") {
                val project = Project.create(
                    name = "Valid Name",
                    description = null,
                    timeProvider = mockTimeProvider
                )

                project.description shouldBe null
            }

            it("should use injected TimeProvider for timestamps") {
                val fixedTime = Instant.parse("2025-03-15T14:30:00Z")
                mockTimeProvider.setTime(fixedTime)

                val project = Project.create(
                    name = "Time Test Project",
                    description = "Testing time injection",
                    timeProvider = mockTimeProvider
                )

                project.createdAt shouldBe fixedTime
                project.updatedAt shouldBe fixedTime
            }
        }

        describe("adding issues to project") {

            it("should add issue to active project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val issueId = IssueId.generate()
                project.addIssue(issueId)

                project.issues shouldContain issueId
                project.issueCount shouldBe 1
            }

            it("should maintain issue list with multiple issues") {
                val project = Project.create(
                    name = "Multi Issue Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val issue1 = IssueId.generate()
                val issue2 = IssueId.generate()
                val issue3 = IssueId.generate()

                project.addIssue(issue1)
                project.addIssue(issue2)
                project.addIssue(issue3)

                project.issues shouldHaveSize 3
                project.issues shouldContain issue1
                project.issues shouldContain issue2
                project.issues shouldContain issue3
                project.issueCount shouldBe 3
            }

            it("should not add duplicate issues") {
                val project = Project.create(
                    name = "Duplicate Test",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val issueId = IssueId.generate()
                project.addIssue(issueId)

                shouldThrow<DomainException> {
                    project.addIssue(issueId)
                }.message shouldContain "already exists"

                project.issueCount shouldBe 1
            }

            it("should not add issue to archived project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                project.archive()

                shouldThrow<DomainException> {
                    project.addIssue(IssueId.generate())
                }.message shouldContain "Cannot add issues to archived project"
            }

            it("should not add issue to completed project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                project.complete()

                shouldThrow<DomainException> {
                    project.addIssue(IssueId.generate())
                }.message shouldContain "Cannot add issues to completed project"
            }

            it("should update timestamp when issue is added") {
                val project = Project.create(
                    name = "Time Tracking Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val originalTime = project.updatedAt

                // Advance time by 1 hour
                mockTimeProvider.advance(1.hours)

                project.addIssue(IssueId.generate())

                project.updatedAt shouldNotBe originalTime
                project.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
            }
        }

        describe("business logic operations") {

            it("should update project name") {
                val project = Project.create(
                    name = "Original Name",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                // Advance time to track update
                mockTimeProvider.advance(30.minutes)

                project.updateName("Updated Name")

                project.name shouldBe "Updated Name"
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:30:00Z")
            }

            it("should reject empty name when updating") {
                val project = Project.create(
                    name = "Valid Name",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                shouldThrow<DomainException> {
                    project.updateName("")
                }.message shouldContain "name cannot be empty"

                // Original name should be preserved
                project.name shouldBe "Valid Name"
            }

            it("should reject long name when updating") {
                val project = Project.create(
                    name = "Valid Name",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val longName = "a".repeat(256)

                shouldThrow<DomainException> {
                    project.updateName(longName)
                }.message shouldContain "name cannot exceed 255 characters"

                // Original name should be preserved
                project.name shouldBe "Valid Name"
            }

            it("should update project description") {
                val project = Project.create(
                    name = "Project Name",
                    description = "Original Description",
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(15.minutes)

                project.updateDescription("Updated Description")

                project.description shouldBe "Updated Description"
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:15:00Z")
            }

            it("should allow setting description to null") {
                val project = Project.create(
                    name = "Project Name",
                    description = "Original Description",
                    timeProvider = mockTimeProvider
                )

                project.updateDescription(null)

                project.description shouldBe null
            }

            it("should archive project when no active issues") {
                val project = Project.create(
                    name = "Archivable Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(2.hours)

                project.archive()

                project.status shouldBe ProjectStatus.ARCHIVED
                project.updatedAt shouldBe Instant.parse("2025-01-15T12:00:00Z")
            }

            it("should complete project when no active issues") {
                val project = Project.create(
                    name = "Completable Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                mockTimeProvider.advance(3.hours)

                project.complete()

                project.status shouldBe ProjectStatus.COMPLETED
                project.updatedAt shouldBe Instant.parse("2025-01-15T13:00:00Z")
            }
        }

        describe("time tracking") {

            it("should track creation timestamp using injected TimeProvider") {
                val specificTime = Instant.parse("2025-06-01T09:15:30Z")
                mockTimeProvider.setTime(specificTime)

                val project = Project.create(
                    name = "Time Test",
                    description = "Testing time tracking",
                    timeProvider = mockTimeProvider
                )

                project.createdAt shouldBe specificTime
                project.updatedAt shouldBe specificTime
            }

            it("should update timestamp when modified") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )

                val originalTime = project.updatedAt

                // Advance time by 45 minutes
                mockTimeProvider.advance(45.minutes)

                project.updateName("Modified Name")

                project.updatedAt shouldNotBe originalTime
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:45:00Z")
                project.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z") // Should remain unchanged
            }

            it("should update timestamp for any modification operation") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Original",
                    timeProvider = mockTimeProvider
                )

                // Test description update
                mockTimeProvider.advance(10.minutes)
                project.updateDescription("Updated description")
                val descriptionUpdateTime = project.updatedAt

                // Test adding issue
                mockTimeProvider.advance(10.minutes)
                project.addIssue(IssueId.generate())
                val issueAddTime = project.updatedAt

                // Test archiving
                mockTimeProvider.advance(10.minutes)
                project.archive()
                val archiveTime = project.updatedAt

                // Verify each operation updated the timestamp
                descriptionUpdateTime shouldBe Instant.parse("2025-01-15T10:10:00Z")
                issueAddTime shouldBe Instant.parse("2025-01-15T10:20:00Z")
                archiveTime shouldBe Instant.parse("2025-01-15T10:30:00Z")
            }
        }

        describe("snapshot and factory patterns") {

            it("should support factory pattern for creation") {
                // Test that factory method exists and works correctly
                val project = Project.create(
                    name = "Factory Test",
                    description = "Testing factory pattern",
                    timeProvider = mockTimeProvider
                )

                project.shouldBeInstanceOf<Project>()
                project.id.shouldBeInstanceOf<ProjectId>()
                project.status shouldBe ProjectStatus.ACTIVE
            }

            it("should support snapshot pattern for reconstitution") {
                // RED: This will fail until snapshot pattern is implemented
                val originalProject = Project.create(
                    name = "Original Project",
                    description = "Original Description",
                    timeProvider = mockTimeProvider
                )

                // Add some issues to make it interesting
                originalProject.addIssue(IssueId.generate())
                originalProject.addIssue(IssueId.generate())

                // Create snapshot
                val snapshot = originalProject.toSnapshot()

                // Reconstitute from snapshot
                val reconstitutedProject = Project.fromSnapshot(
                    snapshot = snapshot,
                    timeProvider = mockTimeProvider
                )

                // Verify all data is preserved
                reconstitutedProject.id shouldBe originalProject.id
                reconstitutedProject.name shouldBe originalProject.name
                reconstitutedProject.description shouldBe originalProject.description
                reconstitutedProject.status shouldBe originalProject.status
                reconstitutedProject.issueCount shouldBe originalProject.issueCount
                reconstitutedProject.createdAt shouldBe originalProject.createdAt
                reconstitutedProject.updatedAt shouldBe originalProject.updatedAt
            }

            it("should maintain immutability of snapshots") {
                val project = Project.create(
                    name = "Snapshot Test",
                    description = "Testing immutability",
                    timeProvider = mockTimeProvider
                )

                val snapshot1 = project.toSnapshot()

                // Modify project
                project.updateName("Modified Name")

                val snapshot2 = project.toSnapshot()

                // Original snapshot should be unchanged
                snapshot1.name shouldBe "Snapshot Test"
                snapshot2.name shouldBe "Modified Name"
                snapshot1 shouldNotBe snapshot2
            }
        }

        describe("edge cases and error conditions") {

            it("should handle concurrent-like operations correctly") {
                val project = Project.create(
                    name = "Concurrent Test",
                    description = "Testing concurrent operations",
                    timeProvider = mockTimeProvider
                )

                // Simulate rapid operations
                val issue1 = IssueId.generate()
                val issue2 = IssueId.generate()

                mockTimeProvider.advance(1.minutes)
                project.addIssue(issue1)

                mockTimeProvider.advance(1.minutes)
                project.addIssue(issue2)

                mockTimeProvider.advance(1.minutes)
                project.updateName("Updated Name")

                // Verify final state is consistent
                project.issueCount shouldBe 2
                project.name shouldBe "Updated Name"
                project.updatedAt shouldBe Instant.parse("2025-01-15T10:03:00Z")
            }

            it("should maintain data integrity during exceptions") {
                val project = Project.create(
                    name = "Exception Test",
                    description = "Testing exception handling",
                    timeProvider = mockTimeProvider
                )

                val originalName = project.name
                val originalUpdateTime = project.updatedAt

                // Attempt invalid operation
                shouldThrow<DomainException> {
                    project.updateName("")
                }

                // State should be unchanged after exception
                project.name shouldBe originalName
                project.updatedAt shouldBe originalUpdateTime
            }

            it("should handle null TimeProvider gracefully") {
                // RED: This test will drive defensive programming
                shouldThrow<IllegalArgumentException> {
                    Project.create(
                        name = "Test Project",
                        description = "Description",
                        timeProvider = null as TimeProvider?
                    )
                }.message shouldContain "TimeProvider cannot be null"
            }
        }
    }
})
