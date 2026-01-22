package io.spiralhouse.cycletime.infrastructure.auth

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.sessions.*
import io.spiralhouse.cycletime.infrastructure.config.OAuthConfig

/**
 * Configure OAuth authentication for the application.
 *
 * This module sets up:
 * - GitHub OAuth provider configuration
 * - Cookie-based session management for authenticated users
 *
 * OAuth Flow:
 * 1. User visits /auth/login
 * 2. Ktor redirects to GitHub authorization page
 * 3. User authorizes application on GitHub
 * 4. GitHub redirects to /auth/callback with authorization code
 * 5. Ktor exchanges authorization code for access token
 * 6. Application fetches user profile from GitHub
 * 7. Session created with user information
 *
 * Security Features:
 * - State parameter validation (CSRF protection - automatic)
 * - Secure session cookies (httpOnly, secure in production)
 * - No token logging (security compliance)
 *
 * Note: This implementation requires ktor-client-core, ktor-client-cio, and
 * ktor-client-content-negotiation dependencies for the OAuth HTTP client.
 * These dependencies should be added in build.gradle.kts.
 */
fun Application.configureOAuth() {
    // Determine if running in development mode (check FIRST before loading config)
    val isDevelopment = environment.config.propertyOrNull("ktor.development")?.getString()?.toBoolean()
        ?: (System.getenv("KTOR_DEVELOPMENT")?.toBoolean() ?: false)

    val config = loadOAuthConfig(isDevelopment)

    // Load session configuration with security validation
    val sessionSecret = environment.config.propertyOrNull("session.secret")?.getString()
        ?: System.getenv("SESSION_SECRET")
        ?: if (isDevelopment) "development-secret-change-in-production" else
            throw IllegalArgumentException("SESSION_SECRET environment variable required in production (min 32 chars)")

    // Validate session secret length for HMAC-SHA256 security
    require(sessionSecret.length >= 32 || isDevelopment) {
        "SESSION_SECRET must be at least 32 characters for HMAC-SHA256 security (current: ${sessionSecret.length} chars)"
    }

    val sessionMaxAge = environment.config.propertyOrNull("session.maxAgeSeconds")?.getString()?.toLong()
        ?: 604800L // Default: 7 days

    // Install cookie-based session management
    install(Sessions) {
        cookie<UserSession>("user_session") {
            cookie.path = "/"
            cookie.maxAgeInSeconds = sessionMaxAge

            // Security settings
            cookie.httpOnly = true
            cookie.secure = !isDevelopment // HTTPS in production
            cookie.extensions["SameSite"] = "Lax"

            // Sign cookies with HMAC-SHA256 to prevent tampering
            transform(SessionTransportTransformerMessageAuthentication(
                key = sessionSecret.toByteArray(),
                algorithm = "HmacSHA256"
            ))
        }
    }

    // Install OAuth authentication
    // Note: The OAuth plugin will create its own HttpClient internally
    // We'll configure the HTTP client in the authRoutes when we fetch user profile
    install(Authentication) {
        oauth("github") {
            urlProvider = { config.callbackUrl }
            providerLookup = {
                OAuthServerSettings.OAuth2ServerSettings(
                    name = "github",
                    authorizeUrl = config.authorizeUrl,
                    accessTokenUrl = config.accessTokenUrl,
                    requestMethod = HttpMethod.Post,
                    clientId = config.clientId,
                    clientSecret = config.clientSecret,
                    defaultScopes = listOf("read:user", "user:email")
                )
            }
            // Ktor OAuth plugin creates its own HTTP client for token exchange
            // We don't need to provide one explicitly
        }
    }
}

/**
 * Load OAuth configuration from application config and environment variables.
 *
 * Configuration sources (priority order):
 * 1. Environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL)
 * 2. application.conf oauth.github section
 * 3. Defaults (for development only)
 *
 * @return OAuthConfig with GitHub OAuth settings
 * @throws IllegalArgumentException if required configuration is missing in production
 */
private fun Application.loadOAuthConfig(isDevelopment: Boolean): OAuthConfig {
    val githubConfig = environment.config.config("oauth.github")

    val clientId = githubConfig.propertyOrNull("clientId")?.getString()
        ?: System.getenv("GITHUB_CLIENT_ID")
        ?: if (isDevelopment) "dev-client-id" else
            throw IllegalArgumentException("GitHub OAuth client ID is required (set GITHUB_CLIENT_ID environment variable)")

    val clientSecret = githubConfig.propertyOrNull("clientSecret")?.getString()
        ?: System.getenv("GITHUB_CLIENT_SECRET")
        ?: if (isDevelopment) "dev-client-secret" else
            throw IllegalArgumentException("GitHub OAuth client secret is required (set GITHUB_CLIENT_SECRET environment variable)")

    val callbackUrl = githubConfig.propertyOrNull("callbackUrl")?.getString()
        ?: System.getenv("GITHUB_CALLBACK_URL")
        ?: "http://localhost:8080/auth/callback" // Development default

    return OAuthConfig(
        clientId = clientId,
        clientSecret = clientSecret,
        callbackUrl = callbackUrl
    )
}
