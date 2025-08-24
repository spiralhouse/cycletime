# Application Service Patterns - Technical Design

## Overview

This document outlines the Application Service layer implementation patterns for CycleTime CE, integrating Domain-Driven Design (DDD) principles with dependency injection (currently Koin 4.0, migrating to Ktor native DI in SPI-442). The Application Services orchestrate use cases, coordinate between domain and infrastructure layers, and maintain transaction boundaries while leveraging Kotlin coroutines for async operations.

## Core Principles

### 1. Domain-Driven Design Alignment

- **Use Case Orchestration**: Each method represents a complete use case
- **Transaction Boundaries**: Services define transaction scope via Unit of Work
- **Domain Logic Delegation**: Business rules stay in domain entities
- **Cross-Aggregate Coordination**: Services coordinate multiple aggregates

### 2. Dependency Injection Integration

- **Constructor Injection**: All dependencies injected via constructor
- **Interface Dependencies**: Depend on repository interfaces, not implementations
- **Testability First**: Design for easy mocking and testing
- **No Service Locator**: Avoid runtime dependency resolution

### 3. Coroutine-Based Async Operations

- **Suspend Functions**: All operations are suspend functions
- **Structured Concurrency**: Proper coroutine scope management
- **Error Propagation**: Clean exception handling with coroutines
- **Non-Blocking I/O**: Leverage Kotlin's async capabilities

## Application Service Architecture

### Base Application Service Pattern

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/ApplicationService.kt

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Base class for application services with common patterns
 */
abstract class ApplicationService {
    
    /**
     * Execute operation in IO context for database operations
     */
    protected suspend fun <T> executeInIOContext(
        block: suspend CoroutineScope.() -> T
    ): T = withContext(Dispatchers.IO) {
        block()
    }
    
    /**
     * Validate command before execution
     */
    protected fun validateCommand(command: Any) {
        // Common validation logic
        when (command) {
            is Validatable -> command.validate()
        }
    }
    
    /**
     * Log operation for audit trail
     */
    protected suspend fun logOperation(
        operation: String,
        entityId: String?,
        userId: String? = null
    ) {
        // Audit logging implementation
    }
}

/**
 * Marker interface for validatable commands
 */
interface Validatable {
    fun validate()
}
```

### Command and Query Objects

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/commands/ProjectCommands.kt

import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import kotlinx.serialization.Serializable

/**
 * Command for creating a new project
 */
@Serializable
data class CreateProjectCommand(
    val name: String,
    val description: String,
    val ownerId: String? = null
) : Validatable {
    override fun validate() {
        require(name.isNotBlank()) { "Project name cannot be blank" }
        require(name.length <= 255) { "Project name too long" }
        require(description.length <= 2000) { "Description too long" }
    }
}

/**
 * Command for updating project details
 */
@Serializable
data class UpdateProjectCommand(
    val projectId: ProjectId,
    val name: String? = null,
    val description: String? = null,
    val status: String? = null
) : Validatable {
    override fun validate() {
        name?.let {
            require(it.isNotBlank()) { "Project name cannot be blank" }
            require(it.length <= 255) { "Project name too long" }
        }
        description?.let {
            require(it.length <= 2000) { "Description too long" }
        }
    }
}

/**
 * Query for project search
 */
@Serializable
data class ProjectSearchQuery(
    val nameContains: String? = null,
    val status: String? = null,
    val limit: Int = 20,
    val offset: Int = 0
) : Validatable {
    override fun validate() {
        require(limit in 1..100) { "Limit must be between 1 and 100" }
        require(offset >= 0) { "Offset cannot be negative" }
    }
}
```

## Core Application Services

### ProjectApplicationService

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/ProjectApplicationService.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.services.ProjectDomainService
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.services.UnitOfWork
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.ProjectStatus
import io.spiralhouse.jcvd.domain.exceptions.NotFoundException
import io.spiralhouse.jcvd.domain.exceptions.DomainException
import io.spiralhouse.jcvd.application.commands.*
import io.spiralhouse.jcvd.application.queries.*
import io.spiralhouse.jcvd.application.dto.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Application service for project management use cases
 */
