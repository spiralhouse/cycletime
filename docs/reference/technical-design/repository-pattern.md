# Repository Pattern Implementation - Technical Design

## Overview

This document outlines the technical design for implementing H2 repository implementations for domain entities (Project, Issue, Workflow), following Domain-Driven Design (DDD) principles with Test-Driven Development (TDD) methodology. The implementation provides a clean abstraction between domain and infrastructure layers while maintaining simplicity and testability, leveraging Kotlin's type safety and Exposed ORM for optimal H2 integration.

## Design Principles

### 1. Follow Established Patterns

- Mirror the structure and patterns from `H2SessionRepository`
- Use Exposed DSL for type-safe queries and optimal H2 performance
- Implement proper error handling with domain-specific exceptions
- Leverage H2's connection pooling and transaction management

### 2. Test-Driven Development Approach

**Critical TDD Workflow:**
1. **Red**: Write failing tests that specify repository behavior
2. **Green**: Implement minimal code to make tests pass
3. **Refactor**: Improve implementation while keeping tests green

**Test Strategy:**
- Write **unit tests** first with mocked database to drive implementation
- Mock H2 Database and Exposed DSL objects for testing
- Test repository logic, mapping, and error handling in isolation
- Integration tests come **after** implementation to verify actual H2 database operations
- Test repository interfaces, not implementations (DDD principle)

### 3. Domain-Driven Design Principles

**Repository as Domain Contract:**
- Repository interfaces belong to the domain layer
- Implementations are infrastructure concerns
- Domain layer defines what it needs, infrastructure provides it
- No database leakage into domain entities

**Aggregate Boundaries:**
- Each repository manages one aggregate root
- No cross-aggregate transactions within repositories
- Use Application Services for multi-aggregate operations

### 4. Maintain Simplicity

- Exposed DSL for type-safe, efficient queries
- Simple mapping between domain and database using Kotlin data classes
- H2-optimized queries with proper indexing
- Reuse existing Kotlin infrastructure components

## Database Schema Design

### Exposed DSL Table Definitions

```kotlin
// src/main/kotlin/io/spiralhouse/cycletime/infrastructure/database/Tables.kt

import org.jetbrains.exposed.dao.id.IdTable
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

// Projects table
object Projects : IdTable<String>("projects") {
    override val id = varchar("id", 36).entityId()
    val name = varchar("name", 255)
    val description = text("description").nullable()
    val status = varchar("status", 50)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
    
    override val primaryKey = PrimaryKey(id)
}

// Issues table with hierarchy support
object Issues : IdTable<String>("issues") {
    override val id = varchar("id", 36).entityId()
    val title = varchar("title", 255)
    val description = text("description").nullable()
    val type = enumeration("type", IssueType::class)
    val status = enumeration("status", IssueStatus::class)
    val parentId = varchar("parent_id", 36).nullable().references(id)
    val estimate = integer("estimate").nullable()
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
    
    override val primaryKey = PrimaryKey(id)
}

// Project-Issue relationship table
object ProjectIssues : Table("project_issues") {
    val projectId = varchar("project_id", 36).references(Projects.id)
    val issueId = varchar("issue_id", 36).references(Issues.id)
    val addedAt = datetime("added_at").default(LocalDateTime.now())
    
    override val primaryKey = PrimaryKey(projectId, issueId)
}

// Workflows table
object Workflows : IdTable<String>("workflows") {
    override val id = varchar("id", 36).entityId()
    val name = varchar("name", 255)
    val projectId = varchar("project_id", 36).references(Projects.id)
    val currentStage = varchar("current_stage", 100)
    val stages = text("stages") // JSON array
    val transitions = text("transitions") // JSON array
    val isComplete = bool("is_complete").default(false)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())
    
    override val primaryKey = PrimaryKey(id)
}

// Issue dependencies table
object IssueDependencies : Table("issue_dependencies") {
    val dependentId = varchar("dependent_id", 36).references(Issues.id)
    val dependencyId = varchar("dependency_id", 36).references(Issues.id)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    
    override val primaryKey = PrimaryKey(dependentId, dependencyId)
}

// Indexes are automatically created by Exposed for foreign keys
// Additional indexes can be added if needed for performance
```

## Repository Implementations

### 1. H2ProjectRepository

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/persistence/H2ProjectRepository.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.valueobjects.IssueId
import io.spiralhouse.jcvd.domain.repositories.ProjectRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.exceptions.RepositoryException
import io.spiralhouse.jcvd.infrastructure.database.Projects
import io.spiralhouse.jcvd.infrastructure.database.ProjectIssues
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime

