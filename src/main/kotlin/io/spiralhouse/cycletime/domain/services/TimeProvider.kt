package io.spiralhouse.cycletime.domain.services

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

interface TimeProvider {
    fun now(): Instant
}

class SystemTimeProvider : TimeProvider {
    override fun now(): Instant = Clock.System.now()
}

class MockTimeProvider(private var currentTime: Instant = Clock.System.now()) : TimeProvider {
    override fun now(): Instant = currentTime

    fun setTime(time: Instant) {
        currentTime = time
    }

    fun advance(duration: kotlin.time.Duration) {
        currentTime = currentTime + duration
    }
}
