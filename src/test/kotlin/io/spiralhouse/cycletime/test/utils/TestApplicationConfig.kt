package io.spiralhouse.cycletime.test.utils

import io.ktor.client.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import io.ktor.server.sse.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.mcp.configureMCP
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Standardized test application configuration for SDK integration tests.
 *
 * Provides consistent test application setup that mirrors production configuration
 * while using test-appropriate settings (in-memory database, test timeouts, etc.).
 *
 * Design Philosophy:
 * - Production parity (tests run against real application configuration)
 * - Test isolation (each test gets independent application instance)
 * - Minimal boilerplate (hide complex setup details)
 * - Clear intent (method names describe test scenario)
 *
 * Usage Example:
 * ```kotlin
 * class MySDKTest : StringSpec({
 *     "should initialize MCP server" {
 *         testSDKApplication {
 *             val response = client.sendMCPRequest(
 *                 MCPRequestBuilders.buildInitializeRequest()
 *             )
 *             response.status shouldBe HttpStatusCode.OK
 *         }
 *     }
 * })
 * ```
 *
 * @see io.ktor.server.testing.testApplication Ktor test application builder
 */

/**
 * Create test application with standard SDK configuration.
 *
 * Configures a full Ktor application with:
 * - Dependency injection (SDK components, services, repositories)
 * - MCP routing (SDK endpoints at /mcp)
 * - Health endpoint (REST endpoint at /health)
 * - Content negotiation (JSON serialization)
 * - Test database (in-memory H2)
 *
 * Each invocation creates an isolated application instance, ensuring test independence.
 *
 * @param includeHealthEndpoint Whether to include /health REST endpoint (default: true)
 * @param block Test code to execute within application context
 */
fun testSDKApplication(
    includeHealthEndpoint: Boolean = true,
    block: suspend ApplicationTestBuilder.() -> Unit
) = testApplication {
    // Create isolated test database
    val testDatabase = Database.connect(
        url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )

    // Initialize database schema
    transaction(testDatabase) {
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, WorkflowsTable)
    }

    // Configure application with production DI and routing
    application {
        // Install required Ktor plugins
        install(ServerContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(SSE)

        // Configure dependency injection (SDK components, services, etc.)
        configureDependencies(database = testDatabase)

        // Configure routing
        routing {
            // MCP endpoints (SDK + legacy EventBus during migration)
            configureMCP()

            // Health endpoint (for application integration tests)
            if (includeHealthEndpoint) {
                configureHealthEndpoint()
            }
        }
    }

    // Execute test block with configured application
    block()
}

/**
 * Create test application with custom test database configuration.
 *
 * Allows tests to specify custom database settings for specific test scenarios
 * (e.g., testing database failures, migration scenarios, etc.).
 *
 * @param databaseUrl Custom JDBC database URL
 * @param block Test code to execute within application context
 */
fun testSDKApplicationWithDatabase(
    databaseUrl: String,
    block: suspend ApplicationTestBuilder.() -> Unit
) = testApplication {
    // Create database with custom URL
    val testDatabase = Database.connect(
        url = databaseUrl,
        driver = "org.h2.Driver"
    )

    // Initialize database schema
    transaction(testDatabase) {
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, WorkflowsTable)
    }

    application {
        // Install required Ktor plugins
        install(ServerContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
        install(SSE)

        configureDependencies(database = testDatabase)
        routing {
            configureMCP()
        }
    }

    block()
}

/**
 * Create test application without MCP configuration (for testing DI only).
 *
 * Useful for unit tests that need dependency injection but don't require
 * full MCP server setup.
 *
 * @param block Test code to execute within application context
 */
fun testApplicationWithDependencies(
    block: suspend ApplicationTestBuilder.() -> Unit
) = testApplication {
    val testDatabase = Database.connect(
        url = "jdbc:h2:mem:test_deps_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )

    transaction(testDatabase) {
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, WorkflowsTable)
    }

    application {
        configureDependencies(database = testDatabase)
        // Note: No configureMCP() call - testing DI only
    }

    block()
}

/**
 * Test helper for creating isolated test database instance.
 *
 * Generates unique database URL using timestamp to ensure test isolation.
 * Each test gets its own in-memory H2 database that's automatically cleaned
 * up when the test completes.
 *
 * @param testName Optional test name for debugging (included in database name)
 * @return JDBC URL for isolated test database
 */
fun createTestDatabaseUrl(testName: String = "test"): String {
    val timestamp = System.currentTimeMillis()
    val sanitizedName = testName.replace(Regex("[^a-zA-Z0-9]"), "_")
    return "jdbc:h2:mem:${sanitizedName}_${timestamp};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"
}

/**
 * Test helper for creating test client with JSON content negotiation.
 *
 * Returns a configured HttpClient suitable for MCP protocol testing.
 * Client automatically handles JSON serialization/deserialization.
 *
 * @return Configured test HTTP client
 */
fun ApplicationTestBuilder.createTestClient(): HttpClient {
    return createClient {
        install(ClientContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }
    }
}

/**
 * Configure health endpoint for application integration tests.
 *
 * Provides a simple /health endpoint that returns application status
 * and MCP server information for integration testing.
 */
private fun Routing.configureHealthEndpoint() {
    get("/health") {
        try {
            // Try to get MCP service status from DI
            val mcpService: io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService? by application.dependencies

            val healthData = buildMap {
                put("status", "ok")
                put("dependencies", buildMap {
                    put("mcp", if (mcpService?.isRunning() == true) "running" else "stopped")
                })
                put("metrics", buildMap {
                    val status = mcpService?.getStatus()
                    put("mcpPort", status?.port?.toString() ?: "3006")
                })
            }

            call.respond(io.ktor.http.HttpStatusCode.OK, healthData)
        } catch (e: Exception) {
            // If MCP service not available, return basic health
            call.respond(io.ktor.http.HttpStatusCode.OK, mapOf("status" to "ok"))
        }
    }
}