class H2ProjectRepository(
    private val timeProvider: TimeProvider
) : ProjectRepository {
    
    override suspend fun findById(id: ProjectId): Project? = transaction {
        try {
            val projectRow = Projects.select { Projects.id eq id.value }
                .singleOrNull() ?: return@transaction null

            // Get associated issue IDs
            val issueIds = ProjectIssues.select { ProjectIssues.projectId eq id.value }
                .orderBy(ProjectIssues.addedAt to SortOrder.ASC)
                .map { it[ProjectIssues.issueId] }
                .map { IssueId(it) }

            // TODO: Implementation pending in SPI-437 (Domain Entities)
            // This will use Project.fromSnapshot() when domain entities are implemented
            Project.create(
                name = projectRow[Projects.name],
                description = projectRow[Projects.description] ?: "",
                // Additional properties will be set when value objects are available
                timeProvider = timeProvider
            )
        } catch (e: Exception) {
            throw RepositoryException("Failed to find project by id: ${id.value}", e)
        }
    }

    override suspend fun findAll(): List<Project> = transaction {
        try {
            val projectRows = Projects.selectAll()
                .orderBy(Projects.updatedAt to SortOrder.DESC)

            projectRows.map { projectRow ->
                val projectId = ProjectId(projectRow[Projects.id].value)
                val issueIds = ProjectIssues.select { ProjectIssues.projectId eq projectId.value }
                    .map { IssueId(it[ProjectIssues.issueId]) }

                // TODO: Implementation pending in SPI-437 (Domain Entities)
                Project.create(
                    name = projectRow[Projects.name],
                    description = projectRow[Projects.description] ?: "",
                    timeProvider = timeProvider
                )
            }
        } catch (e: Exception) {
            throw RepositoryException("Failed to find all projects", e)
        }
    }

    override suspend fun save(project: Project): Unit = transaction {
        try {
            val exists = exists(project.id)
            val now = timeProvider.now()

            if (exists) {
                // Update existing project
                Projects.update({ Projects.id eq project.id.value }) {
                    it[name] = project.name
                    it[description] = project.description
                    it[status] = project.status.name
                    it[updatedAt] = now
                }
            } else {
                // Insert new project
                Projects.insert {
                    it[id] = project.id.value
                    it[name] = project.name
                    it[description] = project.description
                    it[status] = project.status.name
                    it[createdAt] = project.createdAt
                    it[updatedAt] = now
                }
            }

            // Update project-issue relationships
            ProjectIssues.deleteWhere { ProjectIssues.projectId eq project.id.value }
            project.issues.forEach { issueId ->
                ProjectIssues.insert {
                    it[projectId] = project.id.value
                    it[ProjectIssues.issueId] = issueId.value
                    it[addedAt] = now
                }
            }
        } catch (e: Exception) {
            throw RepositoryException("Failed to save project: ${project.id.value}", e)
        }
    }

    override suspend fun delete(id: ProjectId): Boolean = transaction {
        try {
            val deletedCount = Projects.deleteWhere { Projects.id eq id.value }
            deletedCount > 0
        } catch (e: Exception) {
            throw RepositoryException("Failed to delete project: ${id.value}", e)
        }
    }

    override suspend fun exists(id: ProjectId): Boolean = transaction {
        Projects.select { Projects.id eq id.value }.singleOrNull() != null
    }
}
```

### 2. H2IssueRepository

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/persistence/H2IssueRepository.kt

import io.spiralhouse.jcvd.domain.entities.Issue
import io.spiralhouse.jcvd.domain.valueobjects.IssueId
import io.spiralhouse.jcvd.domain.repositories.IssueRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.exceptions.RepositoryException
import io.spiralhouse.jcvd.infrastructure.database.Issues
import io.spiralhouse.jcvd.infrastructure.database.IssueDependencies
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

class H2IssueRepository(
    private val timeProvider: TimeProvider
) : IssueRepository {

    override suspend fun findById(id: IssueId): Issue? = transaction {
        try {
            val issueRow = Issues.select { Issues.id eq id.value }
                .singleOrNull() ?: return@transaction null

            // Get child IDs
            val childIds = Issues.select { Issues.parentId eq id.value }
                .orderBy(Issues.createdAt to SortOrder.ASC)
                .map { IssueId(it[Issues.id].value) }

            // Get dependency IDs
            val dependencies = IssueDependencies.select { IssueDependencies.dependentId eq id.value }
                .orderBy(IssueDependencies.createdAt to SortOrder.ASC)
                .map { IssueId(it[IssueDependencies.dependencyId]) }

            // TODO: Implementation pending in SPI-438 (Domain Entities)
            // This will use Issue.fromSnapshot() when domain entities are implemented
            Issue.create(
                title = issueRow[Issues.title],
                description = issueRow[Issues.description] ?: "",
                // type, status, and other properties will be set when value objects are available
                timeProvider = timeProvider
            )
        } catch (e: Exception) {
            throw RepositoryException("Failed to find issue by id: ${id.value}", e)
        }
    }

    override suspend fun save(issue: Issue): Unit = transaction {
        try {
            val exists = exists(issue.id)
            val now = timeProvider.now()

            if (exists) {
                // Update existing issue
                Issues.update({ Issues.id eq issue.id.value }) {
                    it[title] = issue.title
                    it[description] = issue.description
                    it[type] = issue.type
                    it[status] = issue.status
                    it[parentId] = issue.parentId?.value
                    it[estimate] = issue.estimate
                    it[updatedAt] = now
                }
            } else {
                // Insert new issue
                Issues.insert {
                    it[id] = issue.id.value
                    it[title] = issue.title
                    it[description] = issue.description
                    it[type] = issue.type
                    it[status] = issue.status
                    it[parentId] = issue.parentId?.value
                    it[estimate] = issue.estimate
                    it[createdAt] = issue.createdAt
                    it[updatedAt] = now
                }
            }

            // Update dependencies
            IssueDependencies.deleteWhere { IssueDependencies.dependentId eq issue.id.value }
            issue.dependencies.forEach { dependencyId ->
                IssueDependencies.insert {
                    it[dependentId] = issue.id.value
                    it[IssueDependencies.dependencyId] = dependencyId.value
                    it[createdAt] = now
                }
            }
        } catch (e: Exception) {
            throw RepositoryException("Failed to save issue: ${issue.id.value}", e)
        }
    }

    override suspend fun delete(id: IssueId): Boolean = transaction {
        try {
            val deletedCount = Issues.deleteWhere { Issues.id eq id.value }
            deletedCount > 0
        } catch (e: Exception) {
            throw RepositoryException("Failed to delete issue: ${id.value}", e)
        }
    }

    override suspend fun exists(id: IssueId): Boolean = transaction {
        Issues.select { Issues.id eq id.value }.singleOrNull() != null
    }
}
```

