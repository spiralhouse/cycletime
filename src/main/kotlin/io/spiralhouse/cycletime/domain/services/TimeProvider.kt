package io.spiralhouse.cycletime.domain.services

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}
