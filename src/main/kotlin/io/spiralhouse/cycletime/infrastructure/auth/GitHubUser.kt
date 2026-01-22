package io.spiralhouse.cycletime.infrastructure.auth

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

/**
 * GitHub user profile data returned from GitHub API.
 *
 * Represents user information fetched from GitHub's /user endpoint
 * during OAuth authentication flow.
 *
 * @property id GitHub user ID (unique identifier)
 * @property login GitHub username (unique)
 * @property name User's display name from GitHub profile (optional)
 * @property avatarUrl URL to user's avatar image (optional)
 * @property email User's email address from GitHub profile (optional)
 */
@Serializable
data class GitHubUser(
    val id: Long,
    val login: String,
    val name: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val email: String? = null
)
