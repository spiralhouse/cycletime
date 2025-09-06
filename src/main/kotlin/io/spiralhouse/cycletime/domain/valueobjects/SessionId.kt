package io.spiralhouse.cycletime.domain.valueobjects

/**
 * Session identifier value object.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
@JvmInline
value class SessionId(val value: String) {
    init {
        require(value.isNotBlank()) { "Session ID cannot be blank" }
    }
}