class ProjectApplicationService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val unitOfWork: UnitOfWork,
    private val domainService: ProjectDomainService,
    private val timeProvider: TimeProvider
) : ApplicationService() {
    
    /**
     * Create a new project
     */
    suspend fun createProject(command: CreateProjectCommand): ProjectDto {
        validateCommand(command)
        
        return executeInIOContext {
            unitOfWork.execute {
                // Use domain factory method
                val project = Project.create(
                    name = command.name,
                    description = command.description,
                    timeProvider = timeProvider
                )
                
                // Apply domain service logic if needed
                domainService.validateProjectUniqueness(project)
                
                // Persist via repository
                projectRepository.save(project)
                
                // Log for audit
                logOperation("CREATE_PROJECT", project.id.value, command.ownerId)
                
                // Return DTO
                project.toDto()
            }
        }
    }
    
    /**
     * Update existing project
     */
    suspend fun updateProject(command: UpdateProjectCommand): ProjectDto {
        validateCommand(command)
        
        return executeInIOContext {
            unitOfWork.execute {
                // Load aggregate
                val project = projectRepository.findById(command.projectId)
                    ?: throw NotFoundException("Project ${command.projectId.value} not found")
                
                // Apply updates through domain methods
                command.name?.let { project.updateName(it) }
                command.description?.let { project.updateDescription(it) }
                command.status?.let { 
                    val status = ProjectStatus.fromString(it)
                    project.updateStatus(status)
                }
                
                // Persist changes
                projectRepository.save(project)
                
                // Log for audit
                logOperation("UPDATE_PROJECT", project.id.value)
                
                project.toDto()
            }
        }
    }
    
    /**
     * Archive a project and all its issues
     */
    suspend fun archiveProject(projectId: ProjectId): ProjectDto {
        return executeInIOContext {
            unitOfWork.execute {
                val project = projectRepository.findById(projectId)
                    ?: throw NotFoundException("Project ${projectId.value} not found")
                
                // Load all project issues
                val issues = issueRepository.findByProjectId(projectId)
                
                // Domain logic: can only archive if all issues are done
                if (issues.any { !it.isCompleted }) {
                    throw DomainException("Cannot archive project with incomplete issues")
                }
                
                // Update status through domain method
                project.archive()
                
                // Persist
                projectRepository.save(project)
                
                logOperation("ARCHIVE_PROJECT", projectId.value)
                
                project.toDto()
            }
        }
    }
    
    /**
     * Get project by ID with related data
     */
    suspend fun getProject(projectId: ProjectId): ProjectDetailsDto? {
        return executeInIOContext {
            val project = projectRepository.findById(projectId) ?: return@executeInIOContext null
            
            // Load related data
            val issues = issueRepository.findByProjectId(projectId)
            val unblockedIssues = domainService.getUnblockedIssues(project, issues)
            
            ProjectDetailsDto(
                project = project.toDto(),
                totalIssues = issues.size,
                completedIssues = issues.count { it.isCompleted },
                unblockedIssues = unblockedIssues.map { it.toDto() }
            )
        }
    }
    
    /**
     * Search projects with pagination
     */
    suspend fun searchProjects(query: ProjectSearchQuery): Flow<ProjectDto> = flow {
        validateCommand(query)
        
        val projects = projectRepository.search(
            nameContains = query.nameContains,
            status = query.status?.let { ProjectStatus.fromString(it) },
            limit = query.limit,
            offset = query.offset
        )
        
        projects.forEach { project ->
            emit(project.toDto())
        }
    }
    
    /**
     * Get project statistics
     */
    suspend fun getProjectStatistics(projectId: ProjectId): ProjectStatisticsDto {
        return executeInIOContext {
            val project = projectRepository.findById(projectId)
                ?: throw NotFoundException("Project ${projectId.value} not found")
            
            val issues = issueRepository.findByProjectId(projectId)
            
            ProjectStatisticsDto(
                projectId = projectId.value,
                totalIssues = issues.size,
                issuesByType = issues.groupBy { it.type }.mapValues { it.value.size },
                issuesByStatus = issues.groupBy { it.status }.mapValues { it.value.size },
                completionRate = if (issues.isNotEmpty()) {
                    issues.count { it.isCompleted }.toDouble() / issues.size
                } else 0.0,
                lastUpdated = project.updatedAt
            )
        }
    }
}

/**
 * Extension function to convert domain entity to DTO
 */
