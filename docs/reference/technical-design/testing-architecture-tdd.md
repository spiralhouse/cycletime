# Testing Architecture and TDD Patterns - Technical Design

## Overview

This document outlines the comprehensive testing architecture for JCVD, emphasizing Test-Driven Development (TDD) methodology with Ktor's `testApplication` framework and dependency injection overrides. The architecture ensures high-quality, maintainable code through systematic testing at all levels.

## Core Testing Principles

### 1. Test-Driven Development (TDD) Workflow

**The Red-Green-Refactor Cycle:**
1. **RED**: Write a failing test that defines desired behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code quality while keeping tests green

**CRITICAL**: Never write production code without a failing test first.

### 2. Testing Pyramid

```
         /\
        /  \  System Tests (5%)
       /    \   - End-to-end workflows
      /------\   - Production scenarios
     /        \
    /  Integr. \ Integration Tests (25%)
   /   Tests    \  - Real components
  /--------------\  - Database operations
 /                \
/   Unit Tests     \ Unit Tests (70%)
--------------------  - Business logic
                      - Fast, isolated
```

### 3. Test Isolation Principles

- **No Shared State**: Each test runs independently
- **Deterministic**: Same input always produces same output
- **Fast Execution**: Unit tests < 10ms, Integration < 100ms
- **Clear Failures**: Tests fail for one reason only

## Technology Stack

```kotlin
// build.gradle.kts
dependencies {
    // Testing frameworks
    testImplementation("io.kotest:kotest-runner-junit5:5.8.0")
    testImplementation("io.kotest:kotest-assertions-core:5.8.0")
    testImplementation("io.kotest:kotest-property:5.8.0")
    
    // Ktor testing (requires 3.2.3+ for ktor-server-di)
    testImplementation("io.ktor:ktor-server-test-host:3.2.3")
    testImplementation("io.ktor:ktor-client-content-negotiation:3.2.3")
    
    // Mocking
    testImplementation("io.mockk:mockk:1.13.9")
    
    // Test containers for database testing
    testImplementation("org.testcontainers:testcontainers:1.19.3")
    testImplementation("org.testcontainers:junit-jupiter:1.19.3")
    
    // Coroutine testing
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
    }
}
```

## Unit Testing Patterns

### Domain Entity Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/domain/entities/ProjectTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.assertions.throwables.shouldThrow
import io.spiralhouse.jcvd.testing.mocks.MockTimeProvider
import java.time.Instant

