# Dependency Injection Patterns - Technical Design

## Quick Start for Developers

**We use Ktor's native DI plugin (`ktor-server-di`)**

### Adding a New Dependency
```kotlin
// In Application.kt configureDependencies()
dependencies {
    provide<YourInterface> { YourImplementation() }
}
```

### Using Dependencies
```kotlin
// Property delegation (recommended)
val service: YourInterface by application.dependencies

// Direct resolution
val service = application.dependencies.instance<YourInterface>()
```

### Key Points
- ✅ All dependencies are singletons by default
- ✅ Use interfaces for testability
- ✅ Constructor injection for repositories and services

## Overview

This document outlines the dependency injection (DI) patterns for CycleTime using **Ktor native DI** (implemented in SPI-458). The design enables testable, maintainable code following Domain-Driven Design (DDD) principles while leveraging Kotlin's type safety.

**Current State**: Using Ktor's native DI (`ktor-server-di`) - completed migration from Koin 4.0
**Implementation**: Ktor 3.2.3 with native DI plugin for seamless integration with Ktor's testing framework

## Technology Stack

### Current Dependencies (Ktor Native DI Implementation)

```kotlin
// build.gradle.kts - Current implementation (as of SPI-458)
dependencies {
    // Ktor with CIO server engine
    implementation("io.ktor:ktor-server-core:3.2.3")
    implementation("io.ktor:ktor-server-cio:3.2.3")
    implementation("io.ktor:ktor-server-content-negotiation:3.2.3")
    implementation("io.ktor:ktor-server-sse:3.2.3")
    
    // Native DI framework
    implementation("io.ktor:ktor-server-di:3.2.3")
    
    // Database - SQLite implementation (H2 migration planned in SPI-439)
    implementation("org.xerial:sqlite-jdbc:3.46.1.3")
    implementation("com.zaxxer:HikariCP:6.2.1")
    implementation("org.jetbrains.exposed:exposed-core:0.58.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.58.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.58.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.58.0")
    implementation("org.jetbrains.exposed:exposed-kotlin-datetime:0.58.0")
}
```


## Current Architecture (Ktor Native DI)

### Current DI Configuration (Implemented in SPI-458)

```kotlin
// src/main/kotlin/io/spiralhouse/jcvd/Application.kt

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.jcvd.domain.services.*
import io.spiralhouse.jcvd.domain.repositories.*
import io.spiralhouse.jcvd.infrastructure.persistence.*

fun Application.configureDependencies() {
    // Using Ktor's native DI plugin
    dependencies {
        // Domain Services
        provide<TimeProvider> { SystemTimeProvider() }
        
        // Repositories
        provide<ProjectRepository> { ExposedProjectRepository() }
        provide<IssueRepository> { ExposedIssueRepository() }
        provide<SessionRepository> { ExposedSessionRepository() }
    }
}

fun Application.module() {
    // Configure dependencies first
    configureDependencies()
    
    // Initialize database
    DatabaseFactory.init(
        jdbcUrl = System.getenv("DATABASE_URL") ?: "jdbc:sqlite:cycletime.db",
        enableLogging = System.getenv("DATABASE_LOGGING")?.toBoolean() ?: false
    )
    
    // Other configuration...
}
```

### Accessing Dependencies

```kotlin
// Using property delegation (recommended)
class SomeService(application: Application) {
    private val timeProvider: TimeProvider by application.dependencies
    private val projectRepository: ProjectRepository by application.dependencies
}

// Direct resolution (when needed)
fun Application.someFunction() {
    val timeProvider = dependencies.instance<TimeProvider>()
}
```

## Planned Architecture Enhancements (Post SPI-460)

### Enhanced DI Configuration with Application Services

