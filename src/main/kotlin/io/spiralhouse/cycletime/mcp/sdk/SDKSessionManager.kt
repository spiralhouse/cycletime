package io.spiralhouse.cycletime.mcp.sdk

import io.spiralhouse.cycletime.application.commands.CreateSessionCommand
import io.spiralhouse.cycletime.application.dto.SessionDto
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.valueobjects.SessionKey
import org.slf4j.LoggerFactory

/**
 * Session manager for SDK-based transport layer.
 *
 * Unlike the EventBus architecture (stateful session channels), the SDK uses stateless
 * per-request transport. Session state is stored in the database and retrieved per request
 * based on session ID from request metadata.
 *
 * This manager provides:
 * - Session validation for incoming requests
 * - Session creation for initial bootstrap
 * - Bridge between SDK transport and domain/application layers
 *
 * Session lifecycle is now entirely managed at the application/domain layer, with the
 * transport layer only responsible for extracting session context and delegating to
 * business logic.
 *
 * @property sessionService Application service for session operations
 */
class SDKSessionManager(
    private val sessionService: SessionApplicationService
) {
    private val logger = LoggerFactory.getLogger(SDKSessionManager::class.java)

    /**
     * Get existing session or create new one.
     *
     * Used for initial session bootstrap when client doesn't have a sessionId yet.
     * After bootstrap, clients should include sessionId in all subsequent requests.
     *
     * @param sessionId Session identifier
     * @return Existing or newly created session
     */
    suspend fun getOrCreateSession(sessionId: String): SessionDto {
        return sessionService.getSession(SessionKey(sessionId))
            ?: sessionService.createSession(CreateSessionCommand(projectId = null)).also {
                logger.info("Created new session: $sessionId (no project association)")
            }
    }

    /**
     * Validate that session exists in database.
     *
     * Used to verify session ID from request metadata before processing tools/resources.
     * Throws IllegalStateException if session not found (invalid or expired session ID).
     *
     * @param sessionId Session identifier from request metadata
     * @return Session if valid
     * @throws IllegalStateException if session not found
     */
    suspend fun validateSession(sessionId: String): SessionDto {
        return sessionService.getSession(SessionKey(sessionId))
            ?: throw IllegalStateException("Invalid or expired session: $sessionId")
    }

    /**
     * Get session if it exists, without throwing on missing session.
     *
     * Useful for optional session context (e.g., listing public resources).
     *
     * @param sessionId Session identifier from request metadata
     * @return Session if found, null otherwise
     */
    suspend fun getSessionOrNull(sessionId: String): SessionDto? {
        return sessionService.getSession(SessionKey(sessionId))
    }
}