private fun Project.toDto(): ProjectDto = ProjectDto(
    id = this.id.value,
    name = this.name,
    description = this.description,
    status = this.status.toString(),
    createdAt = this.createdAt,
    updatedAt = this.updatedAt
)
```

### IssueApplicationService

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/IssueApplicationService.kt

import io.spiralhouse.jcvd.domain.entities.Issue
import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.services.IssueDomainService
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.services.UnitOfWork
import io.spiralhouse.jcvd.domain.valueobjects.*
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Application service for issue management use cases
 */
class IssueApplicationService(
    private val issueRepository: IssueRepository,
    private val projectRepository: ProjectRepository,
    private val unitOfWork: UnitOfWork,
    private val domainService: IssueDomainService,
    private val timeProvider: TimeProvider
) : ApplicationService() {
    
    /**
     * Create issue with hierarchy validation
     */
    suspend fun createIssue(command: CreateIssueCommand): IssueDto {
        validateCommand(command)
        
        return executeInIOContext {
            unitOfWork.execute {
                // Validate project exists
                val project = projectRepository.findById(command.projectId)
                    ?: throw NotFoundException("Project not found")
                
                // Validate parent if specified
                val parent = command.parentId?.let { parentId ->
                    issueRepository.findById(parentId)
                        ?: throw NotFoundException("Parent issue not found")
                }
                
                // Create issue with domain validation
                val issue = Issue.create(
                    title = command.title,
                    description = command.description,
                    type = command.type,
                    projectId = command.projectId,
                    parentId = command.parentId,
                    timeProvider = timeProvider
                )
                
                // Validate hierarchy through domain service
                if (parent != null) {
                    domainService.validateHierarchy(issue, parent)
                }
                
                // Add to project
                project.addIssue(issue.id)
                
                // Persist both
                issueRepository.save(issue)
                projectRepository.save(project)
                
                logOperation("CREATE_ISSUE", issue.id.value)
                
                issue.toDto()
            }
        }
    }
    
    /**
     * Update issue status with workflow validation
     */
    suspend fun updateIssueStatus(
        issueId: IssueId,
        newStatus: IssueStatus
    ): IssueDto {
        return executeInIOContext {
            unitOfWork.execute {
                val issue = issueRepository.findById(issueId)
                    ?: throw NotFoundException("Issue not found")
                
                // Validate status transition through domain
                issue.updateStatus(newStatus)
                
                // Check if this affects parent/child issues
                if (issue.hasChildren) {
                    val children = issueRepository.findByParentId(issueId)
                    domainService.validateParentStatusChange(issue, children, newStatus)
                }
                
                // Persist
                issueRepository.save(issue)
                
                logOperation("UPDATE_ISSUE_STATUS", issueId.value)
                
                issue.toDto()
            }
        }
    }
    
    /**
     * Add dependency between issues
     */
    suspend fun addDependency(
        dependentId: IssueId,
        dependencyId: IssueId
    ): DependencyDto {
        return executeInIOContext {
            unitOfWork.execute {
                // Load both issues
                val (dependent, dependency) = coroutineScope {
                    val dependentDeferred = async { 
                        issueRepository.findById(dependentId) 
                    }
                    val dependencyDeferred = async { 
                        issueRepository.findById(dependencyId) 
                    }
                    
                    Pair(
                        dependentDeferred.await() ?: throw NotFoundException("Dependent issue not found"),
                        dependencyDeferred.await() ?: throw NotFoundException("Dependency issue not found")
                    )
                }
                
                // Validate no cycle through domain service
                domainService.validateNoCycle(dependent, dependency)
                
                // Add dependency through domain method
                dependent.addDependency(dependencyId)
                
                // Persist
                issueRepository.save(dependent)
                
                logOperation("ADD_DEPENDENCY", "${dependentId.value}->${dependencyId.value}")
                
                DependencyDto(
                    dependentId = dependentId.value,
                    dependencyId = dependencyId.value,
                    createdAt = timeProvider.now()
                )
            }
        }
    }
    
    /**
     * Get issue with full context
     */
    suspend fun getIssueWithContext(issueId: IssueId): IssueContextDto? {
        return executeInIOContext {
            val issue = issueRepository.findById(issueId) ?: return@executeInIOContext null
            
            // Load related data in parallel
            coroutineScope {
                val parentDeferred = async {
                    issue.parentId?.let { issueRepository.findById(it) }
                }
                val childrenDeferred = async {
                    issueRepository.findByParentId(issueId)
                }
                val dependenciesDeferred = async {
                    issue.dependencies.map { depId ->
                        async { issueRepository.findById(depId) }
                    }.map { it.await() }.filterNotNull()
                }
                val dependentsDeferred = async {
                    issueRepository.findDependents(issueId)
                }
                
                IssueContextDto(
                    issue = issue.toDto(),
                    parent = parentDeferred.await()?.toDto(),
                    children = childrenDeferred.await().map { it.toDto() },
                    dependencies = dependenciesDeferred.await().map { it.toDto() },
                    dependents = dependentsDeferred.await().map { it.toDto() }
                )
            }
        }
    }
    
    /**
     * Bulk update issues
     */
    suspend fun bulkUpdateIssues(commands: List<UpdateIssueCommand>): List<IssueDto> {
        return executeInIOContext {
            unitOfWork.execute {
                commands.map { command ->
                    validateCommand(command)
                    
                    val issue = issueRepository.findById(command.issueId)
                        ?: throw NotFoundException("Issue ${command.issueId.value} not found")
                    
                    // Apply updates
                    command.title?.let { issue.updateTitle(it) }
                    command.description?.let { issue.updateDescription(it) }
                    command.status?.let { issue.updateStatus(it) }
                    command.estimate?.let { issue.updateEstimate(it) }
                    
                    issueRepository.save(issue)
                    issue.toDto()
                }
            }
        }
    }
}

private fun Issue.toDto(): IssueDto = IssueDto(
    id = this.id.value,
    title = this.title,
    description = this.description,
    type = this.type.toString(),
    status = this.status.toString(),
    parentId = this.parentId?.value,
    estimate = this.estimate,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt
)
```