class ProjectTest : DescribeSpec({
    
    describe("Project Entity") {
        val mockTimeProvider = MockTimeProvider()
        
        beforeEach {
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
        }
        
        describe("creation") {
            it("should create project with valid data") {
                // RED: Test fails initially (no implementation)
                val project = Project.create(
                    name = "Test Project",
                    description = "Test Description",
                    timeProvider = mockTimeProvider
                )
                
                // Assertions that drive implementation
                project.id shouldNotBe null
                project.name shouldBe "Test Project"
                project.description shouldBe "Test Description"
                project.status shouldBe ProjectStatus.ACTIVE
                project.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
            }
            
            it("should reject empty name") {
                // RED: Test for validation
                shouldThrow<DomainException> {
                    Project.create(
                        name = "",
                        description = "Description",
                        timeProvider = mockTimeProvider
                    )
                }
            }
            
            it("should reject name longer than 255 characters") {
                val longName = "a".repeat(256)
                
                shouldThrow<DomainException> {
                    Project.create(
                        name = longName,
                        description = "Description",
                        timeProvider = mockTimeProvider
                    )
                }
            }
        }
        
        describe("adding issues") {
            it("should add issue to active project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )
                
                val issueId = IssueId.generate()
                project.addIssue(issueId)
                
                project.issues should contain(issueId)
                project.issueCount shouldBe 1
            }
            
            it("should not add issue to archived project") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )
                
                project.archive()
                
                shouldThrow<DomainException> {
                    project.addIssue(IssueId.generate())
                }
            }
        }
        
        describe("time tracking") {
            it("should update timestamp when modified") {
                val project = Project.create(
                    name = "Test Project",
                    description = "Description",
                    timeProvider = mockTimeProvider
                )
                
                // Advance time
                mockTimeProvider.advance(Duration.ofHours(1))
                
                project.updateName("Updated Name")
                
                project.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
                project.name shouldBe "Updated Name"
            }
        }
    }
})
```

### Value Object Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/domain/valueobjects/ProjectIdTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.property.forAll
import io.kotest.property.arbitrary.string

class ProjectIdTest : DescribeSpec({
    
    describe("ProjectId Value Object") {
        
        describe("validation") {
            it("should accept valid UUID format") {
                val validId = "550e8400-e29b-41d4-a716-446655440000"
                val projectId = ProjectId(validId)
                
                projectId.value shouldBe validId
            }
            
            it("should reject empty string") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId("")
                }
            }
            
            it("should reject invalid UUID format") {
                shouldThrow<IllegalArgumentException> {
                    ProjectId("not-a-uuid")
                }
            }
        }
        
        describe("generation") {
            it("should generate unique IDs") {
                val id1 = ProjectId.generate()
                val id2 = ProjectId.generate()
                
                id1 shouldNotBe id2
            }
            
            it("should generate valid UUID format") {
                val id = ProjectId.generate()
                
                // Should not throw when creating new instance with generated value
                val recreated = ProjectId(id.value)
                recreated shouldBe id
            }
        }
        
        describe("equality") {
            it("should be equal for same value") {
                val id1 = ProjectId("550e8400-e29b-41d4-a716-446655440000")
                val id2 = ProjectId("550e8400-e29b-41d4-a716-446655440000")
                
                id1 shouldBe id2
                id1.hashCode() shouldBe id2.hashCode()
            }
        }
        
        describe("property-based testing") {
            it("should maintain consistency") {
                forAll<String> { input ->
                    runCatching { ProjectId(input) }
                        .fold(
                            onSuccess = { id -> id.value == input },
                            onFailure = { true } // Invalid inputs should fail
                        )
                }
            }
        }
    }
})
```

## Integration Testing with Ktor testApplication

### Testing with Ktor Native DI

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/infrastructure/di/DIIntegrationTest.kt

import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf

