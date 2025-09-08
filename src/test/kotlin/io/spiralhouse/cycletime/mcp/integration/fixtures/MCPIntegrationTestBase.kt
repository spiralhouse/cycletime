package io.spiralhouse.cycletime.mcp.integration.fixtures

import io.kotest.core.spec.Spec
import io.kotest.core.spec.style.StringSpec
import io.kotest.core.test.TestCase
import io.kotest.core.test.TestResult
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.server.testing.*
import io.spiralhouse.cycletime.module
import kotlinx.coroutines.*
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction
import java.net.ServerSocket
import java.util.concurrent.atomic.AtomicInteger
import kotlin.time.Duration.Companion.seconds
import kotlin.time.Duration.Companion.milliseconds

/**
 * Base class for all MCP integration tests providing common infrastructure.
 * 
 * This base class provides:
 * - Isolated H2 test database setup and cleanup per test class
 * - Unique MCP server port allocation to prevent conflicts
 * - MockClaudeClient lifecycle management with proper cleanup
 * - WebSocket connection utilities and assertion helpers
 * - Test isolation ensuring no shared state between tests
 * - Integration with existing test patterns following .claude/shared/testing-standards.md
 * 
 * DESIGN FOR FAILURE: Infrastructure designed to expose missing integration
 * components during RED phase by attempting realistic server startup and connections.
 */
abstract class MCPIntegrationTestBase : StringSpec() {
    
    companion object {
        private val portAllocator = AtomicInteger(3000)
        
        /**
         * Allocates unique port for each test class to prevent conflicts.
         */
        fun allocatePort(): Int = portAllocator.incrementAndGet()
        
        /**
         * Checks if a port is available for testing.
         */
        fun isPortAvailable(port: Int): Boolean {
            return try {
                ServerSocket(port).use { true }
            } catch (e: Exception) {
                false
            }
        }
    }
    
    // Test infrastructure state
    protected lateinit var database: Database
    protected lateinit var testApplicationEngine: TestApplicationEngine
    protected var mcpClient: MockClaudeClient? = null
    protected val mcpPort = allocatePort()
    
    // JSON utilities
    protected val json = Json { 
        ignoreUnknownKeys = true
        prettyPrint = true
    }
    
    override suspend fun beforeSpec(spec: Spec) {
        // Note: super.beforeSpec() removed due to Kotlin synthetic accessor generation issue
        // StringSpec's beforeSpec is a no-op, so no functionality is lost
        // Fix for: NoSuchMethodError with Kotlin 2.0.21 + Kotest 5.9.1
        setupTestDatabase()
        // Note: Server startup will be attempted in each test and will fail during RED phase
    }
    
    override suspend fun afterSpec(spec: Spec) {
        // Note: super.afterSpec() removed - same Kotlin synthetic accessor issue as beforeSpec
        cleanupTestDatabase()
    }
    
    override suspend fun beforeEach(testCase: TestCase) {
        // Note: super.beforeEach() removed - same Kotlin synthetic accessor issue
        TestDataFactory.resetRequestIdCounter()
    }
    
    override suspend fun afterEach(testCase: TestCase, result: TestResult) {
        // Note: super.afterEach() removed - same Kotlin synthetic accessor issue
        cleanupMcpClient()
    }
    