### 3. H2WorkflowRepository

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/infrastructure/persistence/H2WorkflowRepository.kt

import io.spiralhouse.jcvd.domain.entities.Workflow
import io.spiralhouse.jcvd.domain.valueobjects.WorkflowId
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.repositories.WorkflowRepository
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.domain.exceptions.RepositoryException
import io.spiralhouse.jcvd.infrastructure.database.Workflows
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

class H2WorkflowRepository(
    private val timeProvider: TimeProvider
) : WorkflowRepository {

    override suspend fun findById(id: WorkflowId): Workflow? = transaction {
        try {
            val row = Workflows.select { Workflows.id eq id.value }
                .singleOrNull() ?: return@transaction null

            // TODO: Implementation pending in SPI-440 (Workflow Domain Entities)
            // This will use Workflow.fromSnapshot() when domain entities are implemented
            Workflow.create(
                name = row[Workflows.name],
                // projectId, stages, and other properties will be set when value objects are available
                timeProvider = timeProvider
            )
        } catch (e: Exception) {
            throw RepositoryException("Failed to find workflow by id: ${id.value}", e)
        }
    }

    override suspend fun findByProjectId(projectId: ProjectId): List<Workflow> = transaction {
        try {
            Workflows.select { Workflows.projectId eq projectId.value }
                .map { row ->
                    // TODO: Implementation pending in SPI-440 (Workflow Domain Entities)
                    Workflow.create(
                        name = row[Workflows.name],
                        timeProvider = timeProvider
                    )
                }
        } catch (e: Exception) {
            throw RepositoryException("Failed to find workflows by project id: ${projectId.value}", e)
        }
    }

    override suspend fun save(workflow: Workflow): Unit = transaction {
        try {
            val exists = exists(workflow.id)
            val now = timeProvider.now()

            if (exists) {
                Workflows.update({ Workflows.id eq workflow.id.value }) {
                    it[name] = workflow.name
                    it[currentStage] = workflow.currentStage
                    it[stages] = Json.encodeToString(workflow.stages)
                    it[transitions] = Json.encodeToString(workflow.transitions)
                    it[isComplete] = workflow.isComplete
                    it[updatedAt] = now
                }
            } else {
                Workflows.insert {
                    it[id] = workflow.id.value
                    it[name] = workflow.name
                    it[projectId] = workflow.projectId.value
                    it[currentStage] = workflow.currentStage
                    it[stages] = Json.encodeToString(workflow.stages)
                    it[transitions] = Json.encodeToString(workflow.transitions)
                    it[isComplete] = workflow.isComplete
                    it[createdAt] = workflow.createdAt
                    it[updatedAt] = now
                }
            }
        } catch (e: Exception) {
            throw RepositoryException("Failed to save workflow: ${workflow.id.value}", e)
        }
    }

    override suspend fun delete(id: WorkflowId): Boolean = transaction {
        try {
            val deletedCount = Workflows.deleteWhere { Workflows.id eq id.value }
            deletedCount > 0
        } catch (e: Exception) {
            throw RepositoryException("Failed to delete workflow: ${id.value}", e)
        }
    }

    override suspend fun exists(id: WorkflowId): Boolean = transaction {
        Workflows.select { Workflows.id eq id.value }.singleOrNull() != null
    }
}
```

## Error Handling

### Repository Exception Class

```kotlin
// src/main/kotlin/com/spiralhouse/jcvd/domain/exceptions/RepositoryException.kt

