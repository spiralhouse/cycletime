package io.spiralhouse.cycletime.test.utils

import io.ktor.client.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import io.ktor.server.sse.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.cycletime.infrastructure.di.configureDependencies
import io.spiralhouse.cycletime.mcp.configureMCP
import io.spiralhouse.cycletime.mcp.sdk.StreamableHttpConfig
import io.spiralhouse.cycletime.mcp.integration.MCPIntegrationService
import io.spiralhouse.cycletime.HealthResponse
import io.spiralhouse.cycletime.domain.services.BuildInfo
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable
import io.spiralhouse.cycletime.infrastructure.database.ProjectsTable
import io.spiralhouse.cycletime.infrastructure.database.IssuesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueDependenciesTable
import io.spiralhouse.cycletime.infrastructure.database.IssueLabelsTable
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import kotlinx.serialization.json.Json
import kotlinx.coroutines.runBlocking
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import io.ktor.http.content.*
import io.ktor.util.reflect.*
import io.ktor.utils.io.*
import io.ktor.serialization.*
import java.nio.charset.Charset

/**
 * Content converter for SSE responses in test environment.
 * Allows ContentNegotiation to handle text/event-stream without returning 406.
 */
private object TestSSEContentConverter : ContentConverter {
    override suspend fun serialize(
        contentType: ContentType,
        charset: Charset,
        typeInfo: TypeInfo,
        value: Any?
    ): OutgoingContent? {
        // Handle any value type for SSE - convert to bytes
        return when (value) {
            is ByteArray -> ByteArrayContent(value, contentType)
            is String -> ByteArrayContent(value.toByteArray(charset), contentType)
            null -> ByteArrayContent(ByteArray(0), contentType)
            else -> ByteArrayContent(value.toString().toByteArray(charset), contentType)
        }
    }

    override suspend fun deserialize(
        charset: Charset,
        typeInfo: TypeInfo,
        content: ByteReadChannel
    ): Any? = null
}

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
 * **Configuration Modes:**
 * - `config = null` (default): Test-friendly configuration (rate limiting disabled, localhost-only origins)
 * - `config = StreamableHttpConfig()`: Production configuration (rate limiting enabled, full origin whitelist)
 * - `config = StreamableHttpConfig(...)`: Custom configuration
 *
 * @param includeHealthEndpoint Whether to include /health REST endpoint (default: true)
 * @param config Optional StreamableHttpConfig. When null, uses test-friendly defaults. When provided, uses that config.
 * @param block Test code to execute within application context
 */
