package io.spiralhouse.cycletime.infrastructure.di.modules

import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.infrastructure.di.core.AbstractDIModule
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.di.modules.test.FixedTimeProvider
import kotlinx.datetime.Instant

/**
 * Domain layer dependency injection module.
 * 
 * This module configures all domain services and ensures the domain layer
 * remains independent of infrastructure concerns.
 */
class DomainModule : AbstractDIModule() {
    
    override val name: String = "DomainModule"
    override val priority: Int = 10 // Domain configured first
    
    override fun configureCommon(builder: DIContainer.Builder) {
        // Domain services that are common across all profiles
        // Note: Most domain services are configured per-profile due to testing needs
    }
    
    override fun configureDev(builder: DIContainer.Builder) {
        // Development uses real time
        builder.singleton<TimeProvider> { SystemTimeProvider() }
    }
    
    override fun configureTest(builder: DIContainer.Builder) {
        // Test uses fixed time for deterministic testing
        builder.singleton<TimeProvider> { 
            FixedTimeProvider(Instant.parse("2024-01-01T00:00:00Z"))
        }
    }
    
    override fun configureProd(builder: DIContainer.Builder) {
        // Production uses real time
        builder.singleton<TimeProvider> { SystemTimeProvider() }
    }
}