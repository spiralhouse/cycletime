package io.spiralhouse.cycletime.infrastructure.auth

import kotlinx.serialization.Serializable

/**
 * User session data stored in cookies.
 *
 * Represents authenticated user information stored in session cookies.
 * This data class is serializable to support Ktor's session management.
 *
 * @property userId GitHub user ID
 * @property username GitHub username
 * @property displayName User's display name from GitHub profile
 * @property avatarUrl URL to user's avatar image
 * @property email User's email address from GitHub profile
 * @property createdAt Timestamp when session was created (milliseconds since epoch)
 */
@Serializable
data class UserSession(
    val userId: Long,
    val username: String,
    val displayName: String?,
    val avatarUrl: String?,
    val email: String?,
    val createdAt: Long = System.currentTimeMillis()
)