class DIIntegrationTest : DescribeSpec({
    
    describe("Ktor Native DI") {
        
        it("should resolve dependencies using property delegation") {
            testApplication {
                application {
                    configureDependencies() // Setup Ktor DI
                }
                
                // Use property delegation (recommended)
                val timeProvider: TimeProvider by application.dependencies
                val projectRepo: ProjectRepository by application.dependencies
                
                timeProvider.shouldBeInstanceOf<SystemTimeProvider>()
                projectRepo.shouldBeInstanceOf<ExposedProjectRepository>()
            }
        }
        
        it("should resolve dependencies using instance() method") {
            testApplication {
                application {
                    configureDependencies()
                }
                
                // Direct resolution when needed
                val timeProvider = application.dependencies.instance<TimeProvider>()
                timeProvider.shouldBeInstanceOf<SystemTimeProvider>()
            }
        }
        
        it("should maintain singleton instances") {
            testApplication {
                application {
                    configureDependencies()
                }
                
                val repo1: ProjectRepository by application.dependencies
                val repo2: ProjectRepository by application.dependencies
                
                repo1 shouldBe repo2 // Same instance
            }
        }
    }
})
```

### API Endpoint Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/api/ProjectApiTest.kt

import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import kotlinx.serialization.json.Json
import io.spiralhouse.jcvd.testing.fixtures.TestFixtures

class ProjectApiTest : DescribeSpec({
    
    describe("Project API") {
        
        describe("POST /api/projects") {
            it("should create project with valid data") {
                testApplication {
                    // Configure DI with Ktor native DI
                    application {
                        configureDependencies() // Setup Ktor's native DI
                        configureRouting()
                    }
                    
                    val response = client.post("/api/projects") {
                        contentType(ContentType.Application.Json)
                        setBody("""
                            {
                                "name": "API Test Project",
                                "description": "Testing project creation"
                            }
                        """.trimIndent())
                    }
                    
                    response.status shouldBe HttpStatusCode.Created
                    
                    val responseBody = response.bodyAsText()
                    val project = Json.decodeFromString<ProjectDto>(responseBody)
                    
                    project.name shouldBe "API Test Project"
                    project.description shouldBe "Testing project creation"
                }
            }
            
            it("should return 400 for invalid data") {
                testApplication {
                    application {
                        configureDependencies()
                        configureRouting()
                    }
                    
                    val response = client.post("/api/projects") {
                        contentType(ContentType.Application.Json)
                        setBody("""
                            {
                                "name": "",
                                "description": "Invalid name"
                            }
                        """.trimIndent())
                    }
                    
                    response.status shouldBe HttpStatusCode.BadRequest
                }
            }
        }
        
        describe("GET /api/projects/{id}") {
            it("should retrieve existing project") {
                testApplication {
                    // Setup with test data
                    TestFixtures.withProject { projectId ->
                        val response = client.get("/api/projects/$projectId")
                        
                        response.status shouldBe HttpStatusCode.OK
                        
                        val project = Json.decodeFromString<ProjectDto>(response.bodyAsText())
                        project.id shouldBe projectId
                    }
                }
            }
            
            it("should return 404 for non-existent project") {
                testApplication {
                    application {
                        configureDependencies()
                        configureRouting()
                    }
                    
                    val response = client.get("/api/projects/non-existent-id")
                    response.status shouldBe HttpStatusCode.NotFound
                }
            }
        }
    }
})
```

### WebSocket Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/mcp/MCPWebSocketTest.kt

import io.ktor.client.plugins.websocket.*
import io.ktor.server.testing.*
import io.ktor.websocket.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import kotlinx.serialization.json.*

