package io.spiralhouse.cycletime.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldContainExactly
import io.kotest.matchers.string.shouldMatch

/**
 * TDD Tests for WorkflowStage Value Object - RED PHASE
 *
 * These tests define the required behavior for WorkflowStage value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 *
 * Requirements being tested:
 * 1. Immutable value object with validation
 * 2. String-based stage names with validation rules
 * 3. Factory methods for creation
 * 4. Equality and hash code behavior
 * 5. Serialization support
 */
class WorkflowStageTest : DescribeSpec({

    describe("WorkflowStage Value Object") {

        describe("creation and validation") {

            it("should accept valid stage names") {
                val validStages = listOf(
                    "Planning",
                    "Development",
                    "Testing", 
                    "Review",
                    "Deployment",
                    "Done"
                )

                validStages.forEach { stageName ->
                    val stage = WorkflowStage(stageName)
                    stage.name shouldBe stageName
                }
            }

            it("should accept stage names with spaces and common characters") {
                val validStages = listOf(
                    "Code Review",
                    "QA Testing", 
                    "User Acceptance",
                    "Pre-Production",
                    "Stage 1",
                    "Phase 2.1"
                )

                validStages.forEach { stageName ->
                    val stage = WorkflowStage(stageName)
                    stage.name shouldBe stageName
                }
            }

            it("should reject null values") {
                shouldThrow<IllegalArgumentException> {
                    WorkflowStage(null as String?)
                }.message shouldMatch ".*cannot be null.*"
            }

            it("should reject empty strings") {
                shouldThrow<IllegalArgumentException> {
                    WorkflowStage("")
                }.message shouldMatch ".*cannot be empty.*"
            }

            it("should reject blank strings") {
                shouldThrow<IllegalArgumentException> {
                    WorkflowStage("   ")
                }.message shouldMatch ".*cannot be empty.*"
            }

            it("should reject excessively long stage names") {
                val tooLongName = "a".repeat(101) // Assuming max length is 100

                shouldThrow<IllegalArgumentException> {
                    WorkflowStage(tooLongName)
                }.message shouldMatch ".*too long.*"
            }

            it("should reject stage names with invalid characters") {
                val invalidStages = listOf(
                    "Stage\nName",     // Newline
                    "Stage\tName",     // Tab
                    "Stage<Name>",     // Angle brackets
                    "Stage|Name",      // Pipe
                    "Stage/Name"       // Forward slash
                )

                invalidStages.forEach { invalidName ->
                    shouldThrow<IllegalArgumentException> {
                        WorkflowStage(invalidName)
                    }.message shouldMatch "(?s).*Invalid stage name.*"
                }
            }

            it("should trim whitespace from stage names") {
                val stage = WorkflowStage("  Development  ")
                stage.name shouldBe "Development"
            }
        }

        describe("factory methods") {

            it("should support fromString factory method") {
                val stage = WorkflowStage.fromString("Testing")

                stage.name shouldBe "Testing"
                stage shouldBe WorkflowStage("Testing")
            }

            it("should validate input in fromString") {
                shouldThrow<IllegalArgumentException> {
                    WorkflowStage.fromString("")
                }.message shouldMatch ".*cannot be empty.*"
            }

            it("should handle null in fromString") {
                shouldThrow<IllegalArgumentException> {
                    WorkflowStage.fromString(null as String?)
                }.message shouldMatch ".*cannot be null.*"
            }

            it("should provide common workflow stages") {
                val planning = WorkflowStage.planning()
                val development = WorkflowStage.development()
                val testing = WorkflowStage.testing()
                val review = WorkflowStage.review()
                val deployment = WorkflowStage.deployment()
                val done = WorkflowStage.done()

                planning.name shouldBe "Planning"
                development.name shouldBe "Development"
                testing.name shouldBe "Testing"
                review.name shouldBe "Review"
                deployment.name shouldBe "Deployment"
                done.name shouldBe "Done"
            }
        }

        describe("equality and hash code") {

            it("should be equal for same stage name") {
                val stage1 = WorkflowStage("Development")
                val stage2 = WorkflowStage("Development")

                stage1 shouldBe stage2
                stage1.hashCode() shouldBe stage2.hashCode()
            }

            it("should not be equal for different stage names") {
                val stage1 = WorkflowStage("Development")
                val stage2 = WorkflowStage("Testing")

                stage1 shouldNotBe stage2
                stage1.hashCode() shouldNotBe stage2.hashCode()
            }

            it("should be case-sensitive") {
                val stage1 = WorkflowStage("development")
                val stage2 = WorkflowStage("Development")

                stage1 shouldNotBe stage2
            }

            it("should maintain hashCode consistency") {
                val stage = WorkflowStage("Testing")

                val hash1 = stage.hashCode()
                val hash2 = stage.hashCode()
                val hash3 = stage.hashCode()

                hash1 shouldBe hash2
                hash2 shouldBe hash3
            }

            it("should have stable hashCode across instances") {
                val stage1 = WorkflowStage("Testing")
                val stage2 = WorkflowStage("Testing")

                stage1.hashCode() shouldBe stage2.hashCode()
            }
        }

        describe("string representation") {

            it("should return name as toString") {
                val stage = WorkflowStage("Development")

                stage.toString() shouldBe "Development"
            }

            it("should have consistent string representation") {
                val stage = WorkflowStage("Testing")

                val str1 = stage.toString()
                val str2 = stage.toString()
                val str3 = stage.toString()

                str1 shouldBe str2
                str2 shouldBe str3
                str1 shouldBe "Testing"
            }
        }

        describe("workflow stage properties") {

            it("should provide stage name") {
                val stage = WorkflowStage("Code Review")
                stage.name shouldBe "Code Review"
            }

            it("should check if stage is terminal") {
                val doneStage = WorkflowStage("Done")
                val devStage = WorkflowStage("Development")

                doneStage.isTerminal() shouldBe true
                devStage.isTerminal() shouldBe false
            }

            it("should check if stage is initial") {
                val planningStage = WorkflowStage("Planning")
                val testingStage = WorkflowStage("Testing")

                planningStage.isInitial() shouldBe true
                testingStage.isInitial() shouldBe false
            }

            it("should provide stage ordering information") {
                val planning = WorkflowStage.planning()
                val development = WorkflowStage.development()
                val testing = WorkflowStage.testing()

                planning.getOrder() shouldBe 1
                development.getOrder() shouldBe 2
                testing.getOrder() shouldBe 3
            }
        }

        describe("serialization support") {

            it("should be serializable as string") {
                val stage = WorkflowStage("Development")

                // Should be able to serialize/deserialize via string representation
                val serialized = stage.toString()
                val deserialized = WorkflowStage(serialized)

                deserialized shouldBe stage
            }

            it("should maintain identity through serialization cycle") {
                val originalStage = WorkflowStage("Testing")

                // Simulate serialization cycle
                val serialized = originalStage.name
                val reconstructed = WorkflowStage(serialized)

                reconstructed shouldBe originalStage
                reconstructed.name shouldBe originalStage.name
            }
        }

        describe("edge cases") {

            it("should handle Unicode characters") {
                val unicodeStage = WorkflowStage("测试阶段")
                unicodeStage.name shouldBe "测试阶段"
            }

            it("should handle special characters in valid names") {
                val validStages = listOf(
                    "Stage-1",
                    "Phase_2", 
                    "Step (Alpha)",
                    "Version 2.0",
                    "Pre-Release"
                )

                validStages.forEach { stageName ->
                    val stage = WorkflowStage(stageName)
                    stage.name shouldBe stageName
                }
            }

            it("should provide standard workflow stages for comparison") {
                val standardStages = WorkflowStage.getStandardStages()

                standardStages shouldContain WorkflowStage.planning()
                standardStages shouldContain WorkflowStage.development()
                standardStages shouldContain WorkflowStage.testing()
                standardStages shouldContain WorkflowStage.review()
                standardStages shouldContain WorkflowStage.deployment()
                standardStages shouldContain WorkflowStage.done()
            }
        }
    }
})