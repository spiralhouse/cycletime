package io.spiralhouse.cycletime.domain.valueobjects

/**
 * Session status values for tracking session lifecycle.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
enum class SessionStatus {
    ACTIVE,
    COMPLETED,
    PAUSED,
    CANCELLED
}