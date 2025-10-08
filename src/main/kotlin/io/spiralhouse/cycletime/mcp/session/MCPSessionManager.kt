package io.spiralhouse.cycletime.mcp.session

import io.spiralhouse.cycletime.domain.services.TimeProvider
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.datetime.Instant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlin.time.Duration
import kotlin.time.Duration.Companion.minutes
import kotlin.time.Duration.Companion.seconds

/**
 * Represents an MCP session for SSE transport.
 *
 * Each session tracks active SSE connections, request state, and activity timestamps
 * for timeout and cleanup purposes.
 *
 * @property id Unique session identifier
 * @property createdAt Session creation timestamp
 * @property lastActivity Last activity timestamp (immutable - use copy() to update)
 * @property sseConnections Set of active SSE connection IDs
 * @property state Mutable state storage for correlation and session data
 */
data class MCPSession(
    val id: String,
    val createdAt: Instant,
    val lastActivity: Instant,
    val sseConnections: MutableSet<String> = mutableSetOf(),
    val state: MutableMap<String, Any> = mutableMapOf()
)

/**
 * Exception thrown when session limit is exceeded.
 */
class TooManySessionsException(message: String) : Exception(message)

/**
 * Manages MCP sessions for the SSE transport layer.
 *
 * This class handles session lifecycle, validation, cleanup, and state management.
 * It provides thread-safe operations for concurrent session access.
 *
 * @property timeProvider Time provider for testable time handling
 * @property sessionTimeout Session idle timeout (default 5 minutes)
 * @property maxSessions Maximum concurrent sessions allowed (default 100)
 * @property cleanupInterval Interval between automatic cleanup runs (default 30 seconds)
 */