class MCPWebSocketTest : DescribeSpec({
    
    describe("MCP WebSocket") {
        
        it("should handle MCP handshake") {
            testApplication {
                application {
                    configureDependencies()
                    configureMCP()
                }
                
                client.webSocket("/mcp") {
                    // Send initialize request
                    val initRequest = buildJsonObject {
                        put("jsonrpc", "2.0")
                        put("method", "initialize")
                        put("id", 1)
                        put("params", buildJsonObject {
                            put("protocolVersion", "1.0")
                            put("clientInfo", buildJsonObject {
                                put("name", "test-client")
                                put("version", "1.0.0")
                            })
                        })
                    }
                    
                    send(Frame.Text(initRequest.toString()))
                    
                    // Receive response
                    val response = incoming.receive() as Frame.Text
                    val responseJson = Json.parseToJsonElement(response.readText()).jsonObject
                    
                    responseJson["jsonrpc"]?.jsonPrimitive?.content shouldBe "2.0"
                    responseJson["id"]?.jsonPrimitive?.int shouldBe 1
                    responseJson["result"] shouldNotBe null
                }
            }
        }
        
        it("should handle resource requests") {
            testApplication {
                TestFixtures.withProject { projectId ->
                    client.webSocket("/mcp") {
                        // Initialize first
                        MCPTestHelper.initialize(this)
                        
                        // Request project resource
                        val resourceRequest = buildJsonObject {
                            put("jsonrpc", "2.0")
                            put("method", "resources/read")
                            put("id", 2)
                            put("params", buildJsonObject {
                                put("uri", "jcvd://project/$projectId")
                            })
                        }
                        
                        send(Frame.Text(resourceRequest.toString()))
                        
                        val response = incoming.receive() as Frame.Text
                        val responseJson = Json.parseToJsonElement(response.readText()).jsonObject
                        
                        val result = responseJson["result"]?.jsonObject
                        result?.get("contents")?.jsonArray?.isNotEmpty() shouldBe true
                    }
                }
            }
        }
    }
})
```

## Repository Testing with Test Containers

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/infrastructure/H2ProjectRepositoryTest.kt

import org.testcontainers.containers.GenericContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.transactions.transaction

@Testcontainers
class H2ProjectRepositoryTest : DescribeSpec({
    
    companion object {
        @Container
        val h2Container = GenericContainer<Nothing>("oscarfonts/h2:2.2.224").apply {
            withExposedPorts(9092, 8082)
            withEnv("H2_OPTIONS", "-ifNotExists")
        }
    }
    
    describe("H2ProjectRepository with real database") {
        lateinit var database: Database
        lateinit var repository: H2ProjectRepository
        val timeProvider = RealTimeProvider()
        
        beforeSpec {
            h2Container.start()
            
            val jdbcUrl = "jdbc:h2:tcp://localhost:${h2Container.getMappedPort(9092)}/test"
            database = Database.connect(jdbcUrl, driver = "org.h2.Driver")
            
            transaction(database) {
                SchemaUtils.create(Projects, Issues, ProjectIssues)
            }
            
            repository = H2ProjectRepository(database, timeProvider)
        }
        
        afterSpec {
            h2Container.stop()
        }
        
        describe("CRUD operations") {
            it("should save and retrieve project") {
                val project = Project.create(
                    name = "Container Test",
                    description = "Testing with containers",
                    timeProvider = timeProvider
                )
                
                runBlocking {
                    repository.save(project)
                    
                    val retrieved = repository.findById(project.id)
                    
                    retrieved shouldNotBe null
                    retrieved?.name shouldBe "Container Test"
                    retrieved?.description shouldBe "Testing with containers"
                }
            }
            
            it("should handle concurrent access") {
                val projects = (1..10).map { index ->
                    Project.create(
                        name = "Concurrent $index",
                        description = "Testing concurrency",
                        timeProvider = timeProvider
                    )
                }
                
                runBlocking {
                    // Save all projects concurrently
                    projects.map { project ->
                        async {
                            repository.save(project)
                        }
                    }.awaitAll()
                    
                    // Verify all saved
                    val allProjects = repository.findAll()
                    allProjects.size shouldBe projects.size
                }
            }
        }
    }
})
```

## Test Fixtures and Builders

### Test Data Builders

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/builders/ProjectBuilder.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.ProjectStatus
import io.spiralhouse.jcvd.testing.mocks.MockTimeProvider
import java.time.Instant

/**
 * Builder for test projects with sensible defaults
 */
class ProjectBuilder {
    private var id: ProjectId = ProjectId.generate()
    private var name: String = "Test Project"
    private var description: String = "Test Description"
    private var status: ProjectStatus = ProjectStatus.ACTIVE
    private var timeProvider: TimeProvider = MockTimeProvider()
    private var createdAt: Instant = Instant.now()
    
    fun withId(id: ProjectId) = apply { this.id = id }
    fun withName(name: String) = apply { this.name = name }
    fun withDescription(description: String) = apply { this.description = description }
    fun withStatus(status: ProjectStatus) = apply { this.status = status }
    fun withTimeProvider(provider: TimeProvider) = apply { this.timeProvider = provider }
    fun withCreatedAt(instant: Instant) = apply { this.createdAt = instant }
    
    fun build(): Project {
        if (timeProvider is MockTimeProvider) {
            (timeProvider as MockTimeProvider).setTime(createdAt)
        }
        
        return Project.fromSnapshot(
            id = id,
            name = name,
            description = description,
            status = status,
            issueIds = emptyList(),
            createdAt = createdAt,
            updatedAt = createdAt,
            timeProvider = timeProvider
        )
    }
}

