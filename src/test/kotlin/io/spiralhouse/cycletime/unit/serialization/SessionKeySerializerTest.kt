package io.spiralhouse.cycletime.unit.serialization

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import io.spiralhouse.cycletime.infrastructure.serialization.NullableSessionKeySerializer
import io.spiralhouse.cycletime.infrastructure.serialization.SessionKeySerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.encodeToJsonElement

/**
 * Unit tests for SessionKey serialization.
 *
 * Verifies that SessionKey serializes as a primitive string, not as an object
 * with a "value" field. This is the fix for SPI-1277.
 *
 * ## Test Categories:
 * 1. SessionKeySerializer - primitive string serialization
 * 2. NullableSessionKeySerializer - null handling
 * 3. Round-trip serialization
 */
class SessionKeySerializerTest : StringSpec({

    val json = Json { encodeDefaults = true }
    val testUuid = "550e8400-e29b-41d4-a716-446655440000"

    // ================================================================================
    // SessionKeySerializer Tests
    // ================================================================================

    "SessionKey should serialize as primitive string, not object" {
        val sessionKey = SessionKey(testUuid)
        val serialized = json.encodeToString(SessionKeySerializer, sessionKey)

        // Should be just the UUID string, not an object
        serialized shouldBe "\"$testUuid\""
        serialized shouldNotContain "value"
        serialized shouldNotContain "{"
    }

    "SessionKey should deserialize from primitive string" {
        val jsonString = "\"$testUuid\""
        val deserialized = json.decodeFromString(SessionKeySerializer, jsonString)

        deserialized.value shouldBe testUuid
    }

    "SessionKey round-trip serialization should work correctly" {
        val original = SessionKey.generate()
        val serialized = json.encodeToString(SessionKeySerializer, original)
        val deserialized = json.decodeFromString(SessionKeySerializer, serialized)

        deserialized shouldBe original
        deserialized.value shouldBe original.value
    }

    "SessionKey encodeToJsonElement should produce JsonPrimitive" {
        val sessionKey = SessionKey(testUuid)
        val element = json.encodeToJsonElement(SessionKeySerializer, sessionKey)

        (element is JsonPrimitive) shouldBe true
        (element as JsonPrimitive).content shouldBe testUuid
    }

    // ================================================================================
    // NullableSessionKeySerializer Tests
    // ================================================================================

    "NullableSessionKeySerializer should serialize non-null value as primitive string" {
        val sessionKey: SessionKey? = SessionKey(testUuid)
        val serialized = json.encodeToString(NullableSessionKeySerializer, sessionKey)

        serialized shouldBe "\"$testUuid\""
        serialized shouldNotContain "value"
    }

    "NullableSessionKeySerializer should serialize null as null" {
        val sessionKey: SessionKey? = null
        val serialized = json.encodeToString(NullableSessionKeySerializer, sessionKey)

        serialized shouldBe "null"
    }

    "NullableSessionKeySerializer should deserialize null" {
        val deserialized = json.decodeFromString(NullableSessionKeySerializer, "null")

        deserialized shouldBe null
    }

    "NullableSessionKeySerializer should deserialize non-null value" {
        val deserialized = json.decodeFromString(NullableSessionKeySerializer, "\"$testUuid\"")

        deserialized?.value shouldBe testUuid
    }

    "NullableSessionKeySerializer round-trip with non-null value" {
        val original: SessionKey? = SessionKey.generate()
        val serialized = json.encodeToString(NullableSessionKeySerializer, original)
        val deserialized = json.decodeFromString(NullableSessionKeySerializer, serialized)

        deserialized shouldBe original
    }

    "NullableSessionKeySerializer round-trip with null value" {
        val original: SessionKey? = null
        val serialized = json.encodeToString(NullableSessionKeySerializer, original)
        val deserialized = json.decodeFromString(NullableSessionKeySerializer, serialized)

        deserialized shouldBe null
    }
})