class MCPSessionManager(
    private val timeProvider: TimeProvider,
    private val sessionTimeout: Duration = DEFAULT_SESSION_TIMEOUT,
    private val maxSessions: Int = DEFAULT_MAX_SESSIONS,
    private val cleanupInterval: Duration = DEFAULT_CLEANUP_INTERVAL
) {
    private val sessions = ConcurrentHashMap<String, MCPSession>()
    private val mutex = Mutex()
    private var cleanupJob: Job? = null

    companion object {
        val DEFAULT_SESSION_TIMEOUT = 5.minutes
        const val DEFAULT_MAX_SESSIONS = 100
        val DEFAULT_CLEANUP_INTERVAL = 30.seconds
    }

    /**
     * Gets or creates a session with the given ID.
     *
     * @param sessionId The session identifier
     * @return The session object
     * @throws SecurityException if session ID format is invalid
     * @throws TooManySessionsException if session limit is exceeded
     */
    suspend fun getOrCreateSession(sessionId: String): MCPSession {
        // Validate session ID format for security
        if (!validateSessionId(sessionId)) {
            throw SecurityException("Invalid session ID format")
        }

        return mutex.withLock {
            // Check if session already exists
            sessions[sessionId]?.let { existingSession ->
                val updated = existingSession.copy(lastActivity = timeProvider.now())
                sessions[sessionId] = updated
                return updated
            }

            // Check session limit before creating new session
            if (sessions.size >= maxSessions) {
                // Try cleanup first
                cleanupExpiredSessionsInternal()

                if (sessions.size >= maxSessions) {
                    throw TooManySessionsException("Session limit of $maxSessions exceeded")
                }
            }

            // Create new session
            val session = MCPSession(
                id = sessionId,
                createdAt = timeProvider.now(),
                lastActivity = timeProvider.now()
            )
            sessions[sessionId] = session
            session
        }
    }

    /**
     * Retrieves an existing session.
     *
     * @param sessionId The session identifier
     * @return The session object, or null if not found
     */
    suspend fun getSession(sessionId: String): MCPSession? {
        return sessions[sessionId]?.let { existingSession ->
            val updated = existingSession.copy(lastActivity = timeProvider.now())
            sessions[sessionId] = updated
            updated
        }
    }

    /**
     * Updates the last activity timestamp for a session.
     *
     * @param sessionId The session identifier
     */
    suspend fun updateActivity(sessionId: String) {
        sessions[sessionId]?.let { existingSession ->
            sessions[sessionId] = existingSession.copy(lastActivity = timeProvider.now())
        }
    }

    /**
     * Registers an SSE connection with a session.
     *
     * @param sessionId The session identifier
     * @param connectionId The connection identifier
     */
    suspend fun registerSSEConnection(sessionId: String, connectionId: String) {
        // Get or create session if it doesn't exist
        val session = getOrCreateSession(sessionId)
        session.sseConnections.add(connectionId)
    }

    /**
     * Unregisters an SSE connection from a session.
     *
     * @param sessionId The session identifier
     * @param connectionId The connection identifier
     */
    suspend fun unregisterSSEConnection(sessionId: String, connectionId: String) {
        sessions[sessionId]?.sseConnections?.remove(connectionId)
    }

    /**
     * Removes expired sessions based on the session timeout.
     */
    suspend fun cleanupExpiredSessions() {
        mutex.withLock {
            cleanupExpiredSessionsInternal()
        }
    }

    /**
     * Internal cleanup without acquiring mutex (caller must hold mutex).
     */
    private fun cleanupExpiredSessionsInternal() {
        val now = timeProvider.now()
        sessions.entries.removeIf { (_, session) ->
            val age = now - session.lastActivity
            age > sessionTimeout
        }
    }

    /**
     * Gets a list of all active session IDs.
     *
     * @return List of session IDs
     */
    suspend fun getActiveSessions(): List<String> {
        return sessions.keys.toList()
    }

    /**
     * Sets session state for correlation and data storage.
     *
     * @param sessionId The session identifier
     * @param key The state key
     * @param value The state value
     */
    suspend fun setSessionState(sessionId: String, key: String, value: Any) {
        sessions[sessionId]?.state?.put(key, value)
    }

    /**
     * Gets session state value.
     *
     * @param sessionId The session identifier
     * @param key The state key
     * @return The state value, or null if not found
     */
    suspend fun <T> getSessionState(sessionId: String, key: String): T? {
        @Suppress("UNCHECKED_CAST")
        return sessions[sessionId]?.state?.get(key) as? T
    }

    /**
     * Clears all state for a session and removes it.
     *
     * @param sessionId The session identifier
     */
    suspend fun clearSession(sessionId: String) {
        sessions.remove(sessionId)
    }

    /**
     * Gets the count of active sessions.
     *
     * @return Number of active sessions
     */
    fun sessionCount(): Int = sessions.size

    /**
     * Starts automatic cleanup of expired sessions.
     *
     * @param scope Coroutine scope for the cleanup job
     */
    fun startCleanup(scope: CoroutineScope) {
        cleanupJob?.cancel() // Cancel any existing job
        cleanupJob = scope.launch {
            while (true) {
                delay(cleanupInterval)
                cleanupExpiredSessions()
            }
        }
    }

    /**
     * Shuts down the session manager and cancels automatic cleanup.
     */
    fun shutdown() {
        cleanupJob?.cancel()
        cleanupJob = null
    }
}

/**
 * Parses and validates a session ID from a header value.
 *
 * @param header The header value
 * @return The validated session ID
 * @throws SecurityException if session ID is invalid
 */
fun parseSessionHeader(header: String): String {
    if (!validateSessionId(header)) {
        throw SecurityException("Invalid session ID format")
    }
    return header
}

/**
 * Validates a session ID format for security.
 *
 * Checks for:
 * - Header injection attempts (newlines, carriage returns, null bytes)
 * - Path traversal attempts
 * - SQL injection attempts
 * - Valid length (8-128 characters)
 * - Valid characters (alphanumeric and hyphens only)
 *
 * @param sessionId The session ID to validate
 * @return true if valid, false otherwise
 */
fun validateSessionId(sessionId: String): Boolean {
    // Check length
    if (sessionId.length < 8 || sessionId.length > 128) {
        return false
    }

    // Check for injection attacks
    if (sessionId.contains('\n') ||
        sessionId.contains('\r') ||
        sessionId.contains('\u0000') ||
        sessionId.contains("..") ||
        sessionId.contains(';')) {
        return false
    }

    // Check valid characters (alphanumeric and hyphens only)
    return sessionId.matches(Regex("^[a-zA-Z0-9-]+$"))
}

/**
 * Generates a new secure session ID.
 *
 * @return A UUID-based session ID
 */
fun generateSessionId(): String {
    return UUID.randomUUID().toString()
}