```kotlin
// src/main/kotlin/io/spiralhouse/jcvd/Application.kt

import io.ktor.server.application.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.jcvd.domain.repositories.*
import io.spiralhouse.jcvd.domain.services.*
import io.spiralhouse.jcvd.application.services.*
import io.spiralhouse.jcvd.infrastructure.persistence.*
import io.spiralhouse.jcvd.infrastructure.database.*
import org.jetbrains.exposed.sql.Database

/**
 * Enhanced dependency configuration after TDD rebuild (SPI-460)
 */
fun Application.configureDependencies() {
    dependencies {
        // Domain Services
        provide<TimeProvider> { SystemTimeProvider() }
        provide<IdGenerator> { UUIDGenerator() }
        
        // Database
        provide<Database> {
            DatabaseFactory.createDatabase(
                jdbcUrl = environment.config.property("database.url").getString()
            )
        }
        
        // Repositories (with proper constructor injection)
        provide<ProjectRepository> { 
            ExposedProjectRepository(instance(), instance<TimeProvider>())
        }
        provide<IssueRepository> { 
            ExposedIssueRepository(instance(), instance<TimeProvider>())
        }
        provide<SessionRepository> { 
            ExposedSessionRepository(instance(), instance<TimeProvider>())
        }
        provide<UnitOfWork> { 
            ExposedUnitOfWork(instance())
        }
        
        // Application Services (to be added in SPI-460)
        provide<ProjectApplicationService> {
            ProjectApplicationService(
                projectRepository = instance(),
                issueRepository = instance(),
                unitOfWork = instance(),
                timeProvider = instance()
            )
        }
        provide<IssueApplicationService> {
            IssueApplicationService(
                issueRepository = instance(),
                projectRepository = instance(),
                unitOfWork = instance(),
                timeProvider = instance()
            )
        }
    }
}

/**
 * Database module - H2 configuration and connection management
 */
val databaseModule = DIModule("database") {
    single<Database> {
        Database.connect(
            url = environment.config.property("database.url").getString(),
            driver = "org.h2.Driver",
            user = environment.config.propertyOrNull("database.user")?.getString() ?: "",
            password = environment.config.propertyOrNull("database.password")?.getString() ?: ""
        )
    }
    
    single<DatabaseInitializer> {
        DatabaseInitializer(get())
    }
}

/**
 * Domain services module
 */
val domainModule = DIModule("domain") {
    single<TimeProvider> {
        RealTimeProvider()
    }
    
    single<IdGenerator> {
        UUIDGenerator()
    }
    
    single<ProjectDomainService> {
        ProjectDomainService(get())
    }
    
    single<IssueDomainService> {
        IssueDomainService()
    }
}

/**
 * Repository module - Infrastructure implementations
 */
val repositoryModule = DIModule("repositories") {
    single<ProjectRepository> {
        H2ProjectRepository(get(), get())
    }
    
    single<IssueRepository> {
        H2IssueRepository(get(), get())
    }
    
    single<WorkflowRepository> {
        H2WorkflowRepository(get(), get())
    }
    
    single<SessionRepository> {
        H2SessionRepository(get(), get())
    }
    
    single<UnitOfWork> {
        H2UnitOfWork(get())
    }
}

/**
 * Application services module
 */
val applicationServiceModule = DIModule("applicationServices") {
    single<ProjectApplicationService> {
        ProjectApplicationService(
            projectRepository = get(),
            issueRepository = get(),
            unitOfWork = get(),
            domainService = get(),
            timeProvider = get()
        )
    }
    
    single<IssueApplicationService> {
        IssueApplicationService(
            issueRepository = get(),
            projectRepository = get(),
            unitOfWork = get(),
            domainService = get(),
            timeProvider = get()
        )
    }
    
    single<SessionApplicationService> {
        SessionApplicationService(
            sessionRepository = get(),
            unitOfWork = get(),
            timeProvider = get()
        )
    }
    
    single<WorkflowApplicationService> {
        WorkflowApplicationService(
            workflowRepository = get(),
            projectRepository = get(),
            unitOfWork = get(),
            timeProvider = get()
        )
    }
}

/**
 * MCP server module
 */
val mcpModule = DIModule("mcp") {
    single<ProjectResource> {
        ProjectResource(get())
    }
    
    single<IssueResource> {
        IssueResource(get())
    }
    
    single<WorkflowResource> {
        WorkflowResource(get())
    }
    
    single<CreateProjectTool> {
        CreateProjectTool(get())
    }
    
    single<CreateIssueTool> {
        CreateIssueTool(get())
    }
    
    single<UpdateIssueStatusTool> {
        UpdateIssueStatusTool(get())
    }
    
    single<MCPServer> {
        CycleTimeMCPServer(
            projectResource = get(),
            issueResource = get(),
            workflowResource = get(),
            createProjectTool = get(),
            createIssueTool = get(),
            updateIssueStatusTool = get()
        )
    }
}
```