// Usage in tests
val testProject = ProjectBuilder()
    .withName("My Test Project")
    .withStatus(ProjectStatus.ACTIVE)
    .build()
```

### Test Fixtures

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/fixtures/TestFixtures.kt

import io.ktor.server.testing.*
import io.spiralhouse.jcvd.testing.mocks.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

object TestFixtures {
    
    /**
     * Setup test application with in-memory database using Ktor native DI
     */
    fun testApplication(
        mockTimeProvider: TimeProvider? = null,
        block: suspend ApplicationTestBuilder.() -> Unit
    ) = testApplication {
        application {
            // Configure with Ktor native DI
            configureDependencies()
            
            // Override with mocks if provided (Ktor DI pattern)
            mockTimeProvider?.let {
                // Re-configure dependencies with override
                dependencies {
                    provide<TimeProvider> { mockTimeProvider }
                }
            }
            
            // Initialize test database using Ktor DI
            val db: Database by application.dependencies
            transaction(db) {
                SchemaUtils.create(Projects, Issues, Workflows, Sessions)
            }
            
            configureRouting()
            configureMCP()
        }
        
        block()
    }
    
    /**
     * Create test project and execute block with its ID
     */
    suspend fun ApplicationTestBuilder.withProject(
        name: String = "Test Project",
        block: suspend ApplicationTestBuilder.(projectId: String) -> Unit
    ) {
        // Use Ktor DI property delegation
        val projectService: ProjectApplicationService by application.dependencies
        
        val project = projectService.createProject(
            CreateProjectCommand(name, "Test Description")
        )
        
        block(project.id)
    }
    
    /**
     * Create test issue hierarchy
     */
    suspend fun ApplicationTestBuilder.withIssueHierarchy(
        block: suspend ApplicationTestBuilder.(epic: IssueDto, story: IssueDto, subtask: IssueDto) -> Unit
    ) {
        withProject { projectId ->
            val issueService = application.dependencies.get<IssueApplicationService>()
            
            val epic = issueService.createIssue(
                CreateIssueCommand(
                    projectId = ProjectId(projectId),
                    title = "Test Epic",
                    description = "Epic Description",
                    type = IssueType.EPIC
                )
            )
            
            val story = issueService.createIssue(
                CreateIssueCommand(
                    projectId = ProjectId(projectId),
                    title = "Test Story",
                    description = "Story Description",
                    type = IssueType.STORY,
                    parentId = IssueId(epic.id)
                )
            )
            
            val subtask = issueService.createIssue(
                CreateIssueCommand(
                    projectId = ProjectId(projectId),
                    title = "Test Subtask",
                    description = "Subtask Description",
                    type = IssueType.SUBTASK,
                    parentId = IssueId(story.id)
                )
            )
            
            block(epic, story, subtask)
        }
    }
}

// Usage in tests
class IssueHierarchyTest : DescribeSpec({
    describe("Issue Hierarchy") {
        it("should validate parent-child relationships") {
            TestFixtures.testApplication {
                TestFixtures.withIssueHierarchy { epic, story, subtask ->
                    story.parentId shouldBe epic.id
                    subtask.parentId shouldBe story.id
                }
            }
        }
    }
})
```

## Mock Implementations

### MockTimeProvider

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/mocks/MockTimeProvider.kt

import io.spiralhouse.jcvd.domain.services.TimeProvider
import java.time.Duration
import java.time.Instant