fun testSDKApplication(
    includeHealthEndpoint: Boolean = true,
    config: StreamableHttpConfig? = null,
    block: suspend ApplicationTestBuilder.() -> Unit
) = testApplication {
    // Create isolated test database
    val testDatabase = Database.connect(
        url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )

    // Initialize database schema
    transaction(testDatabase) {
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, IssueDependenciesTable, IssueLabelsTable, WorkflowsTable)
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

            // SPI-766: Register SSE content type to prevent 406 errors
            register(ContentType.Text.EventStream, TestSSEContentConverter)
        }
        install(SSE)

        // Configure dependency injection (SDK components, services, etc.)
        configureDependencies(database = testDatabase)

        // Start MCP integration service to match production behavior
        val mcpService: MCPIntegrationService by dependencies
        runBlocking {
            mcpService.start()
        }

        // Configure routing
        routing {
            // MCP endpoints with configurable security settings (SPI-879)
            // When config is null, use test-friendly defaults (rate limiting disabled)
            // When config is provided, use that configuration (e.g., production config for security tests)
            val mcpConfig = config ?: StreamableHttpConfig(
                allowNullOrigin = true,
                allowedOrigins = listOf("http://localhost:.*"),
                maxRequestBodySize = 1_000_000,
                sessionCreationMaxPerWindow = Int.MAX_VALUE,  // Disable rate limiting for tests
                sessionCreationWindowMs = 60_000
            )
            configureMCP(config = mcpConfig)

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
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, IssueDependenciesTable, IssueLabelsTable, WorkflowsTable)
    }

    application {
        // Install required Ktor plugins
        install(ServerContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })

            // SPI-766: Register SSE content type to prevent 406 errors
            register(ContentType.Text.EventStream, TestSSEContentConverter)
        }
        install(SSE)

        configureDependencies(database = testDatabase)
        routing {
            // MCP endpoints with test-friendly configuration (SPI-879)
            // Disable rate limiting for integration tests to prevent HTTP 429 errors
            val mcpConfig = StreamableHttpConfig(
                allowNullOrigin = true,
                allowedOrigins = listOf("http://localhost:.*"),
                maxRequestBodySize = 1_000_000,
                sessionCreationMaxPerWindow = Int.MAX_VALUE,  // Disable rate limiting
                sessionCreationWindowMs = 60_000
            )
            configureMCP(config = mcpConfig)
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
 * Create test application with SDK Client support using embedded HTTP server.
 *
 * **IMPORTANT (SPI-710)**: SDK Client requires a real HTTP server because it uses external
 * HTTP connections. The standard `testApplication` uses an in-memory engine that doesn't
 * expose network ports, making it incompatible with SDK Client.
 *
 * **IMPORTANT (SPI-712)**: Uses ephemeral port (OS-assigned) to enable parallel test execution
 * without port binding conflicts. Each test invocation receives a unique port number.
 *
 * This helper starts a real embedded HTTP server with dynamic port assignment:
 * - Production DI configuration (SDK components, services, repositories)
 * - MCP routing (SDK endpoints at /)
 * - Isolated test database (fresh H2 instance per test)
 * - Configured HttpClient with SSE support
 * - Automatic resource cleanup
 *
 * Usage:
 * ```kotlin
 * testSDKApplication { serverUrl, httpClient ->
 *     val client = Client(Implementation("test-client", "1.0.0"))
 *     val transport = SSEClientTransport(httpClient, serverUrl)
 *
 *     withTimeout(10_000) {
 *         client.connect(transport)
 *     }
 *
 *     // Test operations using SDK Client
 *     val result = client.callTool("tool_name", args)
 *     result.isError shouldBe false
 * }
 * ```
 *
 * @param block Test code receiving serverUrl and httpClient parameters
 */
fun testSDKApplication(
    block: suspend (serverUrl: String, httpClient: HttpClient) -> Unit
): Unit = runBlocking {
    // Create isolated test database
    val testDatabase = Database.connect(
        url = "jdbc:h2:mem:test_${System.currentTimeMillis()};MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        driver = "org.h2.Driver"
    )

    // Initialize database schema
    transaction(testDatabase) {
        SchemaUtils.create(SessionStatesTable, ProjectsTable, IssuesTable, IssueDependenciesTable, IssueLabelsTable, WorkflowsTable)
    }

    // Start embedded HTTP server with ephemeral port (OS-assigned to avoid conflicts)
    // Port 0 requests OS to assign an available port automatically (SPI-712)
    val server = embeddedServer(io.ktor.server.cio.CIO, port = 0) {
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

        // Start MCP integration service to match production behavior
        val mcpService: MCPIntegrationService by dependencies
        runBlocking {
            mcpService.start()
        }

        // Configure routing
        routing {
            // MCP endpoints with test-friendly configuration (SPI-879)
            // Disable rate limiting for integration tests to prevent HTTP 429 errors
            val mcpConfig = StreamableHttpConfig(
                allowNullOrigin = true,
                allowedOrigins = listOf("http://localhost:.*"),
                maxRequestBodySize = 1_000_000,
                sessionCreationMaxPerWindow = Int.MAX_VALUE,  // Disable rate limiting
                sessionCreationWindowMs = 60_000
            )
            configureMCP(config = mcpConfig)
        }
    }.start(wait = false)

    try {
        // Create HTTP client with SSE support for SDK Client
        val httpClient = HttpClient(io.ktor.client.engine.cio.CIO) {
            install(io.ktor.client.plugins.sse.SSE)
        }

        try {
            // Discover actual assigned port after server starts (SPI-712)
            // The port is only available after start() completes, not at embeddedServer() call time
            val actualPort = server.engine.resolvedConnectors().first().port
            val serverUrl = "http://localhost:$actualPort"

            // Execute test block with provided parameters
            block(serverUrl, httpClient)

        } finally {
            // Always cleanup httpClient to prevent resource leaks
            httpClient.close()
        }

    } finally {
        // Shutdown server and cleanup
        server.stop(1000, 2000)
        TransactionManager.closeAndUnregister(testDatabase)
    }
}

/**
 * Configure health endpoint for application integration tests.
 *
 * Provides /health endpoint that matches production HealthResponse format.
 * Returns proper JSON structure with dependencies and metrics for MCP server status.
 *
 * NOTE (SPI-710): This must match production Application.kt health endpoint format
 * to ensure integration tests validate actual production behavior.
 */
private fun Routing.configureHealthEndpoint() {
    get("/health") {
        try {
            // Get MCP service status from DI (matches production pattern)
            val mcpService: MCPIntegrationService? by application.dependencies

            // Build health response matching production HealthResponse structure
            val response = HealthResponse(
                status = "healthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                dependencies = mapOf(
                    "database" to "connected",
                    "mcp" to if (mcpService?.getStatus()?.isRunning == true) "running" else "stopped"
                ),
                metrics = mapOf(
                    "mcpUptime" to (mcpService?.getStatus()?.uptimeMs?.toString() ?: "0"),
                    "mcpStatus" to if (mcpService?.getStatus()?.isRunning == true) "running" else "stopped"
                ),
                timestamp = System.currentTimeMillis().toString()
            )

            call.respond(HttpStatusCode.OK, response)
        } catch (e: Exception) {
            // Return error response matching production format
            call.respond(HttpStatusCode.ServiceUnavailable, HealthResponse(
                status = "unhealthy",
                service = BuildInfo.serviceName,
                version = BuildInfo.version,
                dependencies = mapOf("error" to e.message.orEmpty()),
                metrics = emptyMap(),
                timestamp = System.currentTimeMillis().toString()
            ))
        }
    }
}