class RepositoryException(
    message: String,
    cause: Throwable? = null
) : Exception(message, cause)
```

## Testing Strategy

### 1. Unit Tests (TDD - Write First)

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/infrastructure/persistence/H2ProjectRepositoryTest.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.services.TimeProvider
import io.spiralhouse.jcvd.infrastructure.persistence.H2ProjectRepository
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.mockk
import io.mockk.every
import java.time.LocalDateTime

class H2ProjectRepositoryTest : DescribeSpec({
    
    describe("H2ProjectRepository Unit Tests") {
        val mockTimeProvider = mockk<TimeProvider>()
        val repository = H2ProjectRepository(mockTimeProvider)
        val fixedTime = LocalDateTime.of(2025, 1, 15, 10, 0)
        
        beforeEach {
            every { mockTimeProvider.now() } returns fixedTime
        }

        describe("findById") {
            it("should return null when project not found") {
                // TODO: Test implementation pending in SPI-439
                // Will test with mocked database that returns null
                val result = repository.findById(ProjectId("non-existent"))
                result shouldBe null
            }

            it("should reconstitute project from database row") {
                // TODO: Test implementation pending in SPI-439
                // Will test with Project.create() and proper reconstitution
                val projectId = ProjectId("test-id")
                val project = Project.create("Test Project", "Description", mockTimeProvider)
                
                // Mock successful retrieval
                val result = repository.findById(projectId)
                
                result shouldNotBe null
                result?.name shouldBe "Test Project"
                result?.description shouldBe "Description"
            }
        }

        describe("save") {
            it("should insert new project") {
                // TODO: Test implementation pending in SPI-439
                val project = Project.create("New Project", "Description", mockTimeProvider)
                
                // Test insertion logic
                repository.save(project)
                
                // Verify project was saved (implementation pending)
            }

            it("should update existing project") {
                // TODO: Test implementation pending in SPI-439
                val project = Project.create("Existing Project", "Description", mockTimeProvider)
                
                // Test update logic
                repository.save(project)
                
                // Verify project was updated (implementation pending)
            }
        }
    }
})
```

### 2. Integration Tests (Write After Implementation)

```kotlin
// src/test/kotlin/com/spiralhouse/jcvd/infrastructure/persistence/H2ProjectRepositoryIntegrationTest.kt

import io.spiralhouse.jcvd.domain.entities.Project
import io.spiralhouse.jcvd.domain.valueobjects.ProjectId
import io.spiralhouse.jcvd.domain.services.RealTimeProvider
import io.spiralhouse.jcvd.infrastructure.persistence.H2ProjectRepository
import io.spiralhouse.jcvd.infrastructure.database.Projects
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe

class H2ProjectRepositoryIntegrationTest : DescribeSpec({
    
    describe("H2ProjectRepository Integration Tests") {
        val timeProvider = RealTimeProvider()
        lateinit var repository: H2ProjectRepository
        
        beforeEach {
            // Connect to in-memory H2 database for testing
            Database.connect("jdbc:h2:mem:test;DB_CLOSE_DELAY=-1", driver = "org.h2.Driver")
            
            // Create tables
            transaction {
                SchemaUtils.create(Projects, ProjectIssues, Issues, Workflows, IssueDependencies)
            }
            
            repository = H2ProjectRepository(timeProvider)
        }
        
        afterEach {
            transaction {
                SchemaUtils.drop(Projects, ProjectIssues, Issues, Workflows, IssueDependencies)
            }
        }

        describe("save and findById") {
            it("should save and retrieve a project") {
                val project = Project.create("Test Project", "Description", timeProvider)
                
                repository.save(project)
                val retrieved = repository.findById(project.id)
                
                retrieved shouldNotBe null
                retrieved?.id shouldBe project.id
                retrieved?.name shouldBe "Test Project"
                retrieved?.description shouldBe "Description"
            }

            it("should update an existing project") {
                val project = Project.create("Original", "Original Desc", timeProvider)
                repository.save(project)
                
                project.updateName("Updated")
                repository.save(project)
                
                val retrieved = repository.findById(project.id)
                retrieved?.name shouldBe "Updated"
            }
        }

        describe("findAll") {
            it("should retrieve all projects") {
                val project1 = Project.create("Project 1", "Desc 1", timeProvider)
                val project2 = Project.create("Project 2", "Desc 2", timeProvider)
                
                repository.save(project1)
                repository.save(project2)
                
                val projects = repository.findAll()
                
                projects.size shouldBe 2
                projects.any { it.id == project1.id } shouldBe true
                projects.any { it.id == project2.id } shouldBe true
            }
        }

        describe("delete") {
            it("should delete a project") {
                val project = Project.create("To Delete", "Desc", timeProvider)
                repository.save(project)
                
                val deleted = repository.delete(project.id)
                deleted shouldBe true
                
                val retrieved = repository.findById(project.id)
                retrieved shouldBe null
            }

            it("should return false when deleting non-existent project") {
                val deleted = repository.delete(ProjectId("non-existent"))
                deleted shouldBe false
            }
        }
    }
})
```