### WorkflowApplicationService

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/WorkflowApplicationService.kt

import io.spiralhouse.jcvd.domain.entities.Workflow
import io.spiralhouse.jcvd.domain.repositories.WorkflowRepository
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.services.UnitOfWork
import io.spiralhouse.jcvd.domain.valueobjects.*

/**
 * Application service for workflow management
 */
class WorkflowApplicationService(
    private val workflowRepository: WorkflowRepository,
    private val projectRepository: ProjectRepository,
    private val unitOfWork: UnitOfWork,
    private val timeProvider: TimeProvider
) : ApplicationService() {
    
    /**
     * Create workflow for project
     */
    suspend fun createWorkflow(command: CreateWorkflowCommand): WorkflowDto {
        validateCommand(command)
        
        return executeInIOContext {
            unitOfWork.execute {
                // Validate project exists
                val project = projectRepository.findById(command.projectId)
                    ?: throw NotFoundException("Project not found")
                
                // Create workflow
                val workflow = Workflow.create(
                    name = command.name,
                    projectId = command.projectId,
                    stages = command.stages,
                    transitions = command.transitions,
                    timeProvider = timeProvider
                )
                
                // Persist
                workflowRepository.save(workflow)
                
                logOperation("CREATE_WORKFLOW", workflow.id.value)
                
                workflow.toDto()
            }
        }
    }
    
    /**
     * Advance workflow to next stage
     */
    suspend fun advanceWorkflow(
        workflowId: WorkflowId,
        targetStage: String
    ): WorkflowDto {
        return executeInIOContext {
            unitOfWork.execute {
                val workflow = workflowRepository.findById(workflowId)
                    ?: throw NotFoundException("Workflow not found")
                
                // Validate transition through domain
                workflow.transitionTo(targetStage)
                
                // Check if workflow is complete
                if (workflow.isComplete) {
                    logOperation("COMPLETE_WORKFLOW", workflowId.value)
                }
                
                // Persist
                workflowRepository.save(workflow)
                
                logOperation("ADVANCE_WORKFLOW", workflowId.value)
                
                workflow.toDto()
            }
        }
    }
    
    /**
     * Get available transitions for current stage
     */
    suspend fun getAvailableTransitions(workflowId: WorkflowId): List<String> {
        return executeInIOContext {
            val workflow = workflowRepository.findById(workflowId)
                ?: throw NotFoundException("Workflow not found")
            
            workflow.getAvailableTransitions()
        }
    }
}

