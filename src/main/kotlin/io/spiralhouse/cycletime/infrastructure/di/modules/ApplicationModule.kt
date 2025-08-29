package io.spiralhouse.cycletime.infrastructure.di.modules

import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.infrastructure.di.core.AbstractDIModule
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer

/**
 * Application layer dependency injection module.
 * 
 * This module configures:
 * - Application services
 * - Use case implementations
 * - Command and query handlers
 * - Application-level orchestration
 */
class ApplicationModule : AbstractDIModule() {
    
    override val name: String = "ApplicationModule"
    override val priority: Int = 30 // Application configured after infrastructure
    
    override fun configureCommon(builder: DIContainer.Builder) {
        // Application services - singletons
        builder.singleton<ProjectApplicationService, ProjectApplicationService>()
        builder.singleton<IssueApplicationService, IssueApplicationService>()
        builder.singleton<SessionApplicationService, SessionApplicationService>()
    }
    
    override fun configureDev(builder: DIContainer.Builder) {
        // Development-specific application configuration
        // Could add development-only services or decorators
    }
    
    override fun configureTest(builder: DIContainer.Builder) {
        // Test-specific application configuration
        // Could add test decorators for tracking service calls
    }
    
    override fun configureProd(builder: DIContainer.Builder) {
        // Production-specific application configuration
        // Could add production monitoring decorators
    }
}