### Application Setup with DI

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/Application.kt

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.di.*
import io.spiralhouse.jcvd.infrastructure.di.configureDependencies
import io.spiralhouse.jcvd.infrastructure.routing.configureRouting
import io.spiralhouse.jcvd.infrastructure.mcp.configureMCP

fun main() {
    embeddedServer(Netty, port = 8080) {
        // Configure DI first - makes dependencies available
        configureDependencies()
        
        // Initialize database
        val dbInitializer = dependencies.get<DatabaseInitializer>()
        dbInitializer.initialize()
        
        // Configure other modules that use DI
        configureRouting()
        configureMCP()
        
    }.start(wait = true)
}

/**
 * Extension function to access DI container
 */
val Application.dependencies: DI
    get() = plugin(DI)
```

## Testing with DI (Current Implementation)

### Integration Test Configuration

```kotlin
// src/test/kotlin/io/spiralhouse/jcvd/integration/DependencyInjectionIntegrationTest.kt

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import io.ktor.server.testing.*
import io.ktor.server.plugins.di.*
import io.spiralhouse.jcvd.domain.services.*
import io.spiralhouse.jcvd.domain.repositories.*

class DependencyInjectionIntegrationTest : StringSpec({
    
    "should resolve TimeProvider as SystemTimeProvider singleton" {
        testApplication {
            application {
                configureDependencies()
            }
            
            // Using property delegation
            val timeProvider1: TimeProvider by application.dependencies
            val timeProvider2: TimeProvider by application.dependencies
            
            timeProvider1.shouldBeInstanceOf<SystemTimeProvider>()
            timeProvider1 shouldBe timeProvider2 // Verify singleton
        }
    }
    
    "should resolve all repository dependencies" {
        testApplication {
            application {
                configureDependencies()
            }
            
            val projectRepo: ProjectRepository by application.dependencies
            val issueRepo: IssueRepository by application.dependencies
            val sessionRepo: SessionRepository by application.dependencies
            
            projectRepo.shouldBeInstanceOf<ExposedProjectRepository>()
            issueRepo.shouldBeInstanceOf<ExposedIssueRepository>()
            sessionRepo.shouldBeInstanceOf<ExposedSessionRepository>()
        }
    }
})

/**
 * Extension function for test setup with DI
 */
fun ApplicationTestBuilder.configureDIForTest(
    mockTimeProvider: TimeProvider? = null,
    mockProjectRepository: ProjectRepository? = null,
    mockIssueRepository: IssueRepository? = null
) {
    application {
        // Load production DI configuration
        configureDependencies()
        
        // Override with test-specific dependencies
        dependencies.import(testDIModule(
            mockTimeProvider,
            mockProjectRepository,
            mockIssueRepository
        ))
    }
}
```

### Unit Testing with DI

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/application/ProjectApplicationServiceTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.ktor.server.testing.*
import io.spiralhouse.jcvd.testing.mocks.*
import io.spiralhouse.jcvd.testing.configureDIForTest
import java.time.Instant

class ProjectApplicationServiceTest : DescribeSpec({
    
    describe("ProjectApplicationService with DI") {
        
        it("should create project with mocked dependencies") {
            testApplication {
                // Setup test DI with mocks
                val mockTimeProvider = MockTimeProvider()
                val mockProjectRepo = MockProjectRepository()
                
                configureDIForTest(
                    mockTimeProvider = mockTimeProvider,
                    mockProjectRepository = mockProjectRepo
                )
                
                // Get service from DI container
                val projectService = application.dependencies.get<ProjectApplicationService>()
                
                // Test with controlled time
                mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
                
                val command = CreateProjectCommand(
                    name = "Test Project",
                    description = "Test Description"
                )
                
                val project = projectService.createProject(command)
                
                project shouldNotBe null
                project.name shouldBe "Test Project"
                project.createdAt shouldBe Instant.parse("2025-01-15T10:00:00Z")
                
                // Verify repository was called
                mockProjectRepo.wasSaveCalled shouldBe true
            }
        }
        
        it("should handle time-dependent operations") {
            testApplication {
                val mockTimeProvider = MockTimeProvider()
                
                configureDIForTest(mockTimeProvider = mockTimeProvider)
                
                val projectService = application.dependencies.get<ProjectApplicationService>()
                
                // Set initial time
                mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
                
                val project = projectService.createProject(
                    CreateProjectCommand("Project", "Description")
                )
                
                // Advance time
                mockTimeProvider.advance(Duration.ofHours(1))
                
                projectService.updateProject(
                    UpdateProjectCommand(project.id, name = "Updated")
                )
                
                val updated = projectService.getProject(project.id)
                updated?.updatedAt shouldBe Instant.parse("2025-01-15T11:00:00Z")
            }
        }
    }
})
```