private fun Workflow.toDto(): WorkflowDto = WorkflowDto(
    id = this.id.value,
    name = this.name,
    projectId = this.projectId.value,
    currentStage = this.currentStage,
    stages = this.stages,
    isComplete = this.isComplete,
    createdAt = this.createdAt,
    updatedAt = this.updatedAt
)
```

### SessionApplicationService

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/SessionApplicationService.kt

import io.spiralhouse.jcvd.domain.entities.Session
import io.spiralhouse.jcvd.domain.repositories.SessionRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.services.UnitOfWork
import io.spiralhouse.jcvd.domain.valueobjects.SessionKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.time.Duration

/**
 * Application service for session management
 */
class SessionApplicationService(
    private val sessionRepository: SessionRepository,
    private val unitOfWork: UnitOfWork,
    private val timeProvider: TimeProvider,
    private val maxSessionAge: Duration = Duration.ofDays(7)
) : ApplicationService() {
    
    /**
     * Create or retrieve session
     */
    suspend fun getOrCreateSession(sessionKey: String): SessionDto {
        return executeInIOContext {
            unitOfWork.execute {
                val key = SessionKey(sessionKey)
                
                // Try to find existing session
                val existingSession = sessionRepository.findByKey(key)
                
                if (existingSession != null && !existingSession.isExpired(maxSessionAge)) {
                    // Update activity time
                    existingSession.touch()
                    sessionRepository.save(existingSession)
                    existingSession.toDto()
                } else {
                    // Create new session
                    val newSession = Session.create(
                        sessionKey = key,
                        timeProvider = timeProvider
                    )
                    sessionRepository.save(newSession)
                    
                    logOperation("CREATE_SESSION", sessionKey)
                    
                    newSession.toDto()
                }
            }
        }
    }
    
    /**
     * Update session context
     */
    suspend fun updateSessionContext(
        sessionKey: String,
        updates: Map<String, Any?>
    ): SessionDto {
        return executeInIOContext {
            unitOfWork.execute {
                val key = SessionKey(sessionKey)
                val session = sessionRepository.findByKey(key)
                    ?: throw NotFoundException("Session not found")
                
                // Update context
                session.updateContext(updates)
                
                // Persist
                sessionRepository.save(session)
                
                session.toDto()
            }
        }
    }
    
    /**
     * Clean up expired sessions
     */
    suspend fun cleanupExpiredSessions(): Int {
        return executeInIOContext {
            unitOfWork.execute {
                val expiredSessions = sessionRepository.findExpiredSessions(maxSessionAge)
                
                expiredSessions.forEach { session ->
                    sessionRepository.delete(session.sessionKey)
                }
                
                logOperation("CLEANUP_SESSIONS", null)
                
                expiredSessions.size
            }
        }
    }
    
    /**
     * Get active sessions stream
     */
    fun getActiveSessions(): Flow<SessionDto> = flow {
        val sessions = sessionRepository.findActiveSessions(maxSessionAge)
        sessions.forEach { session ->
            emit(session.toDto())
        }
    }
}

private fun Session.toDto(): SessionDto = SessionDto(
    sessionKey = this.sessionKey.value,
    projectId = this.projectId,
    currentContext = this.currentContext,
    lastActivity = this.lastActivity,
    createdAt = this.createdAt,
    isExpired = this.isExpired(Duration.ofDays(7))
)
```

## DTOs and Response Objects

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/dto/ProjectDtos.kt

import kotlinx.serialization.Serializable
import java.time.Instant

