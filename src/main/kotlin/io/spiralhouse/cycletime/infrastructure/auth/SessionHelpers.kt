package io.spiralhouse.cycletime.infrastructure.auth

import io.ktor.server.application.*
import io.ktor.server.sessions.*

/**
 * Get the current user session, or null if not authenticated.
 *
 * This helper function provides a cleaner way to access the user session
 * from an ApplicationCall context.
 *
 * @return UserSession if authenticated, null otherwise
 */
fun ApplicationCall.userSession(): UserSession? = sessions.get<UserSession>()

/**
 * Get the current user session, or throw AuthenticationException if not authenticated.
 *
 * This helper function is useful when an endpoint requires authentication.
 * It throws an exception if the user is not authenticated, allowing
 * centralized error handling.
 *
 * @return UserSession for the authenticated user
 * @throws AuthenticationException if not authenticated
 */
fun ApplicationCall.requireSession(): UserSession =
    userSession() ?: throw AuthenticationException("Not authenticated")
