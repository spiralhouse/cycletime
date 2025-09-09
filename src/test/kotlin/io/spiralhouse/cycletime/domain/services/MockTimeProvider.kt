package io.spiralhouse.cycletime.domain.services

import kotlinx.datetime.Clock
import kotlinx.datetime.Instant

/**
 * Mock implementation of TimeProvider for testing.
 * 
 * Allows precise control over time in tests without delays or flakiness.
 * This was moved from production code to maintain clean separation between
 * production and test code.
 */
class MockTimeProvider(private var currentTime: Instant = Clock.System.now()) : TimeProvider {
    override fun now(): Instant = currentTime

    fun setTime(time: Instant) {
        currentTime = time
    }

    fun advance(duration: kotlin.time.Duration) {
        currentTime = currentTime + duration
    }
}