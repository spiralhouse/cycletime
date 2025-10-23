package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.application.services.IssueApplicationService
import io.spiralhouse.cycletime.application.services.ProjectApplicationService
import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.application.services.WorkflowApplicationService
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.infrastructure.database.TableRegistry
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedSessionRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import io.spiralhouse.cycletime.mcp.providers.DefaultIssueResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultProjectResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultSessionResourceProvider
import io.spiralhouse.cycletime.mcp.providers.DefaultWorkflowResourceProvider
import io.spiralhouse.cycletime.mcp.sdk.MCPSdkServer
import io.spiralhouse.cycletime.mcp.sdk.SDKSessionManager
import io.spiralhouse.cycletime.mcp.tools.DefaultIssueToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultProjectToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultSessionToolProvider
import io.spiralhouse.cycletime.mcp.tools.DefaultWorkflowToolProvider
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Test factory for creating MCPSdkServer instances with real providers.
 *
 * This factory creates a fully-configured MCPSdkServer with:
 * - In-memory H2 database (isolated per test)
 * - Real business logic (no mocking)
 * - All 17 tools registered
 * - All 3 resources registered
 *
 * This approach provides authentic behavior testing for SDK adapters.
 */
object MCPSdkServerTestFactory {
    /**
     * Creates an MCPSdkServer with all providers registered.
     *
     * @param version Server version (defaults to "1.0.0-test")
     * @return Fully-configured MCPSdkServer instance
     */
    fun createWithProviders(version: String = "1.0.0-test"): MCPSdkServer {
        // Create in-memory database with unique name for isolation
        val database = Database.connect(
            "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
        )

        // Create schema
        transaction(database) {
            SchemaUtils.create(*TableRegistry.ALL_TABLES.toTypedArray())
        }

        // Create time provider
        val timeProvider = SystemTimeProvider()

        // Create repositories
        val projectRepository = ExposedProjectRepository(timeProvider, database)
        val issueRepository = ExposedIssueRepository(timeProvider, database)
        val sessionRepository = ExposedSessionRepository(timeProvider, database)
        val workflowRepository = ExposedWorkflowRepository(timeProvider, database)
        val unitOfWork = ExposedUnitOfWork(database)

        // Create application services
        val projectService = ProjectApplicationService(
            projectRepository = projectRepository,
            issueRepository = issueRepository,
            unitOfWork = unitOfWork,
            timeProvider = timeProvider
        )

        val issueService = IssueApplicationService(
            issueRepository = issueRepository,
            projectRepository = projectRepository,
            unitOfWork = unitOfWork,
            timeProvider = timeProvider
        )

        val sessionService = SessionApplicationService(
            sessionRepository = sessionRepository,
            projectRepository = projectRepository,
            unitOfWork = unitOfWork,
            timeProvider = timeProvider
        )

        val workflowService = WorkflowApplicationService(
            workflowRepository = workflowRepository,
            unitOfWork = unitOfWork,
            timeProvider = timeProvider
        )

        // Create tool providers (business logic)
        val toolProviders = listOf(
            DefaultProjectToolProvider(projectService),
            DefaultIssueToolProvider(issueService),
            DefaultSessionToolProvider(sessionService),
            DefaultWorkflowToolProvider()
        )

        // Create resource providers (business logic)
        val resourceProviders = listOf(
            DefaultProjectResourceProvider(projectService) as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            DefaultIssueResourceProvider(issueService) as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            DefaultSessionResourceProvider(sessionService) as io.spiralhouse.cycletime.mcp.resources.ResourceProvider,
            DefaultWorkflowResourceProvider() as io.spiralhouse.cycletime.mcp.resources.ResourceProvider
        )

        // Create session manager
        val sessionManager = SDKSessionManager(sessionService)

        // Create and return MCPSdkServer
        return MCPSdkServer(
            version = version,
            toolProviders = toolProviders,
            resourceProviders = resourceProviders,
            sessionManager = sessionManager
        )
    }
}
