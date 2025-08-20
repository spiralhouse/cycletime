# Dependency Injection Patterns - Technical Design

## Overview

This document outlines the dependency injection (DI) patterns for JCVD, transitioning from **Koin 4.0** (current implementation) to **Ktor 3.2.0+ native DI** (planned in SPI-442). The design enables testable, maintainable code following Domain-Driven Design (DDD) principles while leveraging Kotlin's type safety.

**Current State**: Using Koin 4.0 for dependency injection
**Future Plan**: Migrate to Ktor's native DI (`ktor-server-di`) in SPI-442 for seamless integration with Ktor's testing framework and reduced external dependencies.

## Technology Stack

### Current Dependencies (Koin Implementation)

```kotlin
// build.gradle.kts - Current implementation
dependencies {
    // Ktor with CIO server engine
    implementation("io.ktor:ktor-server-core:3.2.0")
    implementation("io.ktor:ktor-server-cio:3.2.0")
    implementation("io.ktor:ktor-server-content-negotiation:3.2.0")
    
    // Current DI framework
    implementation("io.insert-koin:koin-ktor:4.0.0")
    implementation("io.insert-koin:koin-core:4.0.0")
    
    // Database - Current SQLite implementation
    implementation("org.xerial:sqlite-jdbc:3.46.1.3")
    implementation("com.zaxxer:HikariCP:6.2.1")
    implementation("org.jetbrains.exposed:exposed-core:0.58.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.58.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.58.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.58.0")
}
```

### Future Dependencies (Ktor Native DI - SPI-442)

```kotlin
// build.gradle.kts - Future implementation
dependencies {
    // Ktor with Netty server engine
    implementation("io.ktor:ktor-server-core:3.2.0")
    implementation("io.ktor:ktor-server-netty:3.2.0")  // Migration target
    implementation("io.ktor:ktor-server-di:3.2.0")     // DI replacement
    
    // Database - Future H2 implementation (SPI-439)
    implementation("com.h2database:h2:2.2.224")
    implementation("com.zaxxer:HikariCP:6.2.1")
    implementation("org.jetbrains.exposed:exposed-core:0.58.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.58.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.58.0")
    implementation("org.jetbrains.exposed:exposed-java-time:0.58.0")
}
```

## Current Architecture (Koin 4.0)

### Current Koin Configuration

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/di/KoinModules.kt

import org.koin.dsl.module
import com.spiralhouse.jcvd.domain.services.TimeProvider
import com.spiralhouse.jcvd.infrastructure.services.RealTimeProvider

val appModule = module {
    // Time provider
    single<TimeProvider> { RealTimeProvider() }
    
    // TODO: Add repositories and services when implemented
    // single<ProjectRepository> { H2ProjectRepository(get()) }
    // single<ProjectApplicationService> { ProjectApplicationService(get(), get()) }
}
```

### Current Application Setup

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/Application.kt

import org.koin.ktor.plugin.Koin
import com.spiralhouse.jcvd.infrastructure.di.appModule

fun Application.module() {
    // Install Koin
    install(Koin) {
        modules(appModule)
    }
    
    // Other configuration...
}
```

## Future Architecture (Ktor Native DI - SPI-442)

### Future Ktor DI Configuration

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/di/DIConfiguration.kt

import io.ktor.server.application.*
import io.ktor.server.di.*
import com.spiralhouse.jcvd.domain.repositories.*
import com.spiralhouse.jcvd.domain.services.*
import com.spiralhouse.jcvd.application.services.*
import com.spiralhouse.jcvd.infrastructure.persistence.*
import com.spiralhouse.jcvd.infrastructure.database.*
import org.jetbrains.exposed.sql.Database

/**
 * Configure dependency injection using Ktor 3.2.0+ native DI
 */
fun Application.configureDependencies() {
    install(DI) {
        // Import modular DI configurations
        importOnce(databaseModule)
        importOnce(domainModule)
        importOnce(repositoryModule)
        importOnce(applicationServiceModule)
        importOnce(mcpModule)
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
        JCVDMCPServer(
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
import com.spiralhouse.jcvd.infrastructure.di.configureDependencies
import com.spiralhouse.jcvd.infrastructure.routing.configureRouting
import com.spiralhouse.jcvd.infrastructure.mcp.configureMCP

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

## Testing with DI Overrides

### Test Configuration with Mock Dependencies

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/testing/TestDI.kt

import io.ktor.server.testing.*
import io.ktor.server.di.*
import com.spiralhouse.jcvd.domain.repositories.*
import com.spiralhouse.jcvd.domain.services.*
import com.spiralhouse.jcvd.testing.mocks.*

/**
 * Test DI module with mock implementations
 */
fun testDIModule(
    mockTimeProvider: TimeProvider? = null,
    mockProjectRepository: ProjectRepository? = null,
    mockIssueRepository: IssueRepository? = null
) = DIModule("test") {
    // Override time provider for deterministic tests
    single<TimeProvider>(override = true) {
        mockTimeProvider ?: MockTimeProvider()
    }
    
    // Override repositories with mocks
    mockProjectRepository?.let {
        single<ProjectRepository>(override = true) { it }
    }
    
    mockIssueRepository?.let {
        single<IssueRepository>(override = true) { it }
    }
    
    // Use in-memory H2 for integration tests
    single<Database>(override = true) {
        Database.connect("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1", driver = "org.h2.Driver")
    }
}

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
import com.spiralhouse.jcvd.testing.mocks.*
import com.spiralhouse.jcvd.testing.configureDIForTest
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
import com.spiralhouse.jcvd.testing.configureDIForTest
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
    
    override val name = "jcvd_create_project"
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

## Migration Path from Other DI Frameworks

### From Koin to Ktor DI

```kotlin
// Koin pattern
val appModule = module {
    single { ProjectRepository(get()) }
}

// Equivalent in Ktor DI
val appModule = DIModule("app") {
    single<ProjectRepository> { H2ProjectRepository(get()) }
}
```

### From Kodein to Ktor DI

```kotlin
// Kodein pattern
val kodein = DI {
    bind<ProjectRepository>() with singleton { H2ProjectRepository() }
}

// Equivalent in Ktor DI
install(DI) {
    single<ProjectRepository> { H2ProjectRepository() }
}
```

## Performance Considerations

1. **Lazy Initialization**: Dependencies are created on first access
2. **Singleton Caching**: Singletons are cached after first creation
3. **Minimal Overhead**: Native Ktor DI has minimal runtime overhead
4. **Type Safety**: Compile-time type checking prevents runtime errors

## Next Steps

After implementing this DI pattern:

1. Update all services to use constructor injection
2. Create test modules for each domain area
3. Implement integration tests with DI overrides
4. Document service dependencies in code
5. Set up environment-specific configurations