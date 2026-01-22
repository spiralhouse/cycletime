package io.spiralhouse.cycletime.infrastructure.config

/**
 * OAuth configuration for GitHub authentication.
 *
 * Contains OAuth client credentials and endpoint URLs for GitHub OAuth flow.
 *
 * @property clientId OAuth application client ID from GitHub
 * @property clientSecret OAuth application client secret from GitHub
 * @property callbackUrl Callback URL registered with GitHub OAuth app
 * @property authorizeUrl GitHub OAuth authorization endpoint
 * @property accessTokenUrl GitHub OAuth token exchange endpoint
 * @property userInfoUrl GitHub user information API endpoint
 */
data class OAuthConfig(
    val clientId: String,
    val clientSecret: String,
    val callbackUrl: String,
    val authorizeUrl: String = "https://github.com/login/oauth/authorize",
    val accessTokenUrl: String = "https://github.com/login/oauth/access_token",
    val userInfoUrl: String = "https://api.github.com/user"
)