@Serializable
data class ProjectDto(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class ProjectDetailsDto(
    val project: ProjectDto,
    val totalIssues: Int,
    val completedIssues: Int,
    val unblockedIssues: List<IssueDto>
)

@Serializable
data class ProjectStatisticsDto(
    val projectId: String,
    val totalIssues: Int,
    val issuesByType: Map<String, Int>,
    val issuesByStatus: Map<String, Int>,
    val completionRate: Double,
    val lastUpdated: Instant
)

@Serializable
data class IssueDto(
    val id: String,
    val title: String,
    val description: String,
    val type: String,
    val status: String,
    val parentId: String? = null,
    val estimate: Int? = null,
    val createdAt: Instant,
    val updatedAt: Instant
)

@Serializable
data class IssueContextDto(
    val issue: IssueDto,
    val parent: IssueDto? = null,
    val children: List<IssueDto> = emptyList(),
    val dependencies: List<IssueDto> = emptyList(),
    val dependents: List<IssueDto> = emptyList()
)
```

## Error Handling Patterns

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/exceptions/ApplicationExceptions.kt

/**
 * Base exception for application layer
 */
sealed class ApplicationException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause)

/**
 * Entity not found
 */
class NotFoundException(
    message: String
) : ApplicationException(message)

/**
 * Validation failed
 */
class ValidationException(
    message: String,
    val errors: List<ValidationError> = emptyList()
) : ApplicationException(message)

/**
 * Business rule violation
 */
class BusinessRuleException(
    message: String
) : ApplicationException(message)

/**
 * Concurrent modification detected
 */
class ConcurrentModificationException(
    message: String
) : ApplicationException(message)

data class ValidationError(
    val field: String,
    val message: String
)
```

### Error Handling in Services

```kotlin
class ProjectApplicationService(
    // ... dependencies
) : ApplicationService() {
    
    suspend fun safeCreateProject(command: CreateProjectCommand): Result<ProjectDto> {
        return runCatching {
            createProject(command)
        }.recover { exception ->
            when (exception) {
                is ValidationException -> {
                    // Log validation errors
                    logger.warn("Validation failed: ${exception.errors}")
                    throw exception
                }
                is DomainException -> {
                    // Convert domain exception to application exception
                    throw BusinessRuleException(exception.message ?: "Business rule violation")
                }
                is RepositoryException -> {
                    // Log and wrap infrastructure exceptions
                    logger.error("Repository error", exception)
                    throw ApplicationException("Failed to create project", exception)
                }
                else -> throw exception
            }
        }
    }
}
```

## Testing Application Services

### Unit Testing with Mocks

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/application/services/ProjectApplicationServiceTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.assertions.throwables.shouldThrow
import io.mockk.*
import kotlinx.coroutines.runBlocking

class ProjectApplicationServiceTest : DescribeSpec({
    
    describe("ProjectApplicationService") {
        val mockProjectRepo = mockk<ProjectRepository>()
        val mockIssueRepo = mockk<IssueRepository>()
        val mockUnitOfWork = mockk<UnitOfWork>()
        val mockDomainService = mockk<ProjectDomainService>()
        val mockTimeProvider = mockk<TimeProvider>()
        
        val service = ProjectApplicationService(
            mockProjectRepo,
            mockIssueRepo,
            mockUnitOfWork,
            mockDomainService,
            mockTimeProvider
        )
        
        beforeEach {
            clearMocks(mockProjectRepo, mockIssueRepo, mockUnitOfWork)
        }
        
        describe("createProject") {
            it("should create project with valid command") {
                val command = CreateProjectCommand("Test", "Description")
                val projectId = ProjectId.generate()
                
                // Setup mocks
                coEvery { 
                    mockUnitOfWork.execute<ProjectDto>(any()) 
                } answers {
                    val block = firstArg<suspend () -> ProjectDto>()
                    runBlocking { block() }
                }
                
                coEvery { mockDomainService.validateProjectUniqueness(any()) } just Runs
                coEvery { mockProjectRepo.save(any()) } just Runs
                
                every { mockTimeProvider.now() } returns Instant.now()
                
                // Execute
                val result = runBlocking {
                    service.createProject(command)
                }
                
                // Verify
                result.name shouldBe "Test"
                result.description shouldBe "Description"
                
                coVerify { mockProjectRepo.save(any()) }
                coVerify { mockDomainService.validateProjectUniqueness(any()) }
            }
            
            it("should throw ValidationException for invalid command") {
                val command = CreateProjectCommand("", "Description")
                
                shouldThrow<ValidationException> {
                    runBlocking {
                        service.createProject(command)
                    }
                }
            }
        }
        
        describe("archiveProject") {
            it("should not archive project with incomplete issues") {
                val projectId = ProjectId.generate()
                val project = mockk<Project>()
                val incompletIssue = mockk<Issue>()
                
                coEvery { mockProjectRepo.findById(projectId) } returns project
                coEvery { mockIssueRepo.findByProjectId(projectId) } returns listOf(incompletIssue)
                every { incompletIssue.isCompleted } returns false
                
                coEvery { 
                    mockUnitOfWork.execute<ProjectDto>(any()) 
                } answers {
                    val block = firstArg<suspend () -> ProjectDto>()
                    runBlocking { block() }
                }
                
                shouldThrow<DomainException> {
                    runBlocking {
                        service.archiveProject(projectId)
                    }
                }
            }
        }
    }
})
```

### Integration Testing

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/application/services/ProjectApplicationServiceIntegrationTest.kt

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction

class ProjectApplicationServiceIntegrationTest : DescribeSpec({
    
    describe("ProjectApplicationService Integration") {
        lateinit var database: Database
        lateinit var service: ProjectApplicationService
        
        beforeEach {
            // Setup in-memory H2
            database = Database.connect(
                "jdbc:h2:mem:test;DB_CLOSE_DELAY=-1",
                driver = "org.h2.Driver"
            )
            
            transaction {
                SchemaUtils.create(Projects, Issues, ProjectIssues)
            }
            
            // Create real instances
            val timeProvider = RealTimeProvider()
            val projectRepo = H2ProjectRepository(database, timeProvider)
            val issueRepo = H2IssueRepository(database, timeProvider)
            val unitOfWork = H2UnitOfWork(database)
            val domainService = ProjectDomainService(timeProvider)
            
            service = ProjectApplicationService(
                projectRepo,
                issueRepo,
                unitOfWork,
                domainService,
                timeProvider
            )
        }
        
        afterEach {
            transaction {
                SchemaUtils.drop(Projects, Issues, ProjectIssues)
            }
        }
        
        it("should create and retrieve project") {
            val command = CreateProjectCommand("Integration Test", "Testing")
            
            val created = runBlocking {
                service.createProject(command)
            }
            
            created shouldNotBe null
            created.name shouldBe "Integration Test"
            
            val retrieved = runBlocking {
                service.getProject(ProjectId(created.id))
            }
            
            retrieved shouldNotBe null
            retrieved?.project?.id shouldBe created.id
        }
    }
})
```

## Performance Optimization

### Caching Strategy

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/application/services/CachedProjectApplicationService.kt

import com.github.benmanes.caffeine.cache.Caffeine
import com.github.benmanes.caffeine.cache.LoadingCache
import java.time.Duration

/**
 * Decorator for ProjectApplicationService with caching
 */
class CachedProjectApplicationService(
    private val delegate: ProjectApplicationService
) : ApplicationService() {
    
    private val projectCache: LoadingCache<ProjectId, ProjectDetailsDto?> = 
        Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(Duration.ofMinutes(5))
            .build { projectId ->
                runBlocking {
                    delegate.getProject(projectId)
                }
            }
    
    suspend fun getProject(projectId: ProjectId): ProjectDetailsDto? {
        return projectCache.get(projectId)
    }
    
    suspend fun createProject(command: CreateProjectCommand): ProjectDto {
        val result = delegate.createProject(command)
        // Invalidate cache for new project
        projectCache.invalidate(ProjectId(result.id))
        return result
    }
    
    suspend fun updateProject(command: UpdateProjectCommand): ProjectDto {
        val result = delegate.updateProject(command)
        // Invalidate cache for updated project
        projectCache.invalidate(command.projectId)
        return result
    }
}
```

## Best Practices

1. **Keep Services Focused**: One service per aggregate root
2. **Use Commands and Queries**: Explicit input objects for clarity
3. **Return DTOs**: Never expose domain entities directly
4. **Transaction Per Use Case**: Each method is a transaction boundary
5. **Validate Early**: Validate commands before processing
6. **Log Operations**: Audit trail for all modifications
7. **Handle Errors Gracefully**: Convert exceptions appropriately
8. **Test Thoroughly**: Both unit and integration tests
9. **Use Coroutines Properly**: Structured concurrency and proper contexts
10. **Cache Judiciously**: Cache read operations, invalidate on writes

## Next Steps

After implementing application services:

1. Create REST API controllers that use these services
2. Implement GraphQL resolvers if needed
3. Add metrics and monitoring
4. Implement event sourcing if required
5. Add saga/process managers for complex workflows
