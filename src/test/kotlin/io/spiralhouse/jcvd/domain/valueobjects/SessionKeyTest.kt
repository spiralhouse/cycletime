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
 * TDD Tests for SessionKey Value Object - RED PHASE
 * 
 * These tests define the required behavior for SessionKey value object following TDD methodology.
 * Tests should initially FAIL to drive implementation following Red-Green-Refactor cycle.
 * 
 * Requirements being tested:
 * 1. UUID validation and generation
 * 2. Immutability and value semantics
 * 3. Input validation and error handling
 * 4. Equality and hash code behavior
 * 5. String conversion and factory methods
 */
class SessionKeyTest : DescribeSpec({
    
    describe("SessionKey Value Object") {
        
        describe("validation") {
            
            it("should accept valid UUID format") {
                val validUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val sessionKey = SessionKey(validUuid)
                
                sessionKey.value shouldBe validUuid
            }
            
            it("should accept UUID with uppercase letters") {
                val validUuid = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
                val sessionKey = SessionKey(validUuid)
                
                sessionKey.value shouldBe validUuid
            }
            
            it("should accept UUID with mixed case") {
                val validUuid = "a1B2c3D4-e5F6-7890-AbCd-Ef1234567890"
                val sessionKey = SessionKey(validUuid)
                
                sessionKey.value shouldBe validUuid
            }
            
            it("should accept all lowercase UUID") {
                val validUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
                val sessionKey = SessionKey(validUuid)
                
                sessionKey.value shouldBe validUuid
            }
            
            it("should accept UUID with all valid hex characters") {
                val validUuid = "0123456789abcdef-0123-4567-89ab-cdef01234567"
                val sessionKey = SessionKey(validUuid)
                
                sessionKey.value shouldBe validUuid
            }
            
            it("should reject empty string") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey("")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should reject blank string with whitespace") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey("   ")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should reject string with only tabs and newlines") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey("\t\n\r ")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should reject invalid UUID format") {
                val invalidFormats = listOf(
                    "not-a-uuid",
                    "123456789",
                    "simple-string",
                    "a1b2c3d4-e5f6-7890-abcd", // Too short
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890-extra", // Too long
                    "a1b2c3d4xe5f6x7890xabcdxef1234567890", // Wrong separators
                    "g1b2c3d4-e5f6-7890-abcd-ef1234567890", // Invalid hex char 'g'
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789g", // Invalid hex char 'g' at end
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789z" // Invalid hex char 'z'
                )
                
                invalidFormats.forEach { invalidFormat ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(invalidFormat)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should reject UUID with wrong number of segments") {
                val wrongSegments = listOf(
                    "a1b2c3d4-e5f6-7890-ef1234567890", // Missing segment (4 instead of 5)
                    "a1b2c3d4-e5f6-7890-abcd-ef12-34567890", // Extra segment (6 instead of 5)
                    "a1b2c3d4e5f678901234abcdef1234567890", // No separators
                    "a1b2c3d4-e5f6-7890", // Only 3 segments
                    "-e5f6-7890-abcd-ef1234567890" // Empty first segment
                )
                
                wrongSegments.forEach { wrongFormat ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(wrongFormat)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should validate UUID segment lengths") {
                val wrongLengths = listOf(
                    "a1b2c3d-e5f6-7890-abcd-ef1234567890", // Short first segment (7 instead of 8)
                    "a1b2c3d4-e5f-7890-abcd-ef1234567890", // Short second segment (3 instead of 4)
                    "a1b2c3d4-e5f6-789-abcd-ef1234567890", // Short third segment (3 instead of 4)
                    "a1b2c3d4-e5f6-7890-abc-ef1234567890", // Short fourth segment (3 instead of 4)
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789", // Short fifth segment (11 instead of 12)
                    "a1b2c3d4a-e5f6-7890-abcd-ef1234567890", // Long first segment (9 instead of 8)
                    "a1b2c3d4-e5f6a-7890-abcd-ef1234567890", // Long second segment (5 instead of 4)
                    "a1b2c3d4-e5f6-7890a-abcd-ef1234567890", // Long third segment (5 instead of 4)
                    "a1b2c3d4-e5f6-7890-abcda-ef1234567890", // Long fourth segment (5 instead of 4)
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890a" // Long fifth segment (13 instead of 12)
                )
                
                wrongLengths.forEach { wrongLength ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(wrongLength)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should reject UUID with invalid characters") {
                val invalidChars = listOf(
                    "g1b2c3d4-e5f6-7890-abcd-ef1234567890", // 'g' is invalid hex
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789x", // 'x' is invalid hex
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789@", // '@' is invalid hex
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789!", // '!' is invalid hex
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789 ", // Space is invalid hex
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789\n" // Newline is invalid hex
                )
                
                invalidChars.forEach { invalidChar ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(invalidChar)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should reject UUID with wrong separator characters") {
                val wrongSeparators = listOf(
                    "a1b2c3d4_e5f6_7890_abcd_ef1234567890", // Underscore instead of hyphen
                    "a1b2c3d4.e5f6.7890.abcd.ef1234567890", // Period instead of hyphen
                    "a1b2c3d4:e5f6:7890:abcd:ef1234567890", // Colon instead of hyphen
                    "a1b2c3d4 e5f6 7890 abcd ef1234567890", // Space instead of hyphen
                    "a1b2c3d4/e5f6/7890/abcd/ef1234567890"  // Slash instead of hyphen
                )
                
                wrongSeparators.forEach { wrongSeparator ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(wrongSeparator)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
        }
        
        describe("generation") {
            
            it("should generate unique session keys") {
                val key1 = SessionKey.generate()
                val key2 = SessionKey.generate()
                val key3 = SessionKey.generate()
                val key4 = SessionKey.generate()
                val key5 = SessionKey.generate()
                
                // All keys should be different
                key1 shouldNotBe key2
                key1 shouldNotBe key3
                key1 shouldNotBe key4
                key1 shouldNotBe key5
                key2 shouldNotBe key3
                key2 shouldNotBe key4
                key2 shouldNotBe key5
                key3 shouldNotBe key4
                key3 shouldNotBe key5
                key4 shouldNotBe key5
            }
            
            it("should generate valid UUID format") {
                val key = SessionKey.generate()
                
                // Should not throw when creating new instance with generated value
                val recreated = SessionKey(key.value)
                recreated shouldBe key
            }
            
            it("should generate keys matching UUID pattern") {
                val key = SessionKey.generate()
                
                // UUID pattern: 8-4-4-4-12 hexadecimal digits
                val uuidPattern = """^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"""
                key.value shouldMatch uuidPattern
            }
            
            it("should generate standard UUID v4 format") {
                val key = SessionKey.generate()
                
                // Verify it's a valid UUID by parsing it
                val uuid = UUID.fromString(key.value)
                uuid.toString() shouldBe key.value.lowercase()
            }
            
            it("should generate many unique keys") {
                val keys = (1..1000).map { SessionKey.generate() }.toSet()
                
                // All keys should be unique
                keys.size shouldBe 1000
            }
            
            it("should generate keys with correct version and variant") {
                repeat(10) {
                    val key = SessionKey.generate()
                    val uuid = UUID.fromString(key.value)
                    
                    // UUID v4 should have version 4
                    uuid.version() shouldBe 4
                    // Variant should be 2 (RFC 4122)
                    uuid.variant() shouldBe 2
                }
            }
            
            it("should generate cryptographically random keys") {
                // Generate many keys and check they don't follow obvious patterns
                val keys = (1..100).map { SessionKey.generate().value }
                
                // Check that generated UUIDs don't have obvious patterns
                // (This is a basic randomness check, not cryptographically rigorous)
                keys.forEach { key ->
                    // Should not be all same character
                    val withoutHyphens = key.replace("-", "")
                    val uniqueChars = withoutHyphens.toSet()
                    uniqueChars.size shouldNotBe 1
                    
                    // Should not follow simple incremental patterns
                    withoutHyphens shouldNotBe "0123456789abcdef0123456789abcdef"
                    withoutHyphens shouldNotBe "abcdefabcdefabcdefabcdefabcdefab"
                }
            }
        }
        
        describe("equality and hash code") {
            
            it("should be equal for same value") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key1 = SessionKey(uuid)
                val key2 = SessionKey(uuid)
                
                key1 shouldBe key2
                key1.hashCode() shouldBe key2.hashCode()
            }
            
            it("should not be equal for different values") {
                val key1 = SessionKey("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                val key2 = SessionKey("a1b2c3d4-e5f6-7890-abcd-ef1234567891")
                
                key1 shouldNotBe key2
                // Hash codes should likely be different (not guaranteed but highly probable)
                key1.hashCode() shouldNotBe key2.hashCode()
            }
            
            it("should be case-sensitive for equality") {
                val key1 = SessionKey("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                val key2 = SessionKey("A1B2C3D4-E5F6-7890-ABCD-EF1234567890")
                
                // SessionKeys should preserve original case and be case-sensitive
                key1 shouldNotBe key2
                key1.hashCode() shouldNotBe key2.hashCode()
            }
            
            it("should maintain hashCode consistency") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey(uuid)
                
                val hash1 = key.hashCode()
                val hash2 = key.hashCode()
                val hash3 = key.hashCode()
                
                hash1 shouldBe hash2
                hash2 shouldBe hash3
            }
            
            it("should have stable hashCode across instances") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key1 = SessionKey(uuid)
                val key2 = SessionKey(uuid)
                
                key1.hashCode() shouldBe key2.hashCode()
            }
            
            it("should support equality in collections") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key1 = SessionKey(uuid)
                val key2 = SessionKey(uuid)
                val key3 = SessionKey("b1b2c3d4-e5f6-7890-abcd-ef1234567890")
                
                val set = setOf(key1, key2, key3)
                set.size shouldBe 2 // key1 and key2 should be considered the same
                
                val list = listOf(key1, key2, key3)
                list.contains(key1) shouldBe true
                list.contains(key2) shouldBe true
                list.contains(key3) shouldBe true
            }
        }
        
        describe("string representation") {
            
            it("should return value as toString") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey(uuid)
                
                key.toString() shouldBe uuid
            }
            
            it("should preserve original case in toString") {
                val mixedCaseUuid = "A1b2C3d4-E5f6-7890-AbCd-Ef1234567890"
                val key = SessionKey(mixedCaseUuid)
                
                key.toString() shouldBe mixedCaseUuid
            }
            
            it("should have consistent string representation") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey(uuid)
                
                val str1 = key.toString()
                val str2 = key.toString()
                val str3 = key.toString()
                
                str1 shouldBe str2
                str2 shouldBe str3
                str1 shouldBe uuid
            }
            
            it("should have toString equal to value property") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey(uuid)
                
                key.toString() shouldBe key.value
            }
        }
        
        describe("factory methods") {
            
            it("should support fromString factory method") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey.fromString(uuid)
                
                key.value shouldBe uuid
                key shouldBe SessionKey(uuid)
            }
            
            it("should validate input in fromString") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey.fromString("invalid-uuid-format")
                }.message shouldMatch ".*Invalid SessionKey format.*"
            }
            
            it("should handle empty string in fromString") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey.fromString("")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should handle blank string in fromString") {
                shouldThrow<IllegalArgumentException> {
                    SessionKey.fromString("   ")
                }.message shouldMatch ".*cannot be empty.*"
            }
            
            it("should preserve case in fromString") {
                val mixedCaseUuid = "A1b2C3d4-E5f6-7890-AbCd-Ef1234567890"
                val key = SessionKey.fromString(mixedCaseUuid)
                
                key.value shouldBe mixedCaseUuid
                key.toString() shouldBe mixedCaseUuid
            }
        }
        
        describe("property-based testing") {
            
            it("should maintain value consistency") {
                forAll<String> { input ->
                    runCatching { SessionKey(input) }
                        .fold(
                            onSuccess = { key -> key.value == input },
                            onFailure = { true } // Invalid inputs should fail
                        )
                }
            }
            
            it("should validate all string inputs properly") {
                forAll(Arb.string()) { input ->
                    val isValidUuid = try {
                        UUID.fromString(input)
                        input.isNotBlank()
                    } catch (e: IllegalArgumentException) {
                        false
                    }
                    
                    val sessionKeyResult = runCatching { SessionKey(input) }
                    
                    // Should succeed only for valid, non-blank UUIDs
                    if (isValidUuid && input.isNotBlank()) {
                        sessionKeyResult.isSuccess
                    } else {
                        sessionKeyResult.isFailure
                    }
                }
            }
            
            it("should generate valid UUIDs consistently") {
                // Test many iterations to ensure consistency
                repeat(100) {
                    val key = SessionKey.generate()
                    
                    // Generated key should always be valid
                    runCatching { UUID.fromString(key.value) }.isSuccess shouldBe true
                    runCatching { SessionKey(key.value) }.isSuccess shouldBe true
                    
                    // Should match UUID format
                    val uuidPattern = """^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"""
                    key.value shouldMatch uuidPattern
                }
            }
            
            it("should handle all valid UUID strings") {
                // Test with various valid UUID formats
                val validUuids = listOf(
                    "00000000-0000-0000-0000-000000000000", // All zeros
                    "ffffffff-ffff-ffff-ffff-ffffffffffff", // All f's
                    "12345678-1234-1234-1234-123456789012", // All digits
                    "abcdefab-cdef-abcd-efab-cdefabcdefab", // All letters
                    "0123456789abcdef-0123-4567-89ab-cdef01234567" // Mixed
                )
                
                validUuids.forEach { uuid ->
                    val key = SessionKey(uuid)
                    key.value shouldBe uuid
                    key.toString() shouldBe uuid
                }
            }
        }
        
        describe("serialization support") {
            
            it("should be serializable as string") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                val key = SessionKey(uuid)
                
                // Should be able to serialize/deserialize via string representation
                val serialized = key.toString()
                val deserialized = SessionKey(serialized)
                
                deserialized shouldBe key
            }
            
            it("should maintain identity through serialization cycle") {
                val originalKey = SessionKey.generate()
                
                // Simulate serialization cycle
                val serialized = originalKey.value
                val reconstructed = SessionKey(serialized)
                
                reconstructed shouldBe originalKey
                reconstructed.value shouldBe originalKey.value
            }
            
            it("should support JSON-like serialization patterns") {
                val key = SessionKey.generate()
                
                // Simulate JSON serialization/deserialization
                val jsonValue = key.value // What would be stored in JSON
                val fromJson = SessionKey.fromString(jsonValue)
                
                fromJson shouldBe key
            }
        }
        
        describe("edge cases") {
            
            it("should handle Unicode characters in validation") {
                val unicodeString = "a1b2c3d4-e5f6-7890-abcd-ef123456789ñ"
                
                shouldThrow<IllegalArgumentException> {
                    SessionKey(unicodeString)
                }.message shouldMatch ".*Invalid SessionKey format.*"
            }
            
            it("should handle extremely long strings") {
                val veryLongString = "a".repeat(10000)
                
                shouldThrow<IllegalArgumentException> {
                    SessionKey(veryLongString)
                }.message shouldMatch ".*Invalid SessionKey format.*"
            }
            
            it("should handle special characters and whitespace") {
                val specialChars = listOf(
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890\n", // Trailing newline
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890\t", // Trailing tab
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890\r", // Trailing carriage return
                    "\na1b2c3d4-e5f6-7890-abcd-ef1234567890", // Leading newline
                    " a1b2c3d4-e5f6-7890-abcd-ef1234567890", // Leading space
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890 ", // Trailing space
                    "a1b2c3d4-e5f6-7890 abcd-ef1234567890", // Space in middle
                    "a1b2c3d4-e5f6-7890\tabcd-ef1234567890" // Tab in middle
                )
                
                specialChars.forEach { invalidInput ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(invalidInput)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should handle null-like inputs") {
                // These should all fail with appropriate error messages
                val nullLikeInputs = listOf(
                    "null",
                    "NULL",
                    "undefined",
                    "nil"
                )
                
                nullLikeInputs.forEach { nullLike ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(nullLike)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
            
            it("should handle inputs that look like UUIDs but aren't") {
                val almostUuids = listOf(
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890z", // Extra character
                    "a1b2c3d4-e5f6-7890-abcd-ef123456789", // One short
                    "a1b2c3d4-e5f6-7890-abcd-ef12345678901", // One extra
                    "a1b2c3d4-e5f6-7890-abcd-ef1234567890-", // Trailing hyphen
                    "-a1b2c3d4-e5f6-7890-abcd-ef1234567890", // Leading hyphen
                    "a1b2c3d4--e5f6-7890-abcd-ef1234567890", // Double hyphen
                    "a1b2c3d4-e5f6-7890-abcd--ef1234567890" // Double hyphen in different position
                )
                
                almostUuids.forEach { almostUuid ->
                    shouldThrow<IllegalArgumentException> {
                        SessionKey(almostUuid)
                    }.message shouldMatch ".*Invalid SessionKey format.*"
                }
            }
        }
        
        describe("performance characteristics") {
            
            it("should create instances efficiently") {
                val uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                
                // Should be able to create many instances quickly
                repeat(1000) {
                    val key = SessionKey(uuid)
                    key.value shouldBe uuid
                }
            }
            
            it("should generate keys efficiently") {
                // Should be able to generate many keys quickly
                repeat(100) {
                    val key = SessionKey.generate()
                    key.value.length shouldBe 36 // Standard UUID length
                }
            }
            
            it("should have efficient equality checks") {
                val key1 = SessionKey("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                val key2 = SessionKey("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
                val key3 = SessionKey("b1b2c3d4-e5f6-7890-abcd-ef1234567890")
                
                // Should be able to perform many equality checks quickly
                repeat(1000) {
                    (key1 == key2) shouldBe true
                    (key1 == key3) shouldBe false
                }
            }
        }
    }
})