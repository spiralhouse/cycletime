package io.spiralhouse.cycletime.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.string.shouldContain

/**
 * TDD Tests for IssueStatus Value Object - RED PHASE
 *
 * These tests define the required behavior for IssueStatus enum following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 *
 * Requirements being tested:
 * 1. Enum values (TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELED)
 * 2. Status transition validation
 * 3. String representation and parsing
 * 4. Status categories and properties
 */
class IssueStatusTest : DescribeSpec({

    describe("IssueStatus Enum") {

        describe("enum values") {

            it("should have TODO value") {
                val todo = IssueStatus.TODO

                todo.name shouldBe "TODO"
                todo.toString() shouldBe "TODO"
            }

            it("should have IN_PROGRESS value") {
                val inProgress = IssueStatus.IN_PROGRESS

                inProgress.name shouldBe "IN_PROGRESS"
                inProgress.toString() shouldBe "IN_PROGRESS"
            }

            it("should have IN_REVIEW value") {
                val inReview = IssueStatus.IN_REVIEW

                inReview.name shouldBe "IN_REVIEW"
                inReview.toString() shouldBe "IN_REVIEW"
            }

            it("should have DONE value") {
                val done = IssueStatus.DONE

                done.name shouldBe "DONE"
                done.toString() shouldBe "DONE"
            }

            it("should have CANCELED value") {
                val canceled = IssueStatus.CANCELED

                canceled.name shouldBe "CANCELED"
                canceled.toString() shouldBe "CANCELED"
            }

            it("should have exactly five values") {
                val allValues = IssueStatus.values()

                allValues shouldHaveSize 5
                allValues shouldContain IssueStatus.TODO
                allValues shouldContain IssueStatus.IN_PROGRESS
                allValues shouldContain IssueStatus.IN_REVIEW
                allValues shouldContain IssueStatus.DONE
                allValues shouldContain IssueStatus.CANCELED
            }
        }

        describe("status transitions") {

            it("should allow valid transitions from TODO") {
                val validTransitions = IssueStatus.TODO.getValidTransitions()

                validTransitions shouldContain IssueStatus.IN_PROGRESS
                validTransitions shouldContain IssueStatus.CANCELED
                validTransitions shouldNotContain IssueStatus.IN_REVIEW
                validTransitions shouldNotContain IssueStatus.DONE
                validTransitions shouldNotContain IssueStatus.TODO
            }

            it("should allow valid transitions from IN_PROGRESS") {
                val validTransitions = IssueStatus.IN_PROGRESS.getValidTransitions()

                validTransitions shouldContain IssueStatus.IN_REVIEW
                validTransitions shouldContain IssueStatus.TODO
                validTransitions shouldContain IssueStatus.CANCELED
                validTransitions shouldNotContain IssueStatus.DONE
                validTransitions shouldNotContain IssueStatus.IN_PROGRESS
            }

            it("should allow valid transitions from IN_REVIEW") {
                val validTransitions = IssueStatus.IN_REVIEW.getValidTransitions()

                validTransitions shouldContain IssueStatus.DONE
                validTransitions shouldContain IssueStatus.IN_PROGRESS
                validTransitions shouldContain IssueStatus.CANCELED
                validTransitions shouldNotContain IssueStatus.TODO
                validTransitions shouldNotContain IssueStatus.IN_REVIEW
            }

            it("should allow no transitions from DONE") {
                val validTransitions = IssueStatus.DONE.getValidTransitions()

                validTransitions shouldHaveSize 0
            }

            it("should allow limited transitions from CANCELED") {
                val validTransitions = IssueStatus.CANCELED.getValidTransitions()

                validTransitions shouldContain IssueStatus.TODO // Reopen
                validTransitions shouldNotContain IssueStatus.IN_PROGRESS
                validTransitions shouldNotContain IssueStatus.IN_REVIEW
                validTransitions shouldNotContain IssueStatus.DONE
                validTransitions shouldNotContain IssueStatus.CANCELED
            }

            it("should validate transition possibilities") {
                // TODO transitions
                IssueStatus.TODO.canTransitionTo(IssueStatus.IN_PROGRESS) shouldBe true
                IssueStatus.TODO.canTransitionTo(IssueStatus.CANCELED) shouldBe true
                IssueStatus.TODO.canTransitionTo(IssueStatus.IN_REVIEW) shouldBe false
                IssueStatus.TODO.canTransitionTo(IssueStatus.DONE) shouldBe false
                IssueStatus.TODO.canTransitionTo(IssueStatus.TODO) shouldBe false

                // IN_PROGRESS transitions
                IssueStatus.IN_PROGRESS.canTransitionTo(IssueStatus.IN_REVIEW) shouldBe true
                IssueStatus.IN_PROGRESS.canTransitionTo(IssueStatus.TODO) shouldBe true
                IssueStatus.IN_PROGRESS.canTransitionTo(IssueStatus.CANCELED) shouldBe true
                IssueStatus.IN_PROGRESS.canTransitionTo(IssueStatus.DONE) shouldBe false
                IssueStatus.IN_PROGRESS.canTransitionTo(IssueStatus.IN_PROGRESS) shouldBe false

                // IN_REVIEW transitions
                IssueStatus.IN_REVIEW.canTransitionTo(IssueStatus.DONE) shouldBe true
                IssueStatus.IN_REVIEW.canTransitionTo(IssueStatus.IN_PROGRESS) shouldBe true
                IssueStatus.IN_REVIEW.canTransitionTo(IssueStatus.CANCELED) shouldBe true
                IssueStatus.IN_REVIEW.canTransitionTo(IssueStatus.TODO) shouldBe false
                IssueStatus.IN_REVIEW.canTransitionTo(IssueStatus.IN_REVIEW) shouldBe false

                // DONE transitions (none allowed)
                IssueStatus.DONE.canTransitionTo(IssueStatus.TODO) shouldBe false
                IssueStatus.DONE.canTransitionTo(IssueStatus.IN_PROGRESS) shouldBe false
                IssueStatus.DONE.canTransitionTo(IssueStatus.IN_REVIEW) shouldBe false
                IssueStatus.DONE.canTransitionTo(IssueStatus.CANCELED) shouldBe false
                IssueStatus.DONE.canTransitionTo(IssueStatus.DONE) shouldBe false

                // CANCELED transitions (only reopen to TODO)
                IssueStatus.CANCELED.canTransitionTo(IssueStatus.TODO) shouldBe true
                IssueStatus.CANCELED.canTransitionTo(IssueStatus.IN_PROGRESS) shouldBe false
                IssueStatus.CANCELED.canTransitionTo(IssueStatus.IN_REVIEW) shouldBe false
                IssueStatus.CANCELED.canTransitionTo(IssueStatus.DONE) shouldBe false
                IssueStatus.CANCELED.canTransitionTo(IssueStatus.CANCELED) shouldBe false
            }
        }

        describe("status categories") {

            it("should identify active statuses") {
                IssueStatus.TODO.isActive() shouldBe true
                IssueStatus.IN_PROGRESS.isActive() shouldBe true
                IssueStatus.IN_REVIEW.isActive() shouldBe true
                IssueStatus.DONE.isActive() shouldBe false
                IssueStatus.CANCELED.isActive() shouldBe false
            }

            it("should identify completed statuses") {
                IssueStatus.TODO.isCompleted() shouldBe false
                IssueStatus.IN_PROGRESS.isCompleted() shouldBe false
                IssueStatus.IN_REVIEW.isCompleted() shouldBe false
                IssueStatus.DONE.isCompleted() shouldBe true
                IssueStatus.CANCELED.isCompleted() shouldBe false
            }

            it("should identify terminal statuses") {
                IssueStatus.TODO.isTerminal() shouldBe false
                IssueStatus.IN_PROGRESS.isTerminal() shouldBe false
                IssueStatus.IN_REVIEW.isTerminal() shouldBe false
                IssueStatus.DONE.isTerminal() shouldBe true
                IssueStatus.CANCELED.isTerminal() shouldBe false // Can be reopened
            }

            it("should identify work-in-progress statuses") {
                IssueStatus.TODO.isInProgress() shouldBe false
                IssueStatus.IN_PROGRESS.isInProgress() shouldBe true
                IssueStatus.IN_REVIEW.isInProgress() shouldBe true
                IssueStatus.DONE.isInProgress() shouldBe false
                IssueStatus.CANCELED.isInProgress() shouldBe false
            }

            it("should identify blocked statuses") {
                IssueStatus.TODO.isBlocked() shouldBe false
                IssueStatus.IN_PROGRESS.isBlocked() shouldBe false
                IssueStatus.IN_REVIEW.isBlocked() shouldBe false
                IssueStatus.DONE.isBlocked() shouldBe false
                IssueStatus.CANCELED.isBlocked() shouldBe true
            }
        }

        describe("status properties") {

            it("should have display names") {
                IssueStatus.TODO.getDisplayName() shouldBe "To Do"
                IssueStatus.IN_PROGRESS.getDisplayName() shouldBe "In Progress"
                IssueStatus.IN_REVIEW.getDisplayName() shouldBe "In Review"
                IssueStatus.DONE.getDisplayName() shouldBe "Done"
                IssueStatus.CANCELED.getDisplayName() shouldBe "Canceled"
            }

            it("should have descriptions") {
                IssueStatus.TODO.getDescription() shouldContain "not started"
                IssueStatus.IN_PROGRESS.getDescription() shouldContain "being worked"
                IssueStatus.IN_REVIEW.getDescription() shouldContain "review"
                IssueStatus.DONE.getDescription() shouldContain "completed"
                IssueStatus.CANCELED.getDescription() shouldContain "canceled"
            }

            it("should have color codes") {
                IssueStatus.TODO.getColor() shouldBe "#6B7280" // Gray
                IssueStatus.IN_PROGRESS.getColor() shouldBe "#3B82F6" // Blue
                IssueStatus.IN_REVIEW.getColor() shouldBe "#F59E0B" // Amber
                IssueStatus.DONE.getColor() shouldBe "#10B981" // Green
                IssueStatus.CANCELED.getColor() shouldBe "#EF4444" // Red
            }

            it("should have priority ordering") {
                IssueStatus.TODO.getPriority() shouldBe 1
                IssueStatus.IN_PROGRESS.getPriority() shouldBe 2
                IssueStatus.IN_REVIEW.getPriority() shouldBe 3
                IssueStatus.DONE.getPriority() shouldBe 4
                IssueStatus.CANCELED.getPriority() shouldBe 0 // Lowest priority
            }
        }

        describe("string parsing") {

            it("should parse from string (case-insensitive)") {
                IssueStatus.fromString("TODO") shouldBe IssueStatus.TODO
                IssueStatus.fromString("todo") shouldBe IssueStatus.TODO
                IssueStatus.fromString("Todo") shouldBe IssueStatus.TODO

                IssueStatus.fromString("IN_PROGRESS") shouldBe IssueStatus.IN_PROGRESS
                IssueStatus.fromString("in_progress") shouldBe IssueStatus.IN_PROGRESS
                IssueStatus.fromString("In_Progress") shouldBe IssueStatus.IN_PROGRESS

                IssueStatus.fromString("IN_REVIEW") shouldBe IssueStatus.IN_REVIEW
                IssueStatus.fromString("in_review") shouldBe IssueStatus.IN_REVIEW

                IssueStatus.fromString("DONE") shouldBe IssueStatus.DONE
                IssueStatus.fromString("done") shouldBe IssueStatus.DONE

                IssueStatus.fromString("CANCELED") shouldBe IssueStatus.CANCELED
                IssueStatus.fromString("canceled") shouldBe IssueStatus.CANCELED
            }

            it("should parse alternative string formats") {
                // Support alternative formats
                IssueStatus.fromString("To Do") shouldBe IssueStatus.TODO
                IssueStatus.fromString("to-do") shouldBe IssueStatus.TODO
                IssueStatus.fromString("backlog") shouldBe IssueStatus.TODO

                IssueStatus.fromString("In Progress") shouldBe IssueStatus.IN_PROGRESS
                IssueStatus.fromString("in-progress") shouldBe IssueStatus.IN_PROGRESS
                IssueStatus.fromString("working") shouldBe IssueStatus.IN_PROGRESS

                IssueStatus.fromString("In Review") shouldBe IssueStatus.IN_REVIEW
                IssueStatus.fromString("in-review") shouldBe IssueStatus.IN_REVIEW
                IssueStatus.fromString("review") shouldBe IssueStatus.IN_REVIEW

                IssueStatus.fromString("complete") shouldBe IssueStatus.DONE
                IssueStatus.fromString("finished") shouldBe IssueStatus.DONE
                IssueStatus.fromString("closed") shouldBe IssueStatus.DONE

                IssueStatus.fromString("cancelled") shouldBe IssueStatus.CANCELED // British spelling
                IssueStatus.fromString("rejected") shouldBe IssueStatus.CANCELED
            }

            it("should reject invalid string values") {
                shouldThrow<IllegalArgumentException> {
                    IssueStatus.fromString("INVALID")
                }.message shouldContain "Invalid IssueStatus"

                shouldThrow<IllegalArgumentException> {
                    IssueStatus.fromString("pending")
                }.message shouldContain "Invalid IssueStatus"

                shouldThrow<IllegalArgumentException> {
                    IssueStatus.fromString("")
                }.message shouldContain "Invalid IssueStatus"
            }

            it("should reject null input") {
                shouldThrow<IllegalArgumentException> {
                    IssueStatus.fromString(null as String?)
                }.message shouldContain "cannot be null"
            }
        }

        describe("workflow helpers") {

            it("should get next possible statuses") {
                IssueStatus.TODO.getNextStatuses() shouldContainExactly listOf(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.CANCELED
                )

                IssueStatus.IN_PROGRESS.getNextStatuses() shouldContainExactly listOf(
                    IssueStatus.IN_REVIEW,
                    IssueStatus.TODO,
                    IssueStatus.CANCELED
                )

                IssueStatus.IN_REVIEW.getNextStatuses() shouldContainExactly listOf(
                    IssueStatus.DONE,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.CANCELED
                )

                IssueStatus.DONE.getNextStatuses() shouldHaveSize 0

                IssueStatus.CANCELED.getNextStatuses() shouldContainExactly listOf(
                    IssueStatus.TODO
                )
            }

            it("should get previous possible statuses") {
                IssueStatus.TODO.getPreviousStatuses() shouldContainExactly listOf(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.CANCELED
                )

                IssueStatus.IN_PROGRESS.getPreviousStatuses() shouldContainExactly listOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_REVIEW
                )

                IssueStatus.IN_REVIEW.getPreviousStatuses() shouldContainExactly listOf(
                    IssueStatus.IN_PROGRESS
                )

                IssueStatus.DONE.getPreviousStatuses() shouldContainExactly listOf(
                    IssueStatus.IN_REVIEW
                )

                IssueStatus.CANCELED.getPreviousStatuses() shouldContainExactly listOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW
                )
            }

            it("should calculate transition path") {
                val path = IssueStatus.TODO.getTransitionPath(IssueStatus.DONE)

                path shouldContainExactly listOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.DONE
                )
            }

            it("should validate transition paths exist") {
                IssueStatus.TODO.hasPathTo(IssueStatus.DONE) shouldBe true
                IssueStatus.IN_PROGRESS.hasPathTo(IssueStatus.DONE) shouldBe true
                IssueStatus.IN_REVIEW.hasPathTo(IssueStatus.DONE) shouldBe true
                IssueStatus.DONE.hasPathTo(IssueStatus.TODO) shouldBe false
                IssueStatus.CANCELED.hasPathTo(IssueStatus.DONE) shouldBe true // via TODO
            }
        }

        describe("equality and comparison") {

            it("should support equality comparison") {
                val todo1 = IssueStatus.TODO
                val todo2 = IssueStatus.TODO
                val inProgress = IssueStatus.IN_PROGRESS

                todo1 shouldBe todo2
                todo1 shouldNotBe inProgress
                todo1.hashCode() shouldBe todo2.hashCode()
            }

            it("should support ordinal comparison") {
                IssueStatus.TODO.ordinal shouldBe 0
                IssueStatus.IN_PROGRESS.ordinal shouldBe 1
                IssueStatus.IN_REVIEW.ordinal shouldBe 2
                IssueStatus.DONE.ordinal shouldBe 3
                IssueStatus.CANCELED.ordinal shouldBe 4
            }

            it("should support priority-based comparison") {
                val statuses = listOf(
                    IssueStatus.CANCELED,
                    IssueStatus.DONE,
                    IssueStatus.TODO,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.IN_PROGRESS
                )

                val sorted = statuses.sortedBy { it.getPriority() }

                sorted shouldContainExactly listOf(
                    IssueStatus.CANCELED,   // Priority 0
                    IssueStatus.TODO,       // Priority 1
                    IssueStatus.IN_PROGRESS, // Priority 2
                    IssueStatus.IN_REVIEW,  // Priority 3
                    IssueStatus.DONE        // Priority 4
                )
            }
        }

        describe("serialization") {

            it("should serialize to string consistently") {
                val todo = IssueStatus.TODO

                todo.toString() shouldBe "TODO"
                todo.name shouldBe "TODO"
            }

            it("should support valueOf for deserialization") {
                IssueStatus.valueOf("TODO") shouldBe IssueStatus.TODO
                IssueStatus.valueOf("IN_PROGRESS") shouldBe IssueStatus.IN_PROGRESS
                IssueStatus.valueOf("IN_REVIEW") shouldBe IssueStatus.IN_REVIEW
                IssueStatus.valueOf("DONE") shouldBe IssueStatus.DONE
                IssueStatus.valueOf("CANCELED") shouldBe IssueStatus.CANCELED
            }

            it("should reject invalid valueOf input") {
                shouldThrow<IllegalArgumentException> {
                    IssueStatus.valueOf("INVALID")
                }

                shouldThrow<IllegalArgumentException> {
                    IssueStatus.valueOf("todo") // Case sensitive
                }
            }
        }
    }
})
