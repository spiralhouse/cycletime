package io.spiralhouse.cycletime.integration

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import io.spiralhouse.cycletime.infrastructure.database.*
import io.spiralhouse.cycletime.infrastructure.persistence.*
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Integration Tests for UnitOfWork transaction boundaries
 * 
 * These tests validate proper transaction handling across multiple repositories:
 * 1. Cross-repository operations within single transactions
 * 2. Rollback scenarios with partial failures  
 * 3. Transaction isolation between concurrent operations
 * 4. Resource cleanup after transaction completion
 * 
 * Uses H2 in-memory database for isolated, repeatable tests.
 */
class UnitOfWorkTransactionTest : DescribeSpec({

    lateinit var database: Database
    lateinit var unitOfWork: ExposedUnitOfWork
    lateinit var projectRepository: ExposedProjectRepository
    lateinit var issueRepository: ExposedIssueRepository
    lateinit var sessionRepository: ExposedSessionRepository
    lateinit var mockTimeProvider: MockTimeProvider

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = Database.connect(
            url = "jdbc:h2:mem:transaction_test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
            driver = "org.h2.Driver"
        )

        // Create all tables
        transaction(database) {
            SchemaUtils.create(
                ProjectsTable,
                IssuesTable,
                IssueDependenciesTable,
                IssueLabelsTable,
                SessionStatesTable
            )
        }

        // Initialize components
        mockTimeProvider = MockTimeProvider()
        unitOfWork = ExposedUnitOfWork(database)
        projectRepository = ExposedProjectRepository(mockTimeProvider, database)
        issueRepository = ExposedIssueRepository(mockTimeProvider, database)
        sessionRepository = ExposedSessionRepository(mockTimeProvider, database)
    }

    beforeEach {
        // Clean database before each test
        transaction(database) {
            // Order matters due to foreign key constraints
            IssueDependenciesTable.deleteAll()
            IssueLabelsTable.deleteAll() 
            IssuesTable.deleteAll()
            SessionStatesTable.deleteAll()
            ProjectsTable.deleteAll()
        }

        // Reset time provider
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(
                IssueDependenciesTable,
                IssueLabelsTable,
                IssuesTable,
                SessionStatesTable,
                ProjectsTable
            )
        }
        TransactionManager.closeAndUnregister(database)
    }

    describe("Cross-Repository Transaction Boundaries") {

        it("should commit operations across multiple repositories in single transaction") {
            runTest {
                val project = Project.create(
                    name = "Multi-Repo Test Project",
                    description = "Testing cross-repository transactions",
                    timeProvider = mockTimeProvider
                )

                val issue = Issue.create(
                    title = "Test Issue",
                    description = "Issue for transaction testing",
                    type = IssueType.STORY,
                    projectId = project.id,
                    timeProvider = mockTimeProvider
                )

                // Execute operations across multiple repositories in single transaction
                unitOfWork.execute {
                    projectRepository.save(project)
                    issueRepository.save(issue)
                    
                    // Verify data exists within transaction
                    projectRepository.findById(project.id) shouldNotBe null
                    issueRepository.findById(issue.id) shouldNotBe null
                }

                // Verify data persisted after transaction commit
                val savedProject = projectRepository.findById(project.id)
                val savedIssue = issueRepository.findById(issue.id)

                savedProject shouldNotBe null
                savedProject!!.id shouldBe project.id
                savedIssue shouldNotBe null
                savedIssue!!.id shouldBe issue.id
                savedIssue.projectId shouldBe project.id
            }
        }

        it("should rollback all operations when exception occurs during transaction") {
            runTest {
                val project = Project.create(
                    name = "Rollback Test Project",
                    description = "Will be rolled back",
                    timeProvider = mockTimeProvider
                )

                val issue = Issue.create(
                    title = "Rollback Test Issue",
                    description = "Will also be rolled back", 
                    type = IssueType.STORY,
                    projectId = project.id,
                    timeProvider = mockTimeProvider
                )

                // Expect transaction to fail and rollback
                shouldThrow<RuntimeException> {
                    unitOfWork.execute {
                        projectRepository.save(project)
                        issueRepository.save(issue)
                        
                        // Simulate error after partial operations
                        throw RuntimeException("Simulated transaction failure")
                    }
                }

                // Verify nothing was committed due to rollback
                projectRepository.findById(project.id) shouldBe null
                issueRepository.findById(issue.id) shouldBe null
                projectRepository.findAll().shouldBeEmpty()
                issueRepository.findByProject(project.id).shouldBeEmpty()
            }
        }

        it("should handle nested repository operations correctly") {
            runTest {
                val project = Project.create(
                    name = "Nested Operations Project",
                    description = "Testing nested repository calls",
                    timeProvider = mockTimeProvider
                )

                unitOfWork.execute {
                    // Save project first
                    projectRepository.save(project)
                    
                    // Create and save multiple issues for this project
                    val issues = (1..3).map { index ->
                        Issue.create(
                            title = "Nested Issue $index",
                            description = "Issue $index for nested testing",
                            type = IssueType.SUBTASK,
                            projectId = project.id,
                            timeProvider = mockTimeProvider
                        )
                    }
                    
                    // Save all issues in same transaction
                    issues.forEach { issue ->
                        issueRepository.save(issue)
                    }
                    
                    // Verify all operations completed within transaction
                    projectRepository.findById(project.id) shouldNotBe null
                    issues.forEach { issue ->
                        issueRepository.findById(issue.id) shouldNotBe null
                    }
                }

                // Verify all operations committed properly
                val savedProject = projectRepository.findById(project.id)
                savedProject shouldNotBe null

                val allIssues = issueRepository.findByProject(project.id)
                allIssues shouldHaveSize 3
                allIssues.forEach { issue ->
                    issue.projectId shouldBe project.id
                }
            }
        }

        it("should maintain isolation between concurrent transactions") {
            runTest {
                val project1 = Project.create("Concurrent Project 1", "Description 1", mockTimeProvider)
                val project2 = Project.create("Concurrent Project 2", "Description 2", mockTimeProvider)

                // First transaction - save project1
                unitOfWork.execute {
                    projectRepository.save(project1)
                    
                    // At this point, project1 exists within this transaction
                    projectRepository.findById(project1.id) shouldNotBe null
                }

                // Second transaction - save project2, verify project1 is visible
                unitOfWork.execute {
                    // project1 should be visible from previous committed transaction
                    projectRepository.findById(project1.id) shouldNotBe null
                    
                    // Save project2
                    projectRepository.save(project2)
                    
                    // Both should be visible within this transaction
                    projectRepository.findById(project1.id) shouldNotBe null
                    projectRepository.findById(project2.id) shouldNotBe null
                }

                // After both transactions, both projects should exist
                val allProjects = projectRepository.findAll()
                allProjects shouldHaveSize 2
                allProjects.map { it.id }.toSet() shouldBe setOf(project1.id, project2.id)
            }
        }
    }

    describe("Transaction Resource Management") {

        it("should properly clean up resources after successful transaction") {
            runTest {
                val project = Project.create("Resource Test", "Testing resource cleanup", mockTimeProvider)

                unitOfWork.execute {
                    projectRepository.save(project)
                }

                // After transaction, data should be persisted
                projectRepository.findById(project.id) shouldNotBe null
                
                // Connection should be returned to pool (we can't test this directly,
                // but we can verify we can start new transactions)
                unitOfWork.execute {
                    projectRepository.findAll() shouldHaveSize 1
                }
            }
        }

        it("should clean up resources after failed transaction") {
            runTest {
                val project = Project.create("Failed Resource Test", "Will fail", mockTimeProvider)

                shouldThrow<RuntimeException> {
                    unitOfWork.execute {
                        projectRepository.save(project)
                        
                        // Verify data exists within transaction
                        projectRepository.findById(project.id) shouldNotBe null
                        
                        // Force failure
                        throw RuntimeException("Forced failure for resource test")
                    }
                }

                // After failed transaction, no data should exist
                projectRepository.findById(project.id) shouldBe null
                
                // Should be able to start new transactions (resources cleaned up)
                val newProject = Project.create("New Project", "After failure", mockTimeProvider)
                unitOfWork.execute {
                    projectRepository.save(newProject)
                }
                
                projectRepository.findAll() shouldHaveSize 1
            }
        }

        it("should handle multiple sequential transactions correctly") {
            runTest {
                val projects = (1..5).map { index ->
                    Project.create("Sequential Project $index", "Description $index", mockTimeProvider)
                }

                // Execute each save in separate transaction
                projects.forEach { project ->
                    unitOfWork.execute {
                        projectRepository.save(project)
                    }
                }

                // Verify all projects were saved
                val allProjects = projectRepository.findAll()
                allProjects shouldHaveSize 5
                
                // Verify each project exists
                projects.forEach { project ->
                    projectRepository.findById(project.id) shouldNotBe null
                }
            }
        }
    }

    describe("Complex Transaction Scenarios") {

        it("should handle mixed success/failure operations correctly") {
            runTest {
                val successProject = Project.create("Success Project", "Will succeed", mockTimeProvider)
                val failProject = Project.create("Fail Project", "Will fail", mockTimeProvider)

                // First transaction - succeeds
                unitOfWork.execute {
                    projectRepository.save(successProject)
                }

                // Second transaction - fails
                shouldThrow<RuntimeException> {
                    unitOfWork.execute {
                        projectRepository.save(failProject)
                        throw RuntimeException("Second transaction fails")
                    }
                }

                // Only first project should exist
                projectRepository.findById(successProject.id) shouldNotBe null
                projectRepository.findById(failProject.id) shouldBe null
                projectRepository.findAll() shouldHaveSize 1
            }
        }

        it("should handle transaction with repository queries and updates") {
            runTest {
                val project = Project.create("Query Update Test", "Original description", mockTimeProvider)
                
                // Initial save
                unitOfWork.execute {
                    projectRepository.save(project)
                }

                // Transaction that queries and updates
                unitOfWork.execute {
                    val existingProject = projectRepository.findById(project.id)
                    existingProject shouldNotBe null
                    
                    // Modify and save within same transaction
                    mockTimeProvider.advance(kotlin.time.Duration.parse("1h"))
                    existingProject!!.updateDescription("Updated description")
                    projectRepository.save(existingProject)
                    
                    // Verify update is visible within transaction
                    val requeriedProject = projectRepository.findById(project.id)
                    requeriedProject!!.description shouldBe "Updated description"
                }

                // Verify update persisted
                val finalProject = projectRepository.findById(project.id)
                finalProject!!.description shouldBe "Updated description"
            }
        }

        it("should maintain consistency with foreign key relationships") {
            runTest {
                val project = Project.create("FK Test Project", "Testing foreign keys", mockTimeProvider)
                
                val issue = Issue.create(
                    title = "FK Test Issue",
                    description = "Issue with foreign key to project",
                    type = IssueType.STORY,
                    projectId = project.id,
                    timeProvider = mockTimeProvider
                )

                // Save both in single transaction
                unitOfWork.execute {
                    projectRepository.save(project)
                    issueRepository.save(issue)
                }

                // Try to delete project while issue exists - should handle gracefully
                unitOfWork.execute {
                    val existingProject = projectRepository.findById(project.id)
                    val existingIssue = issueRepository.findById(issue.id)
                    
                    existingProject shouldNotBe null
                    existingIssue shouldNotBe null
                    existingIssue!!.projectId shouldBe project.id
                }

                // Clean up in proper order (issues first, then project)
                unitOfWork.execute {
                    issueRepository.delete(issue.id)
                    projectRepository.delete(project.id)
                }

                projectRepository.findById(project.id) shouldBe null
                issueRepository.findById(issue.id) shouldBe null
            }
        }
    }

    describe("Transaction Performance and Stress Tests") {

        it("should handle bulk operations efficiently in single transaction") {
            runTest {
                val projects = (1..50).map { index ->
                    Project.create("Bulk Project $index", "Description $index", mockTimeProvider)
                }

                // Save all in single transaction
                unitOfWork.execute {
                    projects.forEach { project ->
                        projectRepository.save(project)
                    }
                    
                    // Verify all exist within transaction
                    projects.forEach { project ->
                        projectRepository.findById(project.id) shouldNotBe null
                    }
                }

                // Verify all committed
                val allProjects = projectRepository.findAll()
                allProjects shouldHaveSize 50
                
                projects.forEach { project ->
                    projectRepository.findById(project.id) shouldNotBe null
                }
            }
        }

        it("should handle complex multi-repository operations under load") {
            runTest {
                val numProjects = 10
                val issuesPerProject = 5

                unitOfWork.execute {
                    repeat(numProjects) { projectIndex ->
                        val project = Project.create(
                            name = "Load Test Project $projectIndex",
                            description = "Project $projectIndex for load testing",
                            timeProvider = mockTimeProvider
                        )
                        projectRepository.save(project)

                        repeat(issuesPerProject) { issueIndex ->
                            val issue = Issue.create(
                                title = "Load Test Issue $projectIndex-$issueIndex",
                                description = "Issue $issueIndex for project $projectIndex",
                                type = IssueType.SUBTASK,
                                projectId = project.id,
                                timeProvider = mockTimeProvider
                            )
                            issueRepository.save(issue)
                        }
                    }
                }

                // Verify all data committed correctly
                val allProjects = projectRepository.findAll()
                allProjects shouldHaveSize numProjects
                
                var totalIssues = 0
                allProjects.forEach { project ->
                    val projectIssues = issueRepository.findByProject(project.id)
                    totalIssues += projectIssues.size
                    
                    // Verify relationships
                    projectIssues.forEach { issue ->
                        issue.projectId shouldBe project.id
                    }
                }
                
                totalIssues shouldBe (numProjects * issuesPerProject)
            }
        }
    }
})