## Implementation Order

1. **Phase 1: Infrastructure Setup**
   - Create repository exception class
   - Update table definitions in Tables.kt
   - Configure H2 database connection with Exposed

2. **Phase 2: Repository Implementation (TDD)**
   - Write **unit tests** for H2ProjectRepository (with mocked database)
   - Implement H2ProjectRepository to pass unit tests
   - Write **integration tests** to verify actual H2 database operations
   - Repeat for H2IssueRepository
   - Repeat for H2WorkflowRepository

3. **Phase 3: Integration Testing**
   - Test transaction scenarios with H2's ACID properties
   - Test concurrent access patterns with H2's built-in support
   - Test large dataset performance with H2 optimizations

4. **Phase 4: Documentation and Cleanup**
   - Update API documentation
   - Add usage examples
   - Performance optimization if needed

## Performance Considerations

1. **Exposed DSL Optimization**: All queries use Exposed's type-safe DSL for optimal database performance
2. **Strategic Indexing**: Indexes on foreign keys and commonly queried fields, automatically managed by Exposed
3. **Transaction Management**: Robust transaction handling for multi-operation consistency
4. **Connection Pooling**: Efficient connection pooling for concurrent access

## H2-Specific Advantages (Future Migration - SPI-439)

1. **JVM Integration**: Better memory management and query execution within JVM ecosystem
2. **Concurrency**: Enhanced concurrent access patterns compared to embedded SQLite
3. **Development Experience**: Familiar SQL compatibility and better tooling integration
4. **Exposed Compatibility**: Native support reduces JDBC overhead

**Note**: Performance claims will be validated with benchmarks during SPI-439 implementation.

## Security Considerations

1. **Type Safety**: Exposed DSL prevents SQL injection through compile-time type checking
2. **Data Validation**: Domain entities validate data before persistence
3. **Transaction Isolation**: H2 provides robust ACID transaction support

## Dependencies

- **Domain Layer**: Entities, Value Objects, Repository Interfaces (SPI-437, SPI-438)
- **Infrastructure**: H2 database, Exposed ORM, connection pooling
- **Testing**: Kotest, H2 in-memory database

## Acceptance Criteria Checklist

- [ ] Repository exception class implemented
- [ ] H2 table definitions created with Exposed DSL
- [ ] H2ProjectRepository with full CRUD operations
- [ ] H2IssueRepository with hierarchy and dependency support
- [ ] H2WorkflowRepository with JSON serialization
- [ ] Integration tests achieving >95% coverage
- [ ] Transaction rollback scenarios tested
- [ ] Performance benchmarks meet H2 performance targets
- [ ] Documentation complete with Kotlin examples

## Risk Mitigation

1. **Database Schema Changes**: Use Exposed migrations for version control
2. **Data Integrity**: H2's foreign key constraints and transaction support
3. **Performance Optimization**: Monitor with benchmarks, leverage H2's query optimizer
4. **Testing Coverage**: Integration tests for all repository methods with H2

## Next Steps

After this implementation is complete:
1. SPI-401: Application Service Layer can use these repositories
2. SPI-344: MCP Resources can access data through repositories
3. SPI-345: CRUD tools can persist changes through repositories
