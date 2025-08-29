package io.spiralhouse.cycletime.infrastructure.di.modules

import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.SessionRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.infrastructure.database.DatabaseFactory
import io.spiralhouse.cycletime.infrastructure.di.core.AbstractDIModule
import io.spiralhouse.cycletime.infrastructure.di.core.DIContainer
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import org.jetbrains.exposed.sql.Database

/**
 * Infrastructure layer dependency injection module.
 * 
 * This module configures:
 * - Database connections
 * - Repository implementations
 * - Unit of Work
 * - External service integrations
 */
class InfrastructureModule : AbstractDIModule() {
    
    override val name: String = "InfrastructureModule"
    override val priority: Int = 20 // Infrastructure configured after domain
    
    override fun configureCommon(builder: DIContainer.Builder) {
        // Database - singleton across all profiles
        builder.singleton<Database> { DatabaseFactory.getInstance() }
        
        // Unit of Work - singleton
        builder.singleton<UnitOfWork, ExposedUnitOfWork>()
        
        // Repositories - singletons
        builder.singleton<ProjectRepository, ExposedProjectRepository>()
        builder.singleton<IssueRepository, ExposedIssueRepository>()
        builder.singleton<SessionRepository, ExposedSessionRepository>()
    }
    
    override fun configureDev(builder: DIContainer.Builder) {
        // Development-specific infrastructure
        // Could add development database configuration here
    }
    
    override fun configureTest(builder: DIContainer.Builder) {
        // Test-specific infrastructure
        // Override database with in-memory for tests
        builder.singleton<Database> {
            Database.connect(
                url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                driver = "org.h2.Driver"
            )
        }
    }
    
    override fun configureProd(builder: DIContainer.Builder) {
        // Production-specific infrastructure
        // Could add production database pooling, caching, etc.
    }
}