package io.spiralhouse.cycletime.domain.valueobjects

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldMatch
import io.kotest.property.Arb
import io.kotest.property.arbitrary.string
import io.kotest.property.forAll
import java.util.UUID

/**
 * TDD Tests for ProjectId Value Object - RED PHASE
 *
 * These tests define the required behavior for ProjectId value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 *
 * Requirements being tested:
 * 1. UUID validation and generation
 * 2. Immutability and value semantics
 * 3. Input validation and error handling
 * 4. Equality and hash code behavior
 */
class ProjectIdTest : DescribeSpec({

    describe("ProjectId Value Object") {

        describe("validation") {

            it("should accept valid UUID format") {
                val validUuid = "550e8400-e29b-41d4-a716-446655440000"
                val projectId = ProjectId(validUuid)

                projectId.value shouldBe validUuid
            }

            it("should accept UUID with uppercase letters") {
                val validUuid = "550E8400-E29B-41D4-A716-446655440000"
                val projectId = ProjectId(validUuid)

                projectId.value shouldBe validUuid
            }

            it("should accept UUID with mixed case") {
                val validUuid = "550e8400-E29B-41d4-A716-446655440000"
                val projectId = ProjectId(validUuid)

                projectId.value shouldBe validUuid
            }

            it("should reject empty string") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId("")
                }.message shouldMatch ".*cannot be empty.*"
            }

            it("should reject blank string with whitespace") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId("   ")
                }.message shouldMatch ".*cannot be empty.*"
            }

            it("should reject null value") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId(null as String?)
                }.message shouldMatch ".*cannot be null.*"
            }

            it("should reject invalid UUID format") {
                val invalidFormats = listOf(
                    "not-a-uuid",
                    "123",
                    "550e8400-e29b-41d4-a716", // Too short
                    "550e8400-e29b-41d4-a716-446655440000-extra", // Too long
                    "550e8400xe29bx41d4xa716x446655440000", // Wrong separators
                    "ggge8400-e29b-41d4-a716-446655440000", // Invalid hex chars
                    "550e8400-e29b-41d4-a716-44665544000g" // Invalid hex char at end
                )

                invalidFormats.forEach { invalidFormat ->
                    shouldThrow<IllegalArgumentException> {
                        ProjectId(invalidFormat)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }

            it("should reject UUID with wrong number of segments") {
                val wrongSegments = listOf(
                    "550e8400-e29b-41d4-446655440000", // Missing segment
                    "550e8400-e29b-41d4-a716-4466-55440000", // Extra segment
                    "550e8400e29b41d4a716446655440000" // No separators
                )

                wrongSegments.forEach { wrongFormat ->
                    shouldThrow<IllegalArgumentException> {
                        ProjectId(wrongFormat)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }

            it("should validate UUID format using standard UUID parsing") {
                val invalidFormats = listOf(
                    "550e8400-e29b-41d4-a716-4466554400000", // Too long last segment
                    "550e8400-e29b-41d4-a716-446655440000X", // Non-hex character
                    "550e8400-e29b-41d4-a716", // Too few segments
                    "not-a-uuid-at-all", // Completely invalid
                    "550e8400-e29b-41d4-a716-446655440000-extra" // Extra segment
                )

                invalidFormats.forEach { invalidFormat ->
                    shouldThrow<IllegalArgumentException> {
                        ProjectId(invalidFormat)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }
        }

        describe("generation") {

            it("should generate unique IDs") {
                val id1 = ProjectId.generate()
                val id2 = ProjectId.generate()
                val id3 = ProjectId.generate()

                id1 shouldNotBe id2
                id2 shouldNotBe id3
                id1 shouldNotBe id3
            }

            it("should generate valid UUID format") {
                val id = ProjectId.generate()

                // Should not throw when creating new instance with generated value
                val recreated = ProjectId(id.value)
                recreated shouldBe id
            }

            it("should generate IDs matching UUID pattern") {
                val id = ProjectId.generate()

                // UUID pattern: 8-4-4-4-12 hexadecimal digits
                val uuidPattern = """^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"""
                id.value shouldMatch uuidPattern
            }

            it("should generate standard UUID v4 format") {
                val id = ProjectId.generate()

                // Verify it's a valid UUID by parsing it
                val uuid = UUID.fromString(id.value)
                uuid.toString() shouldBe id.value.lowercase()
            }

            it("should generate many unique IDs") {
                val ids = (1..1000).map { ProjectId.generate() }.toSet()

                // All IDs should be unique
                ids.size shouldBe 1000
            }
        }

        describe("equality and hash code") {

            it("should be equal for same value") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id1 = ProjectId(uuid)
                val id2 = ProjectId(uuid)

                id1 shouldBe id2
                id1.hashCode() shouldBe id2.hashCode()
            }

            it("should not be equal for different values") {
                val id1 = ProjectId("550e8400-e29b-41d4-a716-446655440000")
                val id2 = ProjectId("550e8400-e29b-41d4-a716-446655440001")

                id1 shouldNotBe id2
                id1.hashCode() shouldNotBe id2.hashCode()
            }

            it("should be case-sensitive for equality") {
                val id1 = ProjectId("550e8400-e29b-41d4-a716-446655440000")
                val id2 = ProjectId("550E8400-E29B-41D4-A716-446655440000")

                // UUIDs are case-insensitive, but we want to preserve original case
                id1 shouldNotBe id2
            }

            it("should maintain hashCode consistency") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = ProjectId(uuid)

                val hash1 = id.hashCode()
                val hash2 = id.hashCode()
                val hash3 = id.hashCode()

                hash1 shouldBe hash2
                hash2 shouldBe hash3
            }

            it("should have stable hashCode across instances") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id1 = ProjectId(uuid)
                val id2 = ProjectId(uuid)

                id1.hashCode() shouldBe id2.hashCode()
            }
        }

        describe("string representation") {

            it("should return value as toString") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = ProjectId(uuid)

                id.toString() shouldBe uuid
            }

            it("should preserve original case in toString") {
                val mixedCaseUuid = "550E8400-e29b-41D4-A716-446655440000"
                val id = ProjectId(mixedCaseUuid)

                id.toString() shouldBe mixedCaseUuid
            }

            it("should have consistent string representation") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = ProjectId(uuid)

                val str1 = id.toString()
                val str2 = id.toString()
                val str3 = id.toString()

                str1 shouldBe str2
                str2 shouldBe str3
                str1 shouldBe uuid
            }
        }

        describe("factory methods") {

            it("should support fromString factory method") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = ProjectId.fromString(uuid)

                id.value shouldBe uuid
                id shouldBe ProjectId(uuid)
            }

            it("should validate input in fromString") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId.fromString("invalid-uuid")
                }.message shouldMatch ".*Invalid UUID format.*"
            }

            it("should handle null in fromString") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId.fromString(null as String?)
                }.message shouldMatch ".*cannot be null.*"
            }
        }

        describe("property-based testing") {

            it("should maintain value consistency") {
                forAll<String> { input ->
                    runCatching { ProjectId(input) }
                        .fold(
                            onSuccess = { id -> id.value == input },
                            onFailure = { true } // Invalid inputs should fail
                        )
                }
            }

            it("should validate all string inputs properly") {
                forAll(Arb.string()) { input ->
                    val isValidUuid = try {
                        UUID.fromString(input)
                        true
                    } catch (e: IllegalArgumentException) {
                        false
                    }

                    val projectIdResult = runCatching { ProjectId(input) }

                    // Should succeed only for valid UUIDs
                    if (isValidUuid) {
                        projectIdResult.isSuccess
                    } else {
                        projectIdResult.isFailure
                    }
                }
            }

            it("should generate valid UUIDs consistently") {
                // Test 100 iterations to ensure consistency
                repeat(100) {
                    val id = ProjectId.generate()

                    // Generated ID should always be valid
                    runCatching { UUID.fromString(id.value) }.isSuccess shouldBe true
                    runCatching { ProjectId(id.value) }.isSuccess shouldBe true
                }
            }
        }

        describe("serialization support") {

            it("should be serializable as string") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = ProjectId(uuid)

                // Should be able to serialize/deserialize via string representation
                val serialized = id.toString()
                val deserialized = ProjectId(serialized)

                deserialized shouldBe id
            }

            it("should maintain identity through serialization cycle") {
                val originalId = ProjectId.generate()

                // Simulate serialization cycle
                val serialized = originalId.value
                val reconstructed = ProjectId(serialized)

                reconstructed shouldBe originalId
                reconstructed.value shouldBe originalId.value
            }
        }

        describe("edge cases") {

            it("should handle Unicode characters in UUID validation") {
                val unicodeString = "550e8400-e29b-41d4-a716-44665544000ñ"

                shouldThrow<IllegalArgumentException> {
                    ProjectId(unicodeString)
                }.message shouldMatch ".*Invalid UUID format.*"
            }

            it("should handle extremely long strings") {
                val veryLongString = "a".repeat(10000)

                shouldThrow<IllegalArgumentException> {
                    ProjectId(veryLongString)
                }.message shouldMatch ".*Invalid UUID format.*"
            }

            it("should handle special characters") {
                val specialChars = listOf(
                    "550e8400-e29b-41d4-a716-446655440000\n",
                    "550e8400-e29b-41d4-a716-446655440000\t",
                    "550e8400-e29b-41d4-a716-446655440000\r",
                    "\n550e8400-e29b-41d4-a716-446655440000"
                )

                specialChars.forEach { invalidInput ->
                    shouldThrow<IllegalArgumentException> {
                        ProjectId(invalidInput)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }
        }
    }
})
