package io.spiralhouse.jcvd.domain.valueobjects

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
 * TDD Tests for IssueId Value Object - RED PHASE
 * 
 * These tests define the required behavior for IssueId value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 * 
 * Requirements being tested:
 * 1. UUID validation and generation (similar to ProjectId pattern)
 * 2. Immutability and value semantics
 * 3. Input validation and error handling
 * 4. Equality and hash code behavior
 */
class IssueIdTest : DescribeSpec({
    
    describe("IssueId Value Object") {
        
        describe("validation") {
            
            it("should accept valid UUID format") {
                val validUuid = "550e8400-e29b-41d4-a716-446655440000"
                val issueId = IssueId(validUuid)
                
                issueId.value shouldBe validUuid
            }
            
            it("should accept UUID with uppercase letters") {
                val validUuid = "550E8400-E29B-41D4-A716-446655440000"
                val issueId = IssueId(validUuid)
                
                issueId.value shouldBe validUuid
            }
            
            it("should accept UUID with mixed case") {
                val validUuid = "550e8400-E29B-41d4-A716-446655440000"
                val issueId = IssueId(validUuid)
                
                issueId.value shouldBe validUuid
            }
            
            it("should reject empty string") {
                shouldThrow<IllegalArgumentException> {
                    IssueId("")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should reject blank string with whitespace") {
                shouldThrow<IllegalArgumentException> {
                    IssueId("   ")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should reject null value") {
                shouldThrow<IllegalArgumentException> {
                    IssueId(null as String?)
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
                        IssueId(invalidFormat)
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
                        IssueId(wrongFormat)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }
            
            it("should validate UUID segment lengths") {
                val wrongLengths = listOf(
                    "550e840-e29b-41d4-a716-446655440000", // Short first segment
                    "550e8400-e29-41d4-a716-446655440000", // Short second segment  
                    "550e8400-e29b-41d-a716-446655440000", // Short third segment
                    "550e8400-e29b-41d4-a71-446655440000", // Short fourth segment
                    "550e8400-e29b-41d4-a716-44665544000" // Short fifth segment
                )
                
                wrongLengths.forEach { wrongLength ->
                    shouldThrow<IllegalArgumentException> {
                        IssueId(wrongLength)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }
        }
        
        describe("generation") {
            
            it("should generate unique IDs") {
                val id1 = IssueId.generate()
                val id2 = IssueId.generate()
                val id3 = IssueId.generate()
                
                id1 shouldNotBe id2
                id2 shouldNotBe id3
                id1 shouldNotBe id3
            }
            
            it("should generate valid UUID format") {
                val id = IssueId.generate()
                
                // Should not throw when creating new instance with generated value
                val recreated = IssueId(id.value)
                recreated shouldBe id
            }
            
            it("should generate IDs matching UUID pattern") {
                val id = IssueId.generate()
                
                // UUID pattern: 8-4-4-4-12 hexadecimal digits
                val uuidPattern = """^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"""
                id.value shouldMatch uuidPattern
            }
            
            it("should generate standard UUID v4 format") {
                val id = IssueId.generate()
                
                // Verify it's a valid UUID by parsing it
                val uuid = UUID.fromString(id.value)
                uuid.toString() shouldBe id.value.lowercase()
            }
            
            it("should generate many unique IDs") {
                val ids = (1..1000).map { IssueId.generate() }.toSet()
                
                // All IDs should be unique
                ids.size shouldBe 1000
            }
        }
        
        describe("equality and hash code") {
            
            it("should be equal for same value") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id1 = IssueId(uuid)
                val id2 = IssueId(uuid)
                
                id1 shouldBe id2
                id1.hashCode() shouldBe id2.hashCode()
            }
            
            it("should not be equal for different values") {
                val id1 = IssueId("550e8400-e29b-41d4-a716-446655440000")
                val id2 = IssueId("550e8400-e29b-41d4-a716-446655440001")
                
                id1 shouldNotBe id2
                id1.hashCode() shouldNotBe id2.hashCode()
            }
            
            it("should be case-sensitive for equality") {
                val id1 = IssueId("550e8400-e29b-41d4-a716-446655440000")
                val id2 = IssueId("550E8400-E29B-41D4-A716-446655440000")
                
                // UUIDs are case-insensitive, but we want to preserve original case
                id1 shouldNotBe id2
            }
            
            it("should maintain hashCode consistency") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = IssueId(uuid)
                
                val hash1 = id.hashCode()
                val hash2 = id.hashCode()
                val hash3 = id.hashCode()
                
                hash1 shouldBe hash2
                hash2 shouldBe hash3
            }
            
            it("should have stable hashCode across instances") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id1 = IssueId(uuid)
                val id2 = IssueId(uuid)
                
                id1.hashCode() shouldBe id2.hashCode()
            }
        }
        
        describe("string representation") {
            
            it("should return value as toString") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = IssueId(uuid)
                
                id.toString() shouldBe uuid
            }
            
            it("should preserve original case in toString") {
                val mixedCaseUuid = "550E8400-e29b-41D4-A716-446655440000"
                val id = IssueId(mixedCaseUuid)
                
                id.toString() shouldBe mixedCaseUuid
            }
            
            it("should have consistent string representation") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = IssueId(uuid)
                
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
                val id = IssueId.fromString(uuid)
                
                id.value shouldBe uuid
                id shouldBe IssueId(uuid)
            }
            
            it("should validate input in fromString") {
                shouldThrow<IllegalArgumentException> {
                    IssueId.fromString("invalid-uuid")
                }.message shouldMatch ".*Invalid UUID format.*"
            }
            
            it("should handle null in fromString") {
                shouldThrow<IllegalArgumentException> {
                    IssueId.fromString(null as String?)
                }.message shouldMatch ".*cannot be null.*"
            }
        }
        
        describe("property-based testing") {
            
            it("should maintain value consistency") {
                forAll<String> { input ->
                    runCatching { IssueId(input) }
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
                    
                    val issueIdResult = runCatching { IssueId(input) }
                    
                    // Should succeed only for valid UUIDs
                    if (isValidUuid) {
                        issueIdResult.isSuccess
                    } else {
                        issueIdResult.isFailure
                    }
                }
            }
            
            it("should generate valid UUIDs consistently") {
                // Test 100 iterations to ensure consistency
                repeat(100) {
                    val id = IssueId.generate()
                    
                    // Generated ID should always be valid
                    runCatching { UUID.fromString(id.value) }.isSuccess shouldBe true
                    runCatching { IssueId(id.value) }.isSuccess shouldBe true
                }
            }
        }
        
        describe("serialization support") {
            
            it("should be serializable as string") {
                val uuid = "550e8400-e29b-41d4-a716-446655440000"
                val id = IssueId(uuid)
                
                // Should be able to serialize/deserialize via string representation
                val serialized = id.toString()
                val deserialized = IssueId(serialized)
                
                deserialized shouldBe id
            }
            
            it("should maintain identity through serialization cycle") {
                val originalId = IssueId.generate()
                
                // Simulate serialization cycle
                val serialized = originalId.value
                val reconstructed = IssueId(serialized)
                
                reconstructed shouldBe originalId
                reconstructed.value shouldBe originalId.value
            }
        }
        
        describe("edge cases") {
            
            it("should handle Unicode characters in UUID validation") {
                val unicodeString = "550e8400-e29b-41d4-a716-44665544000ñ"
                
                shouldThrow<IllegalArgumentException> {
                    IssueId(unicodeString)
                }.message shouldMatch ".*Invalid UUID format.*"
            }
            
            it("should handle extremely long strings") {
                val veryLongString = "a".repeat(10000)
                
                shouldThrow<IllegalArgumentException> {
                    IssueId(veryLongString)
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
                        IssueId(invalidInput)
                    }.message shouldMatch ".*Invalid UUID format.*"
                }
            }
        }
    }
})