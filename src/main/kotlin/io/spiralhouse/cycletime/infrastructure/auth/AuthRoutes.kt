package io.spiralhouse.cycletime.infrastructure.auth

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.sessions.*
import org.slf4j.LoggerFactory

/**
 * Configure authentication routes for OAuth flow.
 *
 * Routes:
 * - GET /auth/login - Initiates OAuth flow (redirects to GitHub)
 * - GET /auth/callback - Handles OAuth callback from GitHub
 * - GET /auth/logout - Clears user session
 */
fun Route.authRoutes() {
    val logger = LoggerFactory.getLogger("AuthRoutes")

    // Create HTTP client for GitHub API calls
    val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json()
        }
    }

    authenticate("github") {
        /**
         * Login endpoint - initiates GitHub OAuth flow.
         *
         * When user visits this endpoint, Ktor OAuth plugin automatically:
         * 1. Generates state parameter for CSRF protection
         * 2. Redirects user to GitHub authorization page
         * 3. GitHub prompts user to authorize application
         *
         * No manual redirect needed - Ktor handles this automatically.
         */
        get("/auth/login") {
            // Ktor OAuth plugin automatically redirects to GitHub
            // No code needed here - authentication interceptor handles redirect
        }

        /**
         * OAuth callback endpoint - handles authorization code exchange.
         *
         * GitHub redirects here after user authorizes the application.
         * This endpoint:
         * 1. Receives authorization code from GitHub
         * 2. Exchanges code for access token (automatic via Ktor OAuth)
         * 3. Fetches user profile from GitHub API
         * 4. Creates user session with profile data
         * 5. Redirects to dashboard
         *
         * Security:
         * - State parameter validated automatically by Ktor (CSRF protection)
         * - Access token never logged or exposed to client
         */
        get("/auth/callback") {
            try {
                // Extract OAuth token from Ktor principal
                val principal = call.principal<OAuthAccessTokenResponse.OAuth2>()
                    ?: throw AuthenticationException("OAuth callback failed: no principal received")

                logger.info("OAuth callback received")

                // Fetch user profile from GitHub API
                val gitHubUser = fetchGitHubUser(httpClient, principal.accessToken)

                // Create user session with GitHub profile data
                val userSession = UserSession(
                    userId = gitHubUser.id,
                    username = gitHubUser.login,
                    displayName = gitHubUser.name,
                    avatarUrl = gitHubUser.avatarUrl,
                    email = gitHubUser.email
                )

                call.sessions.set(userSession)
                logger.info("User session created for: ${gitHubUser.login}")

                // Redirect to dashboard
                call.respondRedirect("/dashboard")
            } catch (e: AuthenticationException) {
                logger.error("Authentication failed: ${e.message}")
                call.respondRedirect("/login?error=auth_failed")
            } catch (e: Exception) {
                logger.error("Unexpected error during OAuth callback: ${e.message}", e)
                call.respondRedirect("/login?error=server_error")
            }
        }
    }

    /**
     * Logout endpoint - clears user session.
     *
     * Removes session cookie and redirects to login page.
     * No server-side state to clean up (stateless session design).
     */
    get("/auth/logout") {
        val session = call.sessions.get<UserSession>()
        if (session != null) {
            logger.info("User logging out: ${session.username}")
        }

        call.sessions.clear<UserSession>()
        call.respondRedirect("/login")
    }
}

/**
 * Fetch GitHub user profile using OAuth access token.
 *
 * Calls GitHub's /user API endpoint to retrieve authenticated user information.
 * The access token is obtained from the OAuth flow handled by Ktor.
 *
 * @param client HTTP client for API calls
 * @param accessToken OAuth access token from GitHub
 * @return GitHubUser profile data
 * @throws AuthenticationException if API call fails or returns invalid data
 */
private suspend fun fetchGitHubUser(client: HttpClient, accessToken: String): GitHubUser {
    try {
        return client.get("https://api.github.com/user") {
            header(HttpHeaders.Authorization, "Bearer $accessToken")
            header(HttpHeaders.Accept, "application/json")
            header(HttpHeaders.UserAgent, "CycleTime-CE") // GitHub requires User-Agent
        }.body()
    } catch (e: Exception) {
        throw AuthenticationException("Failed to fetch GitHub user profile: ${e.message}")
    }
}