### Integration Testing with DI

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/integration/ProjectIntegrationTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.ktor.server.testing.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.spiralhouse.jcvd.testing.configureDIForTest
import kotlinx.serialization.json.Json

class ProjectIntegrationTest : DescribeSpec({
    
    describe("Project API Integration") {
        
        it("should create and retrieve project") {
            testApplication {
                // Use in-memory H2 for integration test
                configureDIForTest()
                
                // Initialize database schema
                val dbInitializer = application.dependencies.get<DatabaseInitializer>()
                dbInitializer.initialize()
                
                // Test API endpoint
                val response = client.post("/api/projects") {
                    contentType(ContentType.Application.Json)
                    setBody("""
                        {
                            "name": "Integration Test Project",
                            "description": "Testing with real H2 database"
                        }
                    """)
                }
                
                response.status shouldBe HttpStatusCode.Created
                
                val projectJson = response.bodyAsText()
                val project = Json.decodeFromString<ProjectDto>(projectJson)
                
                project.name shouldBe "Integration Test Project"
                
                // Verify persistence
                val getResponse = client.get("/api/projects/${project.id}")
                getResponse.status shouldBe HttpStatusCode.OK
            }
        }
    }
})
```

## Domain Service Injection Patterns

### Time Provider Pattern

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/domain/services/TimeProvider.kt

interface TimeProvider {
    fun now(): Instant
    fun currentTimeMillis(): Long
}

// Production implementation
class RealTimeProvider : TimeProvider {
    override fun now(): Instant = Instant.now()
    override fun currentTimeMillis(): Long = System.currentTimeMillis()
}

// Test implementation
class MockTimeProvider : TimeProvider {
    private var currentTime: Instant = Instant.now()
    
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
}
```

### Database Provider Pattern

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/database/DatabaseProvider.kt

interface DatabaseProvider {
    fun getConnection(): Database
    suspend fun <T> executeInTransaction(block: suspend () -> T): T
}

class H2DatabaseProvider(
    private val database: Database
) : DatabaseProvider {
    
    override fun getConnection(): Database = database
    
    override suspend fun <T> executeInTransaction(block: suspend () -> T): T {
        return transaction(database) {
            runBlocking { block() }
        }
    }
}

// Test implementation with rollback support
class TestDatabaseProvider(
    private val database: Database,
    private val autoRollback: Boolean = false
) : DatabaseProvider {
    
    override fun getConnection(): Database = database
    
    override suspend fun <T> executeInTransaction(block: suspend () -> T): T {
        return transaction(database) {
            val result = runBlocking { block() }
            if (autoRollback) {
                rollback()
            }
            result
        }
    }
}
```

## Application Service DI Patterns

### Constructor Injection for Services

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/ProjectApplicationService.kt

class ProjectApplicationService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val unitOfWork: UnitOfWork,
    private val domainService: ProjectDomainService,
    private val timeProvider: TimeProvider
) {
    suspend fun createProject(command: CreateProjectCommand): Project {
        return unitOfWork.execute {
            val project = Project.create(
                name = command.name,
                description = command.description,
                timeProvider = timeProvider
            )
            
            projectRepository.save(project)
            project
        }
    }
    
    suspend fun addIssueToProject(
        projectId: ProjectId,
        command: CreateIssueCommand
    ): Issue {
        return unitOfWork.execute {
            val project = projectRepository.findById(projectId)
                ?: throw NotFoundException("Project not found")
            
            val issue = project.addIssue(
                title = command.title,
                description = command.description,
                timeProvider = timeProvider
            )
            
            projectRepository.save(project)
            issueRepository.save(issue)
            
            issue
        }
    }
}
```

