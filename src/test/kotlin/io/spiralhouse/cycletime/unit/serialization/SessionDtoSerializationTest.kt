package io.spiralhouse.cycletime.unit.serialization

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldNotContain
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.domain.entities.SessionContext
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import kotlinx.datetime.Clock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

/**
 * Unit tests for SessionDto serialization.
 *
 * Verifies that SessionDto fields serialize correctly:
 * - SessionKey as primitive string (not object with "value" field)
 * - ProjectId as primitive string (not object with "value" field)
 * - Instant fields as ISO-8601 strings
 *
 * This is the fix for SPI-1277 - inconsistent value class serialization.
 */
class SessionDtoSerializationTest : StringSpec({

    val json = Json {
        encodeDefaults = true
        prettyPrint = false
    }

    val testSessionKey = "550e8400-e29b-41d4-a716-446655440000"
    val testProjectId = "660e8400-e29b-41d4-a716-446655440001"
    val now = Clock.System.now()

    // ================================================================================
    // SessionDto Serialization Tests
    // ================================================================================

    "SessionDto sessionKey should serialize as primitive string" {
        val dto = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = ProjectId.fromString(testProjectId),
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), dto)
        val jsonObj = json.parseToJsonElement(serialized).jsonObject

        // sessionKey should be a JsonPrimitive, not an object
        val sessionKeyElement = jsonObj["sessionKey"]
        (sessionKeyElement is JsonPrimitive) shouldBe true
        (sessionKeyElement as JsonPrimitive).content shouldBe testSessionKey

        // Verify no "value" wrapper in the serialized output
        serialized shouldNotContain """"sessionKey":{"value":"""
    }

    "SessionDto projectId should serialize as primitive string" {
        val dto = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = ProjectId.fromString(testProjectId),
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), dto)
        val jsonObj = json.parseToJsonElement(serialized).jsonObject

        // projectId should be a JsonPrimitive, not an object
        val projectIdElement = jsonObj["projectId"]
        (projectIdElement is JsonPrimitive) shouldBe true
        (projectIdElement as JsonPrimitive).content shouldBe testProjectId

        // Verify no "value" wrapper in the serialized output
        serialized shouldNotContain """"projectId":{"value":"""
    }

    "SessionDto null projectId should serialize as null" {
        val dto = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = null,
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), dto)
        val jsonObj = json.parseToJsonElement(serialized).jsonObject

        // projectId should be null
        val projectIdElement = jsonObj["projectId"]
        projectIdElement shouldBe kotlinx.serialization.json.JsonNull
    }

    "SessionDto should not contain any value wrappers in serialized output" {
        val dto = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = ProjectId.fromString(testProjectId),
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), dto)

        // Ensure no value class object wrappers
        serialized shouldNotContain """{"value":"""
        serialized shouldNotContain """"_value":"""
    }

    "SessionDto round-trip serialization should work correctly" {
        val original = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = ProjectId.fromString(testProjectId),
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), original)
        val deserialized = json.decodeFromString(SessionDto.serializer(), serialized)

        deserialized.sessionKey shouldBe original.sessionKey
        deserialized.projectId shouldBe original.projectId
        deserialized.lastActivity shouldBe original.lastActivity
        deserialized.createdAt shouldBe original.createdAt
        deserialized.updatedAt shouldBe original.updatedAt
    }

    "SessionDto with null projectId round-trip serialization" {
        val original = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = null,
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), original)
        val deserialized = json.decodeFromString(SessionDto.serializer(), serialized)

        deserialized.sessionKey shouldBe original.sessionKey
        deserialized.projectId shouldBe null
    }

    "SessionDto Instant fields should serialize as ISO-8601 strings" {
        val dto = SessionDto(
            sessionKey = SessionKey(testSessionKey),
            projectId = null,
            currentContext = SessionContext(),
            lastActivity = now,
            createdAt = now,
            updatedAt = now
        )

        val serialized = json.encodeToString(SessionDto.serializer(), dto)
        val jsonObj = json.parseToJsonElement(serialized).jsonObject

        // All Instant fields should be primitives (strings)
        val lastActivity = jsonObj["lastActivity"]
        val createdAt = jsonObj["createdAt"]
        val updatedAt = jsonObj["updatedAt"]

        (lastActivity is JsonPrimitive) shouldBe true
        (createdAt is JsonPrimitive) shouldBe true
        (updatedAt is JsonPrimitive) shouldBe true
    }
})
