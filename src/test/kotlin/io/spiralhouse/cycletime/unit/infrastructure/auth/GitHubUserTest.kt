package io.spiralhouse.cycletime.unit.infrastructure.auth

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.spiralhouse.cycletime.infrastructure.auth.GitHubUser
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Unit tests for GitHubUser data class.
 *
 * Verifies:
 * - Deserialization from GitHub API response format (snake_case)
 * - Handling of optional fields (name, avatar_url, email)
 * - Serialization back to JSON
 * - Data class behavior (equality, copy)
 */
class GitHubUserTest : StringSpec({

    val json = Json {
        prettyPrint = false
        isLenient = true
        ignoreUnknownKeys = true
    }

    "GitHubUser deserializes GitHub API response with all fields" {
        // Simulates actual GitHub API response format
        val apiResponse = """
            {
                "id": 12345,
                "login": "octocat",
                "name": "The Octocat",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4",
                "email": "octocat@github.com",
                "html_url": "https://github.com/octocat",
                "type": "User"
            }
        """.trimIndent()

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.id shouldBe 12345L
        user.login shouldBe "octocat"
        user.name shouldBe "The Octocat"
        user.avatarUrl shouldBe "https://avatars.githubusercontent.com/u/12345?v=4"
        user.email shouldBe "octocat@github.com"
    }

    "GitHubUser deserializes response with null optional fields" {
        val apiResponse = """
            {
                "id": 12345,
                "login": "anonymous",
                "name": null,
                "avatar_url": null,
                "email": null
            }
        """.trimIndent()

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.id shouldBe 12345L
        user.login shouldBe "anonymous"
        user.name shouldBe null
        user.avatarUrl shouldBe null
        user.email shouldBe null
    }

    "GitHubUser deserializes response with missing optional fields" {
        // GitHub API may not return optional fields at all
        val apiResponse = """
            {
                "id": 12345,
                "login": "minimal"
            }
        """.trimIndent()

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.id shouldBe 12345L
        user.login shouldBe "minimal"
        user.name shouldBe null
        user.avatarUrl shouldBe null
        user.email shouldBe null
    }

    "GitHubUser handles snake_case avatar_url from GitHub API" {
        // Verify SerialName annotation works for avatar_url -> avatarUrl
        val apiResponse = """{"id": 12345, "login": "test", "avatar_url": "https://example.com/avatar.png"}"""

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.avatarUrl shouldBe "https://example.com/avatar.png"
    }

    "GitHubUser serializes back to JSON with snake_case" {
        val user = GitHubUser(
            id = 12345L,
            login = "testuser",
            name = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com"
        )

        val jsonString = json.encodeToString(user)

        // Should serialize with snake_case due to @SerialName annotation
        jsonString shouldBe """{"id":12345,"login":"testuser","name":"Test User","avatar_url":"https://example.com/avatar.png","email":"test@example.com"}"""
    }

    "GitHubUser ignores unknown fields from GitHub API" {
        // GitHub API returns many more fields than we need
        val apiResponse = """
            {
                "id": 12345,
                "login": "octocat",
                "node_id": "MDQ6VXNlcjEyMzQ1",
                "gravatar_id": "",
                "url": "https://api.github.com/users/octocat",
                "html_url": "https://github.com/octocat",
                "followers_url": "https://api.github.com/users/octocat/followers",
                "following_url": "https://api.github.com/users/octocat/following{/other_user}",
                "gists_url": "https://api.github.com/users/octocat/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/octocat/starred{/owner}{/repo}",
                "repos_url": "https://api.github.com/users/octocat/repos",
                "events_url": "https://api.github.com/users/octocat/events{/privacy}",
                "received_events_url": "https://api.github.com/users/octocat/received_events",
                "type": "User",
                "user_view_type": "public",
                "site_admin": false,
                "name": "The Octocat",
                "company": "@github",
                "blog": "https://github.blog",
                "location": "San Francisco",
                "hireable": null,
                "bio": "Just a cat in a box",
                "twitter_username": "github",
                "public_repos": 8,
                "public_gists": 8,
                "followers": 1000,
                "following": 9,
                "created_at": "2011-01-25T18:44:36Z",
                "updated_at": "2024-01-15T12:00:00Z",
                "avatar_url": "https://avatars.githubusercontent.com/u/12345?v=4",
                "email": "octocat@github.com"
            }
        """.trimIndent()

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.id shouldBe 12345L
        user.login shouldBe "octocat"
        user.name shouldBe "The Octocat"
        user.avatarUrl shouldBe "https://avatars.githubusercontent.com/u/12345?v=4"
        user.email shouldBe "octocat@github.com"
    }

    "GitHubUser data class equality works correctly" {
        val user1 = GitHubUser(
            id = 12345L,
            login = "testuser",
            name = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com"
        )

        val user2 = GitHubUser(
            id = 12345L,
            login = "testuser",
            name = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com"
        )

        user1 shouldBe user2
    }

    "GitHubUser data class inequality for different ids" {
        val user1 = GitHubUser(
            id = 12345L,
            login = "testuser",
            name = null,
            avatarUrl = null,
            email = null
        )

        val user2 = GitHubUser(
            id = 67890L,
            login = "testuser",
            name = null,
            avatarUrl = null,
            email = null
        )

        (user1 == user2) shouldBe false
    }

    "GitHubUser handles special characters in login" {
        val apiResponse = """{"id": 12345, "login": "test-user_123", "name": null, "avatar_url": null, "email": null}"""

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.login shouldBe "test-user_123"
    }

    "GitHubUser handles unicode characters in name" {
        val apiResponse = """{"id": 12345, "login": "test", "name": "Test \u00e9\u00e0\u00fc\u4e2d\u6587", "avatar_url": null, "email": null}"""

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.name shouldBe "Test \u00e9\u00e0\u00fc\u4e2d\u6587"
    }

    "GitHubUser handles very long avatar URLs" {
        val longUrl = "https://avatars.githubusercontent.com/u/12345?v=4&" + "x".repeat(500)
        val apiResponse = """{"id": 12345, "login": "test", "avatar_url": "$longUrl"}"""

        val user = json.decodeFromString<GitHubUser>(apiResponse)

        user.avatarUrl shouldBe longUrl
    }

    "GitHubUser copy preserves unchanged fields" {
        val original = GitHubUser(
            id = 12345L,
            login = "testuser",
            name = "Test User",
            avatarUrl = "https://example.com/avatar.png",
            email = "test@example.com"
        )

        val copied = original.copy(email = "new@example.com")

        copied.id shouldBe original.id
        copied.login shouldBe original.login
        copied.name shouldBe original.name
        copied.avatarUrl shouldBe original.avatarUrl
        copied.email shouldBe "new@example.com"
    }

    "GitHubUser conversion to UserSession" {
        // Test the implicit conversion pattern used in AuthRoutes
        val gitHubUser = GitHubUser(
            id = 12345L,
            login = "octocat",
            name = "The Octocat",
            avatarUrl = "https://avatars.githubusercontent.com/u/12345?v=4",
            email = "octocat@github.com"
        )

        // This mirrors the conversion done in AuthRoutes callback
        val userSession = io.spiralhouse.cycletime.infrastructure.auth.UserSession(
            userId = gitHubUser.id,
            username = gitHubUser.login,
            displayName = gitHubUser.name,
            avatarUrl = gitHubUser.avatarUrl,
            email = gitHubUser.email
        )

        userSession.userId shouldBe gitHubUser.id
        userSession.username shouldBe gitHubUser.login
        userSession.displayName shouldBe gitHubUser.name
        userSession.avatarUrl shouldBe gitHubUser.avatarUrl
        userSession.email shouldBe gitHubUser.email
    }
})
