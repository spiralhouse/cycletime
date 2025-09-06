package io.spiralhouse.cycletime.application.commands

import io.spiralhouse.cycletime.domain.valueobjects.SessionId

/**
 * Command for ending a work session.
 * 
 * RED PHASE: Minimal implementation for test compilation.
 */
data class EndSessionCommand(
    val id: SessionId,
    val summary: String? = null
)