### Unit of Work Pattern with DI

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/domain/services/UnitOfWork.kt

interface UnitOfWork {
    suspend fun <T> execute(block: suspend () -> T): T
    suspend fun rollback()
}

// H2 implementation with transaction support
class H2UnitOfWork(
    private val database: Database
) : UnitOfWork {
    
    override suspend fun <T> execute(block: suspend () -> T): T {
        return transaction(database) {
            try {
                runBlocking { block() }
            } catch (e: Exception) {
                rollback()
                throw e
            }
        }
    }
    
    override suspend fun rollback() {
        // H2 handles rollback automatically in transaction block
    }
}

// Test implementation with manual control
class TestUnitOfWork : UnitOfWork {
    private var shouldRollback = false
    private val operations = mutableListOf<suspend () -> Unit>()
    
    override suspend fun <T> execute(block: suspend () -> T): T {
        return if (shouldRollback) {
            throw RollbackException("Test rollback triggered")
        } else {
            block()
        }
    }
    
    override suspend fun rollback() {
        shouldRollback = true
    }
    
    fun reset() {
        shouldRollback = false
        operations.clear()
    }
}
```

## MCP Resource and Tool DI

### Resource Registration with DI

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/MCPConfiguration.kt

fun Application.configureMCP() {
    val mcpServer = dependencies.get<MCPServer>()
    
    // Resources are already injected via DI
    mcpServer.start()
    
    // Register WebSocket endpoint
    routing {
        webSocket("/mcp") {
            mcpServer.handleConnection(this)
        }
    }
}

// MCP Resource with injected dependencies
class ProjectResource(
    private val projectService: ProjectApplicationService
) : MCPResource {
    
    override suspend fun read(uri: String): ResourceContent {
        val projectId = extractProjectId(uri)
        val project = projectService.getProject(projectId)
            ?: throw ResourceNotFoundException(uri)
        
        return ResourceContent(
            uri = uri,
            mimeType = "application/json",
            text = Json.encodeToString(project)
        )
    }
    
    override suspend fun list(): List<ResourceDescriptor> {
        val projects = projectService.listProjects()
        return projects.map { project ->
            ResourceDescriptor(
                uri = "jcvd://project/${project.id}",
                name = project.name,
                description = project.description
            )
        }
    }
}
```

### Tool Implementation with DI

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/mcp/tools/CreateProjectTool.kt

class CreateProjectTool(
    private val projectService: ProjectApplicationService
) : MCPTool {
    
    override val name = "cycletime_create_project"
    override val description = "Create a new project"
    
    override val inputSchema = JsonSchema(
        type = "object",
        properties = mapOf(
            "name" to JsonSchema(type = "string"),
            "description" to JsonSchema(type = "string")
        ),
        required = listOf("name")
    )
    
    override suspend fun execute(arguments: JsonObject): JsonObject {
        val command = CreateProjectCommand(
            name = arguments["name"]?.jsonPrimitive?.content 
                ?: throw ValidationException("Name required"),
            description = arguments["description"]?.jsonPrimitive?.content ?: ""
        )
        
        val project = projectService.createProject(command)
        
        return buildJsonObject {
            put("id", project.id.value)
            put("name", project.name)
            put("description", project.description)
            put("status", project.status.toString())
        }
    }
}
```

## Testing Best Practices

### 1. Isolate Dependencies in Tests

```kotlin
class IssueApplicationServiceTest : DescribeSpec({
    
    describe("Issue creation with isolated dependencies") {
        
        it("should validate hierarchy rules") {
            testApplication {
                // Mock only what's needed for this test
                val mockIssueRepo = MockIssueRepository()
                mockIssueRepo.setupParentIssue(epicId, IssueType.EPIC)
                
                configureDIForTest(mockIssueRepository = mockIssueRepo)
                
                val issueService = application.dependencies.get<IssueApplicationService>()
                
                // Test specific business rule
                val result = issueService.createIssue(
                    CreateIssueCommand(
                        title = "Story",
                        type = IssueType.STORY,
                        parentId = epicId
                    )
                )
                
                result.parentId shouldBe epicId
                mockIssueRepo.validateHierarchyWasCalled shouldBe true
            }
        }
    }
})
```

### 2. Use Test Fixtures with DI

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/fixtures/ProjectFixtures.kt

object ProjectFixtures {
    
    fun testApplication(
        block: suspend ApplicationTestBuilder.() -> Unit
    ) = testApplication {
        configureDIForTest()
        
        // Setup common test data
        val dbInitializer = application.dependencies.get<DatabaseInitializer>()
        dbInitializer.initialize()
        
        // Create test projects
        val projectService = application.dependencies.get<ProjectApplicationService>()
        projectService.createProject(
            CreateProjectCommand("Test Project", "For testing")
        )
        
        block()
    }
}

// Usage in tests
class ProjectTest : DescribeSpec({
    describe("Project operations") {
        it("should update project") {
            ProjectFixtures.testApplication {
                val projectService = application.dependencies.get<ProjectApplicationService>()
                // Test with pre-configured data
            }
        }
    }
})
```

