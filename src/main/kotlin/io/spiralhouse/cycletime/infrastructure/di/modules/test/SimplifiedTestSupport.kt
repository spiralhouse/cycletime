package io.spiralhouse.cycletime.infrastructure.di.modules.test

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.DIProfile
import io.spiralhouse.cycletime.infrastructure.di.SimplifiedDI
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlin.time.Duration

/**
 * Fixed time provider for testing.
 */
class FixedTimeProvider(private var currentTime: Instant) : TimeProvider {
    override fun now(): Instant = currentTime
    
    fun setTime(time: Instant) {
        currentTime = time
    }
    
    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
}

/**
 * Configure test dependencies using Ktor's native DI.
 * 
 * This provides a simple way to set up dependencies for testing
 * with optional mocking support.
 */
fun Application.configureTestDependencies(
    timeProvider: TimeProvider = FixedTimeProvider(Clock.System.now())
) {
    // Configure the standard test dependencies
    with(SimplifiedDI) {
        configureDependencies(DIProfile.TEST, timeProvider)
    }
}

/**
 * Test helper to create a fixed time provider with a specific time.
 */
fun testTimeProvider(time: String = "2024-01-01T00:00:00Z"): FixedTimeProvider {
    return FixedTimeProvider(Instant.parse(time))
}