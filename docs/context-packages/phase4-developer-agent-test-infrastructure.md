# Context Package: Developer Agent - Phase 4 (Test Infrastructure Updates)

## Mission Overview

**Your Role**: Update test infrastructure and test utilities for SDK patterns

**Timeline**: Days 14-16 of Phase 4 (supporting QA Agent test migration)

**Deliverables**:
- Update test utilities for SDK patterns
- Update test fixtures for SDK transport
- Update CI configuration for SDK tests
- Ensure test infrastructure supports QA test migration

**Success Criteria**: Test infrastructure ready, QA can migrate tests successfully, CI pipeline works

---

## General Context

**Phase 4 Focus**: Migrate tests from EventBus to SDK while maintaining infrastructure

**Test Infrastructure Components**:
- Test utilities (helpers, factories, mocks)
- Test fixtures (sample data, test sessions)
- CI configuration (test execution, caching)
- Test application setup (DI configuration for tests)

---

## Developer Agent-Specific Context

### Test Application Setup for SDK

**testApplication Configuration** (from migration plan lines 1246-1275):

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/utils/TestApplicationConfig.kt
package io.spiralhouse.cycletime.utils

import io.ktor.server.testing.*
import io.spiralhouse.cycletime.Application

/**
 * Standard test application configuration for SDK tests.
 */
fun testApplication(block: suspend ApplicationTestBuilder.() -> Unit) {
    testApplication {
        application {
            // Configure dependencies (SDK + mocks)
            configureDependencies()

            // Configure routing (SDK endpoints)
            configureRouting()
        }

        block()
    }
}

/**
 * Test application with mock services.
 */
fun testApplicationWithMocks(
    sessionService: SessionApplicationService,
    projectService: ProjectApplicationService,
    // ... other services
    block: suspend ApplicationTestBuilder.() -> Unit
) {
    testApplication {
        application {
            dependencies {
                // Provide mock services
                provide<SessionApplicationService> { sessionService }
                provide<ProjectApplicationService> { projectService }

                // SDK components with mocks
                provide<SDKSessionManager> { SDKSessionManager(sessionService) }
                provide<MCPSdkServer> {
                    val toolProviders = listOf(/* mocked providers */)
                    MCPSdkServer(version = "test", /* ... */)
                }
            }

            configureRouting()
        }

        block()
    }
}
```

### Test Utilities for SDK Requests

**MCP Request Builders**:

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/utils/MCPRequestBuilders.kt
package io.spiralhouse.cycletime.utils

import kotlinx.serialization.json.*

object MCPRequestBuilders {
    /**
     * Build MCP initialize request.
     */
    fun buildInitializeRequest(id: Int = 1): String = """
        {
            "jsonrpc": "2.0",
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            },
            "id": $id
        }
    """.trimIndent()

    /**
     * Build MCP tools/list request.
     */
    fun buildToolsListRequest(id: Int = 1): String = """
        {
            "jsonrpc": "2.0",
            "method": "tools/list",
            "id": $id
        }
    """.trimIndent()

    /**
     * Build MCP tools/call request.
     */
    fun buildToolCallRequest(
        toolName: String,
        arguments: Map<String, String>,
        sessionId: String? = null,
        id: Int = 1
    ): String {
        val metaJson = if (sessionId != null) {
            ""","meta": {"sessionId": "$sessionId"}"""
        } else {
            ""
        }

        val argsJson = arguments.entries.joinToString(",") { (k, v) ->
            """"$k": "$v""""
        }

        return """
            {
                "jsonrpc": "2.0",
                "method": "tools/call",
                "params": {
                    "name": "$toolName",
                    "arguments": {$argsJson}
                    $metaJson
                },
                "id": $id
            }
        """.trimIndent()
    }

    /**
     * Build MCP resources/list request.
     */
    fun buildResourcesListRequest(id: Int = 1): String = """
        {
            "jsonrpc": "2.0",
            "method": "resources/list",
            "id": $id
        }
    """.trimIndent()

    /**
     * Build MCP resources/read request.
     */
    fun buildResourceReadRequest(
        uri: String,
        sessionId: String,
        id: Int = 1
    ): String = """
        {
            "jsonrpc": "2.0",
            "method": "resources/read",
            "params": {
                "uri": "$uri",
                "meta": {"sessionId": "$sessionId"}
            },
            "id": $id
        }
    """.trimIndent()
}
```

### Test Fixtures for SDK

**Session Test Fixtures**:

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/fixtures/SessionFixtures.kt
package io.spiralhouse.cycletime.fixtures

import io.spiralhouse.cycletime.domain.session.Session
import java.util.UUID

object SessionFixtures {
    /**
     * Create test session with defaults.
     */
    fun createTestSession(
        id: String = UUID.randomUUID().toString(),
        projectId: String = "TEST-123"
    ): Session {
        return Session(
            id = id,
            projectId = projectId,
            createdAt = Instant.now(),
            lastActivity = Instant.now()
        )
    }