### 3. Test DI Configuration

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/infrastructure/di/DIConfigurationTest.kt

class DIConfigurationTest : DescribeSpec({
    
    describe("DI Configuration") {
        
        it("should resolve all dependencies") {
            testApplication {
                configureDependencies()
                
                // Verify critical dependencies can be resolved
                shouldNotThrow<Exception> {
                    application.dependencies.get<ProjectApplicationService>()
                    application.dependencies.get<IssueApplicationService>()
                    application.dependencies.get<ProjectRepository>()
                    application.dependencies.get<IssueRepository>()
                    application.dependencies.get<TimeProvider>()
                    application.dependencies.get<UnitOfWork>()
                }
            }
        }
        
        it("should allow override in tests") {
            testApplication {
                configureDependencies()
                
                val mockTime = MockTimeProvider()
                application.dependencies.import(
                    DIModule("test") {
                        single<TimeProvider>(override = true) { mockTime }
                    }
                )
                
                val timeProvider = application.dependencies.get<TimeProvider>()
                timeProvider shouldBe mockTime
            }
        }
    }
})
```

## Configuration Management

### Environment-Based DI

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/di/EnvironmentModules.kt

fun Application.configureDependenciesForEnvironment() {
    val env = environment.config.property("ktor.environment").getString()
    
    install(DI) {
        // Base modules
        importOnce(domainModule)
        importOnce(applicationServiceModule)
        
        // Environment-specific modules
        when (env) {
            "development" -> {
                importOnce(devDatabaseModule)
                importOnce(devLoggingModule)
            }
            "production" -> {
                importOnce(prodDatabaseModule)
                importOnce(prodMonitoringModule)
            }
            "test" -> {
                importOnce(testDatabaseModule)
                importOnce(mockModule)
            }
        }
    }
}

val devDatabaseModule = DIModule("devDatabase") {
    single<Database> {
        Database.connect(
            url = "jdbc:h2:file:./data/dev;AUTO_SERVER=TRUE",
            driver = "org.h2.Driver"
        )
    }
}

val prodDatabaseModule = DIModule("prodDatabase") {
    single<Database> {
        val config = HikariConfig().apply {
            jdbcUrl = environment.config.property("database.url").getString()
            driverClassName = "org.h2.Driver"
            maximumPoolSize = 10
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        }
        Database.connect(HikariDataSource(config))
    }
}
```

### HOCON Configuration with DI

```hocon
# src/main/resources/application.conf
ktor {
    deployment {
        port = 8080
        port = ${?PORT}
    }
    
    environment = development
    environment = ${?KTOR_ENV}
}

database {
    url = "jdbc:h2:file:./data/jcvd;AUTO_SERVER=TRUE"
    url = ${?DATABASE_URL}
    
    pool {
        maxSize = 10
        minIdle = 2
        connectionTimeout = 10000
    }
}

mcp {
    server {
        enabled = true
        websocket {
            path = "/mcp"
            pingInterval = 30000
        }
    }
}
```

## Troubleshooting

### Common DI Issues

