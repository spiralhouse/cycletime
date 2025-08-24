package io.spiralhouse.cycletime.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain

/**
 * TDD Tests for ProjectStatus Value Object - RED PHASE
 *
 * These tests define the required behavior for ProjectStatus value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 *
 * Requirements being tested:
 * 1. Status enumeration with proper values
 * 2. String serialization and deserialization
 * 3. Status transitions and validation
 * 4. Equality and comparison behavior
 */
class ProjectStatusTest : DescribeSpec({

    describe("ProjectStatus Value Object") {

        describe("status enumeration") {

            it("should define ACTIVE status") {
                val status = ProjectStatus.ACTIVE

                status.value shouldBe "active"
                status.toString() shouldBe "active"
            }

            it("should define ARCHIVED status") {
                val status = ProjectStatus.ARCHIVED

                status.value shouldBe "archived"
                status.toString() shouldBe "archived"
            }

            it("should define COMPLETED status") {
                val status = ProjectStatus.COMPLETED

                status.value shouldBe "completed"
                status.toString() shouldBe "completed"
            }

            it("should provide all possible values") {
                val allValues = ProjectStatus.values()

                allValues shouldContainExactly arrayOf(
                    ProjectStatus.ACTIVE,
                    ProjectStatus.COMPLETED,
                    ProjectStatus.ARCHIVED
                )
            }

            it("should maintain consistent value representation") {
                ProjectStatus.ACTIVE.value shouldBe "active"
                ProjectStatus.ARCHIVED.value shouldBe "archived"
                ProjectStatus.COMPLETED.value shouldBe "completed"
            }
        }

        describe("string conversion") {

            it("should parse ACTIVE from string") {
                val status = ProjectStatus.fromString("active")
                status shouldBe ProjectStatus.ACTIVE
            }

            it("should parse ARCHIVED from string") {
                val status = ProjectStatus.fromString("archived")
                status shouldBe ProjectStatus.ARCHIVED
            }

            it("should parse COMPLETED from string") {
                val status = ProjectStatus.fromString("completed")
                status shouldBe ProjectStatus.COMPLETED
            }

            it("should parse case-insensitively") {
                ProjectStatus.fromString("ACTIVE") shouldBe ProjectStatus.ACTIVE
                ProjectStatus.fromString("Active") shouldBe ProjectStatus.ACTIVE
                ProjectStatus.fromString("AcTiVe") shouldBe ProjectStatus.ACTIVE

                ProjectStatus.fromString("ARCHIVED") shouldBe ProjectStatus.ARCHIVED
                ProjectStatus.fromString("Archived") shouldBe ProjectStatus.ARCHIVED

                ProjectStatus.fromString("COMPLETED") shouldBe ProjectStatus.COMPLETED
                ProjectStatus.fromString("Completed") shouldBe ProjectStatus.COMPLETED
            }

            it("should handle whitespace in input") {
                ProjectStatus.fromString(" active ") shouldBe ProjectStatus.ACTIVE
                ProjectStatus.fromString("\tarchived\n") shouldBe ProjectStatus.ARCHIVED
                ProjectStatus.fromString("  completed  ") shouldBe ProjectStatus.COMPLETED
            }

            it("should reject unknown status strings") {
                val invalidStatuses = listOf(
                    "unknown",
                    "invalid",
                    "pending",
                    "in_progress",
                    "draft",
                    "",
                    "   "
                )

                invalidStatuses.forEach { invalidStatus ->
                    shouldThrow<IllegalArgumentException> {
                        ProjectStatus.fromString(invalidStatus)
                    }.message shouldContain "Unknown project status"
                }
            }

            it("should reject null input") {
                shouldThrow<IllegalArgumentException> {
                    ProjectStatus.fromString(null as String?)
                }.message shouldContain "Status cannot be null"
            }

            it("should provide helpful error messages") {
                val exception = shouldThrow<IllegalArgumentException> {
                    ProjectStatus.fromString("invalid_status")
                }

                exception.message shouldContain "Unknown project status: invalid_status"
                exception.message shouldContain "valid values"
                exception.message shouldContain "active, archived, completed"
            }
        }

        describe("status transitions") {

            it("should allow transition from ACTIVE to ARCHIVED") {
                val canTransition = ProjectStatus.ACTIVE.canTransitionTo(ProjectStatus.ARCHIVED)
                canTransition shouldBe true
            }

            it("should allow transition from ACTIVE to COMPLETED") {
                val canTransition = ProjectStatus.ACTIVE.canTransitionTo(ProjectStatus.COMPLETED)
                canTransition shouldBe true
            }

            it("should not allow transition from ARCHIVED to ACTIVE") {
                val canTransition = ProjectStatus.ARCHIVED.canTransitionTo(ProjectStatus.ACTIVE)
                canTransition shouldBe false
            }

            it("should not allow transition from COMPLETED to ACTIVE") {
                val canTransition = ProjectStatus.COMPLETED.canTransitionTo(ProjectStatus.ACTIVE)
                canTransition shouldBe false
            }

            it("should not allow transition from ARCHIVED to COMPLETED") {
                val canTransition = ProjectStatus.ARCHIVED.canTransitionTo(ProjectStatus.COMPLETED)
                canTransition shouldBe false
            }

            it("should not allow transition from COMPLETED to ARCHIVED") {
                val canTransition = ProjectStatus.COMPLETED.canTransitionTo(ProjectStatus.ARCHIVED)
                canTransition shouldBe false
            }

            it("should allow staying in same status") {
                ProjectStatus.ACTIVE.canTransitionTo(ProjectStatus.ACTIVE) shouldBe true
                ProjectStatus.ARCHIVED.canTransitionTo(ProjectStatus.ARCHIVED) shouldBe true
                ProjectStatus.COMPLETED.canTransitionTo(ProjectStatus.COMPLETED) shouldBe true
            }

            it("should provide valid transition targets") {
                val activeTransitions = ProjectStatus.ACTIVE.validTransitions()
                activeTransitions shouldContainExactly listOf(
                    ProjectStatus.ACTIVE,
                    ProjectStatus.ARCHIVED,
                    ProjectStatus.COMPLETED
                )

                val archivedTransitions = ProjectStatus.ARCHIVED.validTransitions()
                archivedTransitions shouldContainExactly listOf(ProjectStatus.ARCHIVED)

                val completedTransitions = ProjectStatus.COMPLETED.validTransitions()
                completedTransitions shouldContainExactly listOf(ProjectStatus.COMPLETED)
            }
        }

        describe("status properties") {

            it("should identify active status") {
                ProjectStatus.ACTIVE.isActive shouldBe true
                ProjectStatus.ARCHIVED.isActive shouldBe false
                ProjectStatus.COMPLETED.isActive shouldBe false
            }

            it("should identify final statuses") {
                ProjectStatus.ACTIVE.isFinal shouldBe false
                ProjectStatus.ARCHIVED.isFinal shouldBe true
                ProjectStatus.COMPLETED.isFinal shouldBe true
            }

            it("should identify terminal statuses") {
                ProjectStatus.ACTIVE.isTerminal shouldBe false
                ProjectStatus.ARCHIVED.isTerminal shouldBe true
                ProjectStatus.COMPLETED.isTerminal shouldBe true
            }

            it("should allow modifications only for active status") {
                ProjectStatus.ACTIVE.allowsModification shouldBe true
                ProjectStatus.ARCHIVED.allowsModification shouldBe false
                ProjectStatus.COMPLETED.allowsModification shouldBe false
            }

            it("should determine work completion") {
                ProjectStatus.ACTIVE.isWorkCompleted shouldBe false
                ProjectStatus.ARCHIVED.isWorkCompleted shouldBe false // Archived != completed work
                ProjectStatus.COMPLETED.isWorkCompleted shouldBe true
            }
        }

        describe("equality and comparison") {

            it("should be equal to itself") {
                ProjectStatus.ACTIVE shouldBe ProjectStatus.ACTIVE
                ProjectStatus.ARCHIVED shouldBe ProjectStatus.ARCHIVED
                ProjectStatus.COMPLETED shouldBe ProjectStatus.COMPLETED
            }

            it("should not be equal to different statuses") {
                ProjectStatus.ACTIVE shouldNotBe ProjectStatus.ARCHIVED
                ProjectStatus.ACTIVE shouldNotBe ProjectStatus.COMPLETED
                ProjectStatus.ARCHIVED shouldNotBe ProjectStatus.COMPLETED
            }

            it("should have consistent hash codes") {
                val activeHash1 = ProjectStatus.ACTIVE.hashCode()
                val activeHash2 = ProjectStatus.ACTIVE.hashCode()
                activeHash1 shouldBe activeHash2

                val archivedHash = ProjectStatus.ARCHIVED.hashCode()
                val completedHash = ProjectStatus.COMPLETED.hashCode()

                activeHash1 shouldNotBe archivedHash
                activeHash1 shouldNotBe completedHash
                archivedHash shouldNotBe completedHash
            }

            it("should maintain equality after serialization") {
                val originalStatus = ProjectStatus.ACTIVE
                val serialized = originalStatus.value
                val deserialized = ProjectStatus.fromString(serialized)

                deserialized shouldBe originalStatus
            }
        }

        describe("serialization") {

            it("should serialize to correct string values") {
                ProjectStatus.ACTIVE.value shouldBe "active"
                ProjectStatus.ARCHIVED.value shouldBe "archived"
                ProjectStatus.COMPLETED.value shouldBe "completed"
            }

            it("should deserialize from correct string values") {
                ProjectStatus.fromString("active") shouldBe ProjectStatus.ACTIVE
                ProjectStatus.fromString("archived") shouldBe ProjectStatus.ARCHIVED
                ProjectStatus.fromString("completed") shouldBe ProjectStatus.COMPLETED
            }

            it("should maintain roundtrip consistency") {
                val statuses = listOf(
                    ProjectStatus.ACTIVE,
                    ProjectStatus.ARCHIVED,
                    ProjectStatus.COMPLETED
                )

                statuses.forEach { originalStatus ->
                    val serialized = originalStatus.value
                    val deserialized = ProjectStatus.fromString(serialized)
                    deserialized shouldBe originalStatus
                }
            }

            it("should produce consistent toString output") {
                ProjectStatus.ACTIVE.toString() shouldBe "active"
                ProjectStatus.ARCHIVED.toString() shouldBe "archived"
                ProjectStatus.COMPLETED.toString() shouldBe "completed"
            }
        }

        describe("validation") {

            it("should validate status transitions") {
                shouldThrow<IllegalStateException> {
                    ProjectStatus.ARCHIVED.validateTransitionTo(ProjectStatus.ACTIVE)
                }.message shouldContain "Invalid transition from archived to active"

                shouldThrow<IllegalStateException> {
                    ProjectStatus.COMPLETED.validateTransitionTo(ProjectStatus.ACTIVE)
                }.message shouldContain "Invalid transition from completed to active"
            }

            it("should allow valid transitions without exceptions") {
                // These should not throw
                ProjectStatus.ACTIVE.validateTransitionTo(ProjectStatus.ARCHIVED)
                ProjectStatus.ACTIVE.validateTransitionTo(ProjectStatus.COMPLETED)
                ProjectStatus.ACTIVE.validateTransitionTo(ProjectStatus.ACTIVE)
                ProjectStatus.ARCHIVED.validateTransitionTo(ProjectStatus.ARCHIVED)
                ProjectStatus.COMPLETED.validateTransitionTo(ProjectStatus.COMPLETED)
            }
        }

        describe("metadata") {

            it("should provide human-readable descriptions") {
                ProjectStatus.ACTIVE.description shouldBe "Project is active and accepting new work"
                ProjectStatus.ARCHIVED.description shouldBe "Project has been archived and is read-only"
                ProjectStatus.COMPLETED.description shouldBe "Project work has been completed successfully"
            }

            it("should provide display names") {
                ProjectStatus.ACTIVE.displayName shouldBe "Active"
                ProjectStatus.ARCHIVED.displayName shouldBe "Archived"
                ProjectStatus.COMPLETED.displayName shouldBe "Completed"
            }

            it("should provide sort order") {
                val statuses = listOf(
                    ProjectStatus.COMPLETED,
                    ProjectStatus.ACTIVE,
                    ProjectStatus.ARCHIVED
                )

                val sorted = statuses.sortedBy { it.sortOrder }

                sorted shouldContainExactly listOf(
                    ProjectStatus.ACTIVE,      // sortOrder: 1
                    ProjectStatus.COMPLETED,   // sortOrder: 2
                    ProjectStatus.ARCHIVED     // sortOrder: 3
                )
            }
        }

        describe("edge cases") {

            it("should handle status creation in different ways") {
                // All these should create the same status
                val status1 = ProjectStatus.ACTIVE
                val status2 = ProjectStatus.fromString("active")
                val status3 = ProjectStatus.values().first { it.value == "active" }

                status1 shouldBe status2
                status2 shouldBe status3
                status1 shouldBe status3
            }

            it("should handle concurrent access safely") {
                // Status objects should be immutable and thread-safe
                val results = (1..1000).map {
                    ProjectStatus.fromString("active")
                }.toSet()

                // All should reference the same instance
                results.size shouldBe 1
                results.first() shouldBe ProjectStatus.ACTIVE
            }
        }
    }
})
