package io.spiralhouse.cycletime.infrastructure.auth

/**
 * Exception thrown when OAuth authentication fails.
 *
 * This exception is thrown during the OAuth flow when:
 * - User denies authorization
 * - OAuth callback receives invalid state parameter
 * - Token exchange with GitHub fails
 * - User profile fetch from GitHub fails
 *
 * @param message Description of the authentication failure
 */
class AuthenticationException(message: String) : RuntimeException(message)