1. **Circular Dependencies**
```kotlin
// Problem: Circular dependency between services
class ServiceA(private val serviceB: ServiceB)
class ServiceB(private val serviceA: ServiceA)

// Solution: Use lazy injection or refactor to remove circular dependency
class ServiceA(private val serviceBProvider: () -> ServiceB) {
    private val serviceB by lazy { serviceBProvider() }
}
```

2. **Missing Dependencies**
```kotlin
// Problem: Dependency not registered
val service = dependencies.get<UnregisteredService>() // Throws exception

// Solution: Ensure all dependencies are registered
val module = DIModule("missing") {
    single<UnregisteredService> { UnregisteredService() }
}
```

3. **Scope Issues**
```kotlin
// Problem: Singleton when prototype needed
single<SessionManager> { SessionManager() } // Shares state across requests

// Solution: Use factory for per-request instances
factory<SessionManager> { SessionManager() } // New instance per request
```

### Testing DI Issues

1. **Mock Not Being Used**
```kotlin
// Problem: Production dependency still being used
configureDIForTest(mockTimeProvider = mockTime)
// But real time provider is still used

// Solution: Ensure override = true in test module
single<TimeProvider>(override = true) { mockTime }
```

2. **Database State Leaking Between Tests**
```kotlin
// Problem: Tests affect each other
// Solution: Use fresh in-memory database per test
beforeEach {
    Database.connect("jdbc:h2:mem:test_${UUID.randomUUID()};DB_CLOSE_DELAY=-1")
}
```

## Best Practices Summary

1. **Use Constructor Injection**: Always prefer constructor injection for better testability
2. **Avoid Service Locator Pattern**: Don't use `dependencies.get()` outside of composition root
3. **Keep Modules Small**: Create focused modules for better organization
4. **Test DI Configuration**: Ensure all dependencies can be resolved
5. **Override for Testing**: Use DI overrides for test doubles
6. **Avoid Circular Dependencies**: Refactor design to eliminate cycles
7. **Use Interfaces**: Depend on abstractions, not implementations
8. **Scope Appropriately**: Use singleton for stateless, factory for stateful
9. **Document Dependencies**: Clear documentation of what each service needs
10. **Fail Fast**: Validate DI configuration at startup

## Migration Reference (Completed in SPI-458)

### From Koin to Ktor DI

```kotlin
// OLD: Koin pattern (removed)
val appModule = module {
    single<TimeProvider> { SystemTimeProvider() }
    single<ProjectRepository> { ExposedProjectRepository() }
}

// NEW: Ktor DI pattern (current)
dependencies {
    provide<TimeProvider> { SystemTimeProvider() }
    provide<ProjectRepository> { ExposedProjectRepository() }
}
```

### Key Migration Changes
- Removed all Koin dependencies from build.gradle.kts
- Deleted KoinModules.kt
- Updated to Ktor 3.2.3 (required for ktor-server-di)
- Changed from `single { }` to `provide<T> { }`
- Property delegation: `by inject()` → `by application.dependencies`

## Common Pitfalls to Avoid

### ❌ DON'T Create Custom DI Containers
```kotlin
// WRONG - Don't create custom service locators
class DIContainer {
    fun <T> resolve(type: KClass<T>): T { ... }
}

// RIGHT - Use Ktor's native DI
dependencies {
    provide<Service> { ServiceImpl() }
}
```

### ❌ DON'T Use Service Locator Pattern
```kotlin
// WRONG - Service locator anti-pattern
class MyService {
    fun doSomething(app: Application) {
        val repo = app.dependencies.instance<Repository>() // Fetching deps
    }
}

// RIGHT - Constructor injection
class MyService(
    private val repository: Repository // Injected via constructor
) {
    fun doSomething() { ... }
}
```

## Performance Considerations

1. **Lazy Initialization**: Dependencies are created on first access
2. **Singleton Caching**: Singletons are cached after first creation
3. **Minimal Overhead**: Native Ktor DI has minimal runtime overhead
4. **Type Safety**: Compile-time type checking prevents runtime errors

## Next Steps (SPI-460)

After the TDD rebuild in SPI-460:

1. Add Application Services with constructor injection
2. Implement proper Unit of Work pattern
3. Create test doubles for all interfaces
4. Add integration tests with real H2 database
5. Document all service dependencies