    /**
     * Sets up isolated H2 test database for this test class.
     * Each test class gets its own database to ensure complete isolation.
     */
    private fun setupTestDatabase() {
        val databaseName = "test_${this::class.simpleName}_${System.currentTimeMillis()}"
        database = Database.connect(
            url = "jdbc:h2:mem:$databaseName;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )
        
        transaction(database) {
            // Will fail if schema creation is not properly integrated
            try {
                SchemaUtils.create(
                    // These table references will fail if not properly imported
                    io.spiralhouse.cycletime.infrastructure.database.SessionStatesTable,
                    io.spiralhouse.cycletime.infrastructure.database.ProjectsTable,
                    io.spiralhouse.cycletime.infrastructure.database.IssuesTable,
                    io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
                )
            } catch (e: Exception) {
                throw AssertionError("Failed to create test database schema. Missing table definitions or imports.", e)
            }
        }
    }
    
    /**
     * Cleans up test database ensuring no resource leaks.
     */
    private fun cleanupTestDatabase() {
        try {
            TransactionManager.closeAndUnregister(database)
        } catch (e: Exception) {
            // Log but don't fail cleanup
            println("Warning: Failed to cleanup test database: ${e.message}")
        }
    }
    
    /**
     * Cleans up MCP client connections to prevent resource leaks.
     */
    private suspend fun cleanupMcpClient() {
        try {
            mcpClient?.disconnect()
            mcpClient = null
        } catch (e: Exception) {
            // Log but don't fail cleanup
            println("Warning: Failed to cleanup MCP client: ${e.message}")
        }
    }
    
    /**
     * Creates and starts test application with MCP server integration.
     * Will fail during RED phase if MCP server is not integrated into application startup.
     */
    protected suspend fun withTestApplication(block: suspend (ApplicationTestBuilder) -> Unit) {
        testApplication {
            application {
                // This will fail if MCP server is not integrated into module
                module()
            }
            
            // Wait for application to start up
            val healthResponse = client.get("/health")
            healthResponse.status shouldBe io.ktor.http.HttpStatusCode.OK
            
            // Verify MCP server is reported as running in health check
            val healthJson = json.parseToJsonElement(healthResponse.bodyAsText())
            val dependencies = healthJson.jsonObject["dependencies"]?.jsonObject
            
            // This will fail if MCP server health check is not implemented
            dependencies?.get("mcp")?.jsonPrimitive?.content shouldBe "running"
            
            block.invoke(this)
        }
    }
    
    /**
     * Creates MockClaudeClient connected to test MCP server.
     * Will fail during RED phase if MCP server WebSocket endpoint is not available.
     * Note: MCP server runs on the same port as the main Ktor application via /mcp WebSocket route.
     * 
     * IMPORTANT: This method is designed to work within testApplication blocks.
     * It connects to the WebSocket endpoint on the test application.
     */
    protected suspend fun createConnectedMcpClient(): MockClaudeClient {
        // Create a simple MCP client that will use standard WebSocket connection
        // The actual connection will be established when connect() is called
        val testClient = MockClaudeClient(
            serverHost = "localhost", 
            serverPort = 80,  // Default port, will be handled by framework
            serverPath = "/mcp",
            connectionTimeout = 5.seconds,
            requestTimeout = 10.seconds
        )
        
        // This will fail if WebSocket server is not running at /mcp
        testClient.connect()
        mcpClient = testClient
        return testClient
    }
    
    /**
     * Creates and initializes MockClaudeClient for testing.
     * Will fail during RED phase if initialize protocol is not implemented.
     */
    protected suspend fun createInitializedMcpClient(
        clientName: String = "Test-Client",
        protocolVersion: String = "2024-11-05"
    ): MockClaudeClient {
        val client = createConnectedMcpClient()
        
        // This will fail if initialize method handler is not implemented
        client.initialize(protocolVersion, clientName)
        return client
    }
    
    /**
     * Performs complete MCP handshake and validates server capabilities.
     * Will fail during RED phase at multiple integration points.
     */
    protected suspend fun performCompleteHandshake(): MockClaudeClient {
        val client = createInitializedMcpClient()
        
        // Validate initialization response structure
        val initResponse = client.getInitializationResponse()
        initResponse shouldNotBe null
        
        val result = initResponse!!.jsonObject["result"]?.jsonObject
        result shouldNotBe null
        
        // Verify server capabilities are properly reported
        val capabilities = result!!["capabilities"]?.jsonObject
        capabilities shouldNotBe null
        
        val serverInfo = result["serverInfo"]?.jsonObject
        serverInfo shouldNotBe null
        serverInfo!!["name"]?.jsonPrimitive?.content shouldBe "CycleTime-CE"
        
        return client
    }
    
    /**
     * Validates JSON-RPC 2.0 response structure.
     */
    protected fun validateJsonRpcResponse(response: JsonElement, expectedId: String? = null) {
        val obj = response.jsonObject
        
        obj["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
        
        if (expectedId != null) {
            obj["id"]?.jsonPrimitive?.content shouldBe expectedId
        }
        
        // Response should have either result or error, not both
        val hasResult = obj["result"] != null
        val hasError = obj["error"] != null
        
        require(hasResult xor hasError) { 
            "JSON-RPC response must have either result or error, not both or neither" 
        }
    }
    
    /**
     * Validates JSON-RPC error response structure.
     */
    protected fun validateJsonRpcError(response: JsonElement, expectedCode: Int? = null) {
        validateJsonRpcResponse(response)
        
        val error = response.jsonObject["error"]?.jsonObject
        error shouldNotBe null
        
        error!!["code"]?.jsonPrimitive?.int shouldNotBe null
        error["message"]?.jsonPrimitive?.content shouldNotBe null
        
        if (expectedCode != null) {
            error["code"]?.jsonPrimitive?.int shouldBe expectedCode
        }
    }
    
    /**
     * Validates that tools list response contains expected CycleTime tools.
     */
    protected fun validateToolsList(response: JsonElement) {
        validateJsonRpcResponse(response)
        
        val result = response.jsonObject["result"]?.jsonObject
        result shouldNotBe null
        
        val tools = result!!["tools"]?.jsonArray
        tools shouldNotBe null
        
        val expectedTools = TestDataFactory.createExpectedToolsListResponse()
        TestDataFactory.validateToolsInResponse(response, expectedTools)
    }
    
    /**
     * Validates that resources list response contains expected CycleTime resources.
     */
    protected fun validateResourcesList(response: JsonElement) {
        validateJsonRpcResponse(response)
        
        val result = response.jsonObject["result"]?.jsonObject
        result shouldNotBe null
        
        val resources = result!!["resources"]?.jsonArray
        resources shouldNotBe null
        
        val expectedResources = TestDataFactory.createExpectedResourcesList()
        TestDataFactory.validateResourcesInResponse(response, expectedResources)
    }
    
    /**
     * Validates tool call response structure.
     */
    protected fun validateToolCallResponse(response: JsonElement, toolName: String) {
        validateJsonRpcResponse(response)
        
        if (response.jsonObject["result"] != null) {
            val result = response.jsonObject["result"]?.jsonObject
            result shouldNotBe null
            
            // Tool call success should have content
            result!!["content"] shouldNotBe null
        } else {
            // Tool call error should be valid JSON-RPC error
            validateJsonRpcError(response)
        }
    }
    
    /**
     * Validates resource read response structure.
     */
    protected fun validateResourceReadResponse(response: JsonElement, uri: String) {
        validateJsonRpcResponse(response)
        
        if (response.jsonObject["result"] != null) {
            val result = response.jsonObject["result"]?.jsonObject
            result shouldNotBe null
            
            // Resource read success should have contents
            result!!["contents"] shouldNotBe null
        } else {
            // Resource read error should be valid JSON-RPC error
            validateJsonRpcError(response)
        }
    }
    
    /**
     * Measures operation timing for performance tests.
     */
    protected suspend fun <T> measureTime(operation: suspend () -> T): Pair<T, Long> {
        val startTime = System.currentTimeMillis()
        val result = operation()
        val endTime = System.currentTimeMillis()
        return result to (endTime - startTime)
    }
    
    /**
     * Performs concurrent operations for load testing.
     */
    protected suspend fun performConcurrentOperations(
        operationCount: Int,
        operation: suspend (index: Int) -> Unit
    ): List<Long> {
        return withContext(Dispatchers.Default) {
            val timings = mutableListOf<Long>()
            val jobs = (1..operationCount).map { index ->
                async {
                    val (_, timing) = measureTime { operation(index) }
                    synchronized(timings) { timings.add(timing) }
                }
            }
            jobs.awaitAll()
            timings.toList()
        }
    }
    
    /**
     * Creates test project and returns its ID for use in issue creation tests.
     * Will fail during RED phase if project creation tool is not implemented.
     */
    protected suspend fun createTestProject(
        client: MockClaudeClient,
        name: String = "Integration Test Project"
    ): String {
        val request = TestDataFactory.createProjectToolCall(name, "Test project for integration testing")
        val response = client.sendRequest(request)
        
        validateToolCallResponse(response, "create_project")
        
        // Extract project ID from response
        val result = response.jsonObject["result"]?.jsonObject
        val content = result?.get("content")?.jsonArray?.get(0)?.jsonObject
        val projectId = content?.get("text")?.jsonPrimitive?.content
            ?: throw AssertionError("Failed to extract project ID from tool response")
        
        return projectId
    }
    
    /**
     * Creates test issue and returns its ID for workflow testing.
     * Will fail during RED phase if issue creation tool is not implemented.
     */
    protected suspend fun createTestIssue(
        client: MockClaudeClient,
        projectId: String,
        title: String = "Integration Test Issue"
    ): String {
        val request = TestDataFactory.createIssueToolCall(projectId, title, "Test issue for integration testing")
        val response = client.sendRequest(request)
        
        validateToolCallResponse(response, "create_issue")
        
        // Extract issue ID from response
        val result = response.jsonObject["result"]?.jsonObject
        val content = result?.get("content")?.jsonArray?.get(0)?.jsonObject
        val issueId = content?.get("text")?.jsonPrimitive?.content
            ?: throw AssertionError("Failed to extract issue ID from tool response")
        
        return issueId
    }
    
    /**
     * Extension method for MockClaudeClient to send JsonObject requests.
     * Simplifies test code by handling serialization automatically.
     */
    protected suspend fun MockClaudeClient.sendRequest(request: JsonObject): JsonElement {
        // Extract method and params from request to use appropriate MockClaudeClient methods
        val method = request["method"]?.jsonPrimitive?.content ?: throw IllegalArgumentException("Request missing method")
        val params = request["params"]?.jsonObject
        
        return when (method) {
            "tools/call" -> {
                val toolName = params?.get("name")?.jsonPrimitive?.content ?: throw IllegalArgumentException("Tool call missing name")
                val arguments = params["arguments"]?.jsonObject ?: kotlinx.serialization.json.buildJsonObject {}
                this.callTool(toolName, arguments)
            }
            "resources/read" -> {
                val uri = params?.get("uri")?.jsonPrimitive?.content ?: throw IllegalArgumentException("Resource read missing uri")
                this.readResource(uri)
            }
            else -> throw MockClaudeClientException("Unsupported method: $method")
        }
    }
    
    /**
     * Waits for server to be ready for connections.
     * Used in tests that need to ensure server startup is complete.
     */
    protected suspend fun waitForServerReady(maxAttempts: Int = 10) {
        repeat(maxAttempts) { attempt ->
            try {
                if (isPortAvailable(mcpPort)) {
                    delay(100.milliseconds)
                } else {
                    return // Server is listening
                }
            } catch (e: Exception) {
                if (attempt == maxAttempts - 1) {
                    throw AssertionError("Server failed to become ready after $maxAttempts attempts", e)
                }
                delay(500.milliseconds)
            }
        }
        throw AssertionError("Server port $mcpPort never became available")
    }
}

/**
 * Configuration class for customizing test behavior.
 */
data class MCPIntegrationTestConfig(
    val connectionTimeout: kotlin.time.Duration = 5.seconds,
    val requestTimeout: kotlin.time.Duration = 10.seconds,
    val maxConcurrentConnections: Int = 10,
    val enablePerformanceTesting: Boolean = true,
    val enableErrorTesting: Boolean = true,
    val databaseCleanup: Boolean = true
)