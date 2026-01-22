package io.spiralhouse.cycletime.unit.infrastructure.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.longs.shouldBeGreaterThan
import io.kotest.matchers.longs.shouldBeLessThanOrEqual
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.infrastructure.auth.UserSession
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Unit tests for UserSession data class.
 *
 * Verifies:
 * - JSON serialization/deserialization for cookie storage
 * - Default createdAt timestamp behavior
 * - Data class equality and copy behavior
 * - All fields are properly serialized
 */
class UserSessionTest : StringSpec({

    val json = Json {
        prettyPrint = false
        isLenient = true
        ignoreUnknownKeys = true
    }

    "UserSession serializes to JSON correctly with all fields" {
        val session = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = "Test User",
            avatarUrl = "https://avatars.githubusercontent.com/u/12345",
            email = "test@example.com",
            createdAt = 1704067200000L // 2024-01-01T00:00:00Z
        )

        val jsonString = json.encodeToString(session)

        jsonString shouldBe """{"userId":12345,"username":"testuser","displayName":"Test User","avatarUrl":"https://avatars.githubusercontent.com/u/12345","email":"test@example.com","createdAt":1704067200000}"""
    }

    "UserSession deserializes from JSON correctly" {
        val jsonString = """{"userId":12345,"username":"testuser","displayName":"Test User","avatarUrl":"https://avatars.githubusercontent.com/u/12345","email":"test@example.com","createdAt":1704067200000}"""

        val session = json.decodeFromString<UserSession>(jsonString)

        session.userId shouldBe 12345L
        session.username shouldBe "testuser"
        session.displayName shouldBe "Test User"
        session.avatarUrl shouldBe "https://avatars.githubusercontent.com/u/12345"
        session.email shouldBe "test@example.com"
        session.createdAt shouldBe 1704067200000L
    }

    "UserSession createdAt defaults to current time when not specified" {
        val beforeCreation = System.currentTimeMillis()
        val session = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = null,
            avatarUrl = null,
            email = null
        )
        val afterCreation = System.currentTimeMillis()

        session.createdAt shouldBeGreaterThan (beforeCreation - 1)
        session.createdAt shouldBeLessThanOrEqual afterCreation
    }

    "UserSession serializes correctly with null optional fields" {
        val session = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = null,
            avatarUrl = null,
            email = null,
            createdAt = 1704067200000L
        )

        val jsonString = json.encodeToString(session)

        jsonString shouldBe """{"userId":12345,"username":"testuser","displayName":null,"avatarUrl":null,"email":null,"createdAt":1704067200000}"""
    }

    "UserSession deserializes correctly with null optional fields" {
        val jsonString = """{"userId":12345,"username":"testuser","displayName":null,"avatarUrl":null,"email":null,"createdAt":1704067200000}"""

        val session = json.decodeFromString<UserSession>(jsonString)

        session.userId shouldBe 12345L
        session.username shouldBe "testuser"
        session.displayName shouldBe null
        session.avatarUrl shouldBe null
        session.email shouldBe null
    }

    "UserSession createdAt defaults when missing from JSON" {
        // createdAt has a default value, so it can be omitted from JSON
        // However, nullable fields (displayName, avatarUrl, email) must be present
        // because they don't have default values in the data class
        val jsonString = """{"userId":12345,"username":"testuser","displayName":null,"avatarUrl":null,"email":null}"""

        val lenientJson = Json {
            isLenient = true
            ignoreUnknownKeys = true
        }

        val session = lenientJson.decodeFromString<UserSession>(jsonString)

        session.userId shouldBe 12345L
        session.username shouldBe "testuser"
        session.displayName shouldBe null
        session.avatarUrl shouldBe null
        session.email shouldBe null
        // createdAt should default to current time since it was missing from JSON
        session.createdAt shouldNotBe null
    }

    "UserSession data class equality works correctly" {
        val session1 = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com",
            createdAt = 1704067200000L
        )

        val session2 = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com",
            createdAt = 1704067200000L
        )

        session1 shouldBe session2
    }

    "UserSession data class inequality for different userId" {
        val session1 = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = null,
            avatarUrl = null,
            email = null,
            createdAt = 1704067200000L
        )

        val session2 = UserSession(
            userId = 67890L,
            username = "testuser",
            displayName = null,
            avatarUrl = null,
            email = null,
            createdAt = 1704067200000L
        )

        (session1 == session2) shouldBe false
    }

    "UserSession copy preserves unchanged fields" {
        val original = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com",
            createdAt = 1704067200000L
        )

        val copied = original.copy(displayName = "Updated Name")

        copied.userId shouldBe original.userId
        copied.username shouldBe original.username
        copied.displayName shouldBe "Updated Name"
        copied.avatarUrl shouldBe original.avatarUrl
        copied.email shouldBe original.email
        copied.createdAt shouldBe original.createdAt
    }

    "UserSession handles special characters in username" {
        val session = UserSession(
            userId = 12345L,
            username = "test-user_123",
            displayName = "Test User <script>",
            avatarUrl = null,
            email = null,
            createdAt = 1704067200000L
        )

        val jsonString = json.encodeToString(session)
        val deserialized = json.decodeFromString<UserSession>(jsonString)

        deserialized.username shouldBe "test-user_123"
        deserialized.displayName shouldBe "Test User <script>"
    }

    "UserSession handles unicode characters in displayName" {
        val session = UserSession(
            userId = 12345L,
            username = "testuser",
            displayName = "Test User \uD83D\uDE00",
            avatarUrl = null,
            email = null,
            createdAt = 1704067200000L
        )

        val jsonString = json.encodeToString(session)
        val deserialized = json.decodeFromString<UserSession>(jsonString)

        deserialized.displayName shouldBe "Test User \uD83D\uDE00"
    }
})