class MockTimeProvider(
    private var currentTime: Instant = Instant.now()
) : TimeProvider {
    
    override fun now(): Instant = currentTime
    
    override fun currentTimeMillis(): Long = currentTime.toEpochMilli()
    
    fun setTime(time: Instant) {
        currentTime = time
    }
    
    fun setTime(iso: String) {
        currentTime = Instant.parse(iso)
    }
    
    fun advance(duration: Duration) {
        currentTime = currentTime.plus(duration)
    }
    
    fun rewind(duration: Duration) {
        currentTime = currentTime.minus(duration)
    }
    
    fun reset() {
        currentTime = Instant.now()
    }
}
```

### MockRepository

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/mocks/MockProjectRepository.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId

class MockProjectRepository : ProjectRepository {
    private val storage = mutableMapOf<ProjectId, Project>()
    private val methodCalls = mutableListOf<String>()
    
    override suspend fun findById(id: ProjectId): Project? {
        methodCalls.add("findById:$id")
        return storage[id]
    }
    
    override suspend fun findAll(): List<Project> {
        methodCalls.add("findAll")
        return storage.values.toList()
    }
    
    override suspend fun save(project: Project) {
        methodCalls.add("save:${project.id}")
        storage[project.id] = project
    }
    
    override suspend fun delete(id: ProjectId): Boolean {
        methodCalls.add("delete:$id")
        return storage.remove(id) != null
    }
    
    override suspend fun exists(id: ProjectId): Boolean {
        methodCalls.add("exists:$id")
        return storage.containsKey(id)
    }
    
    // Test helpers
    fun wasCalled(method: String): Boolean = method in methodCalls
    fun callCount(method: String): Int = methodCalls.count { it.startsWith(method) }
    fun reset() {
        storage.clear()
        methodCalls.clear()
    }
    
    fun addTestData(vararg projects: Project) {
        projects.forEach { storage[it.id] = it }
    }
}
```

## Test Configuration

### Kotest Configuration

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/ProjectConfig.kt

import io.kotest.core.config.AbstractProjectConfig
import io.kotest.core.spec.IsolationMode
import io.kotest.extensions.system.withEnvironment
import kotlin.time.Duration.Companion.seconds

object ProjectConfig : AbstractProjectConfig() {
    override val parallelism = 4
    override val timeout = 10.seconds
    override val isolationMode = IsolationMode.InstancePerLeaf
    
    override suspend fun beforeProject() {
        // Set test environment variables
        withEnvironment(mapOf(
            "KTOR_ENV" to "test",
            "DATABASE_URL" to "jdbc:h2:mem:test",
            "LOG_LEVEL" to "DEBUG"
        ))
    }
    
    override suspend fun afterProject() {
        // Cleanup after all tests
    }
}
```

### Test Logging Configuration

```xml
<!-- src/test/resources/logback-test.xml -->
<configuration>
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <logger name="org.jetbrains.exposed" level="WARN"/>
    <logger name="io.ktor" level="INFO"/>
    <logger name="io.spiralhouse.jcvd" level="DEBUG"/>

    <root level="INFO">
        <appender-ref ref="STDOUT"/>
    </root>
</configuration>
```

## Performance Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/performance/ProjectPerformanceTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.longs.shouldBeLessThan
import kotlin.system.measureTimeMillis

class ProjectPerformanceTest : DescribeSpec({
    
    describe("Performance benchmarks") {
        
        it("should create project in < 10ms") {
            val repository = MockProjectRepository()
            val service = createTestProjectService(repository)
            
            val time = measureTimeMillis {
                runBlocking {
                    service.createProject(
                        CreateProjectCommand("Perf Test", "Description")
                    )
                }
            }
            
            time shouldBeLessThan 10
        }
        
        it("should handle 1000 concurrent requests") {
            TestFixtures.testApplication {
                val times = (1..1000).map {
                    async {
                        measureTimeMillis {
                            client.get("/api/health")
                        }
                    }
                }.awaitAll()
                
                val avg = times.average()
                val p99 = times.sorted()[990]
                
                println("Average: ${avg}ms, P99: ${p99}ms")
                
                p99 shouldBeLessThan 100
            }
        }
    }
})
```

## Test Coverage Requirements

### Coverage Targets

```kotlin
// build.gradle.kts
tasks.test {
    finalizedBy(tasks.jacocoTestReport)
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = "0.80".toBigDecimal() // 80% overall coverage
            }
        }
        
        rule {
            element = "CLASS"
            includes = listOf("io.spiralhouse.jcvd.domain.*")
            limit {
                minimum = "0.95".toBigDecimal() // 95% for domain
            }
        }
    }
}
```