    /**
     * Create test session in database.
     */
    suspend fun createTestSessionInDb(
        sessionRepository: SessionRepository,
        id: String = UUID.randomUUID().toString(),
        projectId: String = "TEST-123"
    ): Session {
        val session = createTestSession(id, projectId)
        sessionRepository.save(session)
        return session
    }
}
```

### Database Test Setup for SDK

**Test Database Configuration**:

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/utils/TestDatabase.kt
package io.spiralhouse.cycletime.utils

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

object TestDatabase {
    /**
     * Create in-memory H2 database for tests.
     */
    fun createTestDatabase(): Database {
        val database = Database.connect(
            url = "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
            driver = "org.h2.Driver"
        )

        transaction(database) {
            // Create schema
            SchemaUtils.create(SessionStates, Projects, Issues, Workflows)
        }

        return database
    }

    /**
     * Clean up test database.
     */
    fun cleanupTestDatabase(database: Database) {
        transaction(database) {
            SchemaUtils.drop(SessionStates, Projects, Issues, Workflows)
        }
        TransactionManager.closeAndUnregister(database)
    }
}
```

### CI Configuration Updates

**Gradle Test Tasks** (from migration plan lines 1253-1272):

```kotlin
// File: build.gradle.kts (no changes needed, existing tasks work)

// Existing tasks support SDK tests:
tasks.named<Test>("unitTest") {
    // Runs unit tests including SDK adapter tests
}

tasks.named<Test>("integrationTest") {
    // Runs integration tests including SDK transport tests
}

tasks.named<Test>("systemTest") {
    // Runs system tests including SDK performance tests
}
```

**CI Cache Configuration** (from testing-standards.md SPI-623):

```yaml
# .github/workflows/test.yml (if using GitHub Actions)
- name: Cache test results
  uses: actions/cache@v3
  with:
    path: |
      build/test-results
      build/reports
    key: test-${{ hashFiles('src/**/*.kt') }}

- name: Run tests
  run: |
    ./gradlew ciTest
```

### Mock Services for SDK Tests

**MockSessionService**:

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/mocks/MockSessionService.kt
package io.spiralhouse.cycletime.mocks

import io.spiralhouse.cycletime.application.services.SessionApplicationService
import io.spiralhouse.cycletime.domain.session.Session

class MockSessionService : SessionApplicationService {
    private val sessions = mutableMapOf<String, Session>()

    override suspend fun createSession(projectId: String): Session {
        val session = SessionFixtures.createTestSession(projectId = projectId)
        sessions[session.id] = session
        return session
    }

    override suspend fun getSession(sessionId: String): Session? {
        return sessions[sessionId]
    }

    override suspend fun listSessions(): List<Session> {
        return sessions.values.toList()
    }

    fun clear() {
        sessions.clear()
    }
}
```

### Test Helper Extensions

**HTTP Client Extensions for SDK Tests**:

```kotlin
// File: src/test/kotlin/io/spiralhouse/cycletime/utils/TestClientExtensions.kt
package io.spiralhouse.cycletime.utils

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*

/**
 * Send MCP request to SDK endpoint.
 */
suspend fun HttpClient.sendMCPRequest(
    request: String,
    endpoint: String = "/mcp"
): HttpResponse {
    return post(endpoint) {
        header("Content-Type", "application/json")
        setBody(request)
    }
}

/**
 * Send MCP initialize and return response.
 */
suspend fun HttpClient.mcpInitialize(): HttpResponse {
    return sendMCPRequest(MCPRequestBuilders.buildInitializeRequest())
}

/**
 * Call MCP tool and return response.
 */
suspend fun HttpClient.callMCPTool(
    toolName: String,
    arguments: Map<String, String>,
    sessionId: String? = null
): HttpResponse {
    return sendMCPRequest(
        MCPRequestBuilders.buildToolCallRequest(toolName, arguments, sessionId)
    )
}
```

---

## Success Criteria

### Phase 4 Developer Gates

**Infrastructure Ready**:
- [ ] Test utilities created for SDK patterns
- [ ] Test fixtures updated for SDK transport
- [ ] Database test setup works with SDK
- [ ] Mock services available for SDK tests
- [ ] CI configuration supports SDK tests

**QA Support**:
- [ ] Test application setup documented
- [ ] Request builders functional
- [ ] Test helpers available
- [ ] Example tests provided
- [ ] QA can use infrastructure successfully

**Build Validation**:
- [ ] All utilities compile
- [ ] Example tests pass
- [ ] CI pipeline runs successfully
- [ ] No test infrastructure regressions

---

## References

### Source Documents
- **Migration Plan**: `/docs/architecture/mcp-sdk-v0.7.2-migration-plan.md`
  - Lines 1094-1298: Phase 4 complete implementation
  - Lines 1246-1275: Test application configuration
- **Testing Standards**: `.claude/shared/testing-standards.md`
  - Test organization and patterns

### Files to Create
- `src/test/kotlin/.../utils/TestApplicationConfig.kt`
- `src/test/kotlin/.../utils/MCPRequestBuilders.kt`
- `src/test/kotlin/.../utils/TestClientExtensions.kt`
- `src/test/kotlin/.../fixtures/SessionFixtures.kt`
- `src/test/kotlin/.../mocks/MockSessionService.kt`

---

**Context Package Status**: ✅ READY FOR DELEGATION
**Last Updated**: 2025-10-12
**Owner**: Context Engineer