## Best Practices

### 1. Test Naming Conventions

```kotlin
describe("ComponentUnderTest") {
    context("when condition") {
        it("should expected behavior") {
            // Test implementation
        }
    }
}
```

### 2. Arrange-Act-Assert Pattern

```kotlin
it("should calculate project completion") {
    // Arrange
    val project = ProjectBuilder().build()
    val completedIssues = 5
    val totalIssues = 10
    
    // Act
    val completion = project.calculateCompletion(completedIssues, totalIssues)
    
    // Assert
    completion shouldBe 0.5
}
```

### 3. Test Data Isolation

```kotlin
beforeEach {
    // Fresh database for each test
    database = Database.connect(
        "jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1"
    )
}
```

### 4. Async Testing

```kotlin
it("should handle async operations") {
    runTest { // TestScope for coroutines
        val result = async {
            service.performAsyncOperation()
        }
        
        advanceTimeBy(1000) // Control time in tests
        
        result.await() shouldBe expectedValue
    }
}
```

## Common Testing Patterns

### Testing Domain Events

```kotlin
it("should emit domain events") {
    val eventCollector = TestEventCollector()
    
    val project = ProjectBuilder()
        .withEventPublisher(eventCollector)
        .build()
    
    project.archive()
    
    eventCollector.events should haveSize(1)
    eventCollector.events.first() should beInstanceOf<ProjectArchivedEvent>()
}
```

### Testing Validation

```kotlin
describe("validation") {
    val validCases = listOf(
        "Valid Name" to true,
        "" to false,
        "a".repeat(256) to false
    )
    
    validCases.forEach { (input, expected) ->
        it("should ${if (expected) "accept" else "reject"} '$input'") {
            val result = runCatching {
                Project.create(input, "Description", mockTimeProvider)
            }
            
            result.isSuccess shouldBe expected
        }
    }
}
```

### Testing Error Scenarios

```kotlin
it("should handle repository errors gracefully") {
    val repository = MockProjectRepository().apply {
        throwOnSave = RepositoryException("Database error")
    }
    
    val service = createTestProjectService(repository)
    
    val result = runCatching {
        service.createProject(CreateProjectCommand("Test", "Description"))
    }
    
    result.isFailure shouldBe true
    result.exceptionOrNull() should beInstanceOf<ApplicationException>()
}
```

## Continuous Integration

### GitHub Actions Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Cache Gradle packages
      uses: actions/cache@v3
      with:
        path: |
          ~/.gradle/caches
          ~/.gradle/wrapper
        key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
        
    - name: Run tests
      run: ./gradlew test jacocoTestReport
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./build/reports/jacoco/test/jacocoTestReport.xml
        
    - name: Publish test results
      uses: EnricoMi/publish-unit-test-result-action@v2
      if: always()
      with:
        files: |
          build/test-results/**/*.xml
```

## Troubleshooting

### Common Test Issues

1. **Flaky Tests**
   - Use MockTimeProvider for deterministic time
   - Avoid Thread.sleep(), use coroutine delays
   - Ensure proper test isolation

2. **Slow Tests**
   - Use in-memory H2 instead of file-based
   - Mock expensive operations
   - Run integration tests separately

3. **DI Issues in Tests**
   - Ensure `override = true` for test modules
   - Clear DI container between tests if needed
   - Use proper test fixtures

4. **Database State Leaks**
   - Use unique database names per test
   - Transaction rollback in afterEach
   - Clear tables explicitly if needed

## Summary

This testing architecture ensures:
- **Quality**: TDD drives better design
- **Confidence**: Comprehensive test coverage
- **Speed**: Fast feedback loops
- **Maintainability**: Clear, isolated tests
- **Documentation**: Tests serve as living documentation
