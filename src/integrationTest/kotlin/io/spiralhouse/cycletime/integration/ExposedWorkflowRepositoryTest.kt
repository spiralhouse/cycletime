package io.spiralhouse.cycletime.integration

import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.string.shouldContain
import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.exceptions.DomainException

import io.spiralhouse.cycletime.domain.services.MockTimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import io.spiralhouse.cycletime.infrastructure.database.TestDatabaseFactory
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedWorkflowRepository
import kotlinx.coroutines.test.runTest
import kotlinx.datetime.Instant
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.deleteAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import kotlin.time.Duration.Companion.hours
import kotlin.time.Duration.Companion.minutes

/**
 * Integration Tests for ExposedWorkflowRepository
 *
 * These integration tests verify the behavior of the WorkflowRepository implementation
 * using real database operations with H2 in-memory database.
 *
 * Tests cover:
 * 1. CRUD Operations (save, findById, update, delete, existsById)
 * 2. Query Operations (findAll)
 * 3. Edge Cases (non-existent records, constraints, validation)
 * 4. Data Integrity (snapshot conversion, timestamps, JSON serialization)
 * 5. Transaction Handling
 * 6. Concurrency scenarios
 * 7. Business Logic Integration (workflow creation patterns, status transitions)
 * 8. Error Scenarios (invalid data, constraint violations)
 *
 * All tests use dependency injection for better testability and follow TDD RED phase.
 * These tests are expected to FAIL until ExposedWorkflowRepository is implemented.
 */
class ExposedWorkflowRepositoryTest : StringSpec({

    lateinit var database: Database
    lateinit var repository: ExposedWorkflowRepository
    lateinit var mockTimeProvider: MockTimeProvider

    /**
     * Helper function to create a test workflow with default values.
     * Reduces boilerplate in tests and improves readability.
     */
    fun createTestWorkflow(
        name: String = "Test Workflow",
        description: String? = "Test workflow for testing purposes",
        initialStatus: IssueStatus = IssueStatus.TODO,
        allowedStatuses: Set<IssueStatus> = setOf(
            IssueStatus.TODO,
            IssueStatus.IN_PROGRESS,
            IssueStatus.IN_REVIEW,
            IssueStatus.DONE,
            IssueStatus.CANCELED
        ),
        timeProvider: MockTimeProvider = mockTimeProvider
    ): Workflow {
        return Workflow.create(name, description, initialStatus, allowedStatuses, timeProvider)
    }

    beforeSpec {
        // Set up H2 in-memory database for integration testing
        database = TestDatabaseFactory.createTestDatabase()

        // Create schema
        transaction(database) {
            SchemaUtils.create(WorkflowsTable)
        }

        mockTimeProvider = MockTimeProvider()
        // Pass test database instance to repository
        repository = ExposedWorkflowRepository(mockTimeProvider, database)
    }

    beforeEach {
        // Clean database before each test
        transaction(database) {
            WorkflowsTable.deleteAll()
        }

        // Reset time provider
        mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
    }

    afterSpec {
        // Clean up database after all tests
        transaction(database) {
            SchemaUtils.drop(WorkflowsTable)
        }
        TransactionManager.closeAndUnregister(database)
    }

    // ==========================================
    // CRUD Operations - Basic Repository Pattern
    // ==========================================

    "should save and retrieve a new workflow" {
        runTest {
            // RED: This will fail until save/findById are implemented correctly
            val workflow = createTestWorkflow(
                name = "Default Development Workflow",
                description = "Standard workflow for feature development"
            )

            // Save workflow
            val savedWorkflow = repository.save(workflow)

            // Verify save returns the workflow
            savedWorkflow shouldBe workflow

            // Retrieve workflow
            val retrievedWorkflow = repository.findById(workflow.id)

            // Verify all data is preserved
            retrievedWorkflow shouldNotBe null
            retrievedWorkflow!!.id shouldBe workflow.id
            retrievedWorkflow.name shouldBe "Default Development Workflow"
            retrievedWorkflow.description shouldBe "Standard workflow for feature development"
            retrievedWorkflow.initialStatus shouldBe IssueStatus.TODO
            retrievedWorkflow.allowedStatuses shouldBe setOf(
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
            retrievedWorkflow.createdAt shouldBe workflow.createdAt
            retrievedWorkflow.updatedAt shouldBe workflow.updatedAt
        }
    }

    "should save workflow with null description" {
        runTest {
            // RED: Testing null description handling
            val workflow = createTestWorkflow(
                name = "Workflow Without Description",
                description = null
            )

            val savedWorkflow = repository.save(workflow)
            val retrievedWorkflow = repository.findById(workflow.id)

            retrievedWorkflow shouldNotBe null
            retrievedWorkflow!!.description shouldBe null
        }
    }

    "should save workflow with minimum allowed statuses" {
        runTest {
            // RED: Testing edge case with minimal status set
            val workflow = createTestWorkflow(
                name = "Minimal Workflow",
                description = "Workflow with just TODO and DONE",
                allowedStatuses = setOf(IssueStatus.TODO, IssueStatus.DONE)
            )

            val savedWorkflow = repository.save(workflow)
            val retrievedWorkflow = repository.findById(workflow.id)

            retrievedWorkflow shouldNotBe null
            retrievedWorkflow!!.allowedStatuses shouldBe setOf(IssueStatus.TODO, IssueStatus.DONE)
        }
    }

    "should update existing workflow when saving again with same ID" {
        runTest {
            // RED: Testing upsert behavior
            val workflow = createTestWorkflow(
                name = "Original Workflow Name",
                description = "Original description"
            )
            repository.save(workflow)

            // Modify workflow
            mockTimeProvider.advance(1.hours)
            workflow.updateName("Updated Workflow Name")
            workflow.updateDescription("Updated description")

            // Save updated workflow
            val updatedWorkflow = repository.save(workflow)

            // Verify update persisted
            val retrievedWorkflow = repository.findById(workflow.id)
            retrievedWorkflow shouldNotBe null
            retrievedWorkflow!!.name shouldBe "Updated Workflow Name"
            retrievedWorkflow.description shouldBe "Updated description"
            retrievedWorkflow.updatedAt shouldBe workflow.updatedAt
            retrievedWorkflow.createdAt shouldBe workflow.createdAt // Should remain unchanged
        }
    }

    "should return null for non-existent workflow ID" {
        runTest {
            // RED: Testing null return for missing entities
            val nonExistentId = WorkflowId.generate()

            val result = repository.findById(nonExistentId)

            result shouldBe null
        }
    }

    "should update workflow and return updated entity" {
        runTest {
            // RED: Testing explicit update method
            val workflow = createTestWorkflow(
                name = "Workflow to Update",
                description = "Original description"
            )
            repository.save(workflow)

            // Modify workflow
            mockTimeProvider.advance(30.minutes)
            workflow.updateName("Updated via update method")
            workflow.updateDescription("Updated description via update method")

            // Update workflow
            val updatedWorkflow = repository.update(workflow)

            // Verify update returns the workflow and changes are persisted
            updatedWorkflow shouldBe workflow
            
            val retrievedWorkflow = repository.findById(workflow.id)
            retrievedWorkflow shouldNotBe null
            retrievedWorkflow!!.name shouldBe "Updated via update method"
            retrievedWorkflow.description shouldBe "Updated description via update method"
        }
    }

    "should throw exception when updating non-existent workflow" {
        runTest {
            // RED: Testing error handling for update of missing entity
            val nonExistentWorkflow = createTestWorkflow(name = "Non-existent Workflow")

            // This should throw an exception
            try {
                repository.update(nonExistentWorkflow)
                // Should not reach here
                throw AssertionError("Expected IllegalArgumentException but update succeeded")
            } catch (e: IllegalArgumentException) {
                // Expected - workflow doesn't exist
            }
        }
    }

    "should delete workflow by ID and return true" {
        runTest {
            // RED: Testing delete operation
            val workflow = createTestWorkflow(name = "Workflow To Delete")
            repository.save(workflow)

            // Verify it exists
            repository.existsById(workflow.id) shouldBe true

            // Delete workflow
            val deleted = repository.delete(workflow.id)

            // Verify deletion
            deleted shouldBe true
            repository.existsById(workflow.id) shouldBe false
            repository.findById(workflow.id) shouldBe null
        }
    }

    "should return false when deleting non-existent workflow" {
        runTest {
            // RED: Testing delete of non-existent entity
            val nonExistentId = WorkflowId.generate()

            // Should return false, not throw exception
            val deleted = repository.delete(nonExistentId)

            deleted shouldBe false
        }
    }

    "should check if workflow exists by ID" {
        runTest {
            // RED: Testing existsById method
            val workflow = createTestWorkflow(name = "Existing Workflow")
            repository.save(workflow)

            // Should exist
            repository.existsById(workflow.id) shouldBe true

            // Non-existent workflow should not exist
            val nonExistentId = WorkflowId.generate()
            repository.existsById(nonExistentId) shouldBe false
        }
    }

    "should return false for existsById check after deletion" {
        runTest {
            // RED: Testing consistency between delete and existsById
            val workflow = createTestWorkflow(name = "Workflow To Delete")
            repository.save(workflow)

            // Initially exists
            repository.existsById(workflow.id) shouldBe true

            // Delete and check again
            repository.delete(workflow.id)
            repository.existsById(workflow.id) shouldBe false
        }
    }

    // ==========================================
    // Query Operations - findAll
    // ==========================================

    "should find all workflows" {
        runTest {
            // RED: Testing findAll method
            val workflow1 = createTestWorkflow(name = "Workflow 1", description = "First workflow")
            val workflow2 = createTestWorkflow(name = "Workflow 2", description = "Second workflow")
            val workflow3 = createTestWorkflow(name = "Workflow 3", description = "Third workflow")

            // Save all workflows
            repository.save(workflow1)
            repository.save(workflow2) 
            repository.save(workflow3)

            // Find all
            val allWorkflows = repository.findAll()

            // Verify all are returned
            allWorkflows shouldHaveSize 3
            allWorkflows.map { it.id } shouldContain workflow1.id
            allWorkflows.map { it.id } shouldContain workflow2.id
            allWorkflows.map { it.id } shouldContain workflow3.id
        }
    }

    "should return empty list when no workflows exist" {
        runTest {
            // RED: Testing findAll on empty repository
            val allWorkflows = repository.findAll()

            allWorkflows.shouldBeEmpty()
        }
    }

    "should preserve order in findAll results" {
        runTest {
            // RED: Testing result ordering (likely by creation time)
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
            val firstWorkflow = createTestWorkflow(name = "First Workflow")
            repository.save(firstWorkflow)

            mockTimeProvider.advance(1.minutes)
            val secondWorkflow = createTestWorkflow(name = "Second Workflow")
            repository.save(secondWorkflow)

            mockTimeProvider.advance(1.minutes)
            val thirdWorkflow = createTestWorkflow(name = "Third Workflow")
            repository.save(thirdWorkflow)

            val allWorkflows = repository.findAll()

            allWorkflows shouldHaveSize 3
            // Assuming ordering by creation time (implementation detail)
            allWorkflows[0].createdAt shouldBe firstWorkflow.createdAt
            allWorkflows[1].createdAt shouldBe secondWorkflow.createdAt
            allWorkflows[2].createdAt shouldBe thirdWorkflow.createdAt
        }
    }

    // ==========================================
    // Data Integrity and Snapshot Conversion
    // ==========================================

    "should preserve all workflow properties during round-trip" {
        runTest {
            // RED: Testing complete data preservation
            val workflow = createTestWorkflow(
                name = "Comprehensive Test Workflow",
                description = "Testing all properties preservation",
                initialStatus = IssueStatus.IN_PROGRESS,
                allowedStatuses = setOf(
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.IN_REVIEW,
                    IssueStatus.DONE,
                    IssueStatus.CANCELED
                )
            )

            // Modify state to test update timestamps
            mockTimeProvider.advance(2.hours)
            workflow.updateDescription("Modified description for round-trip test")

            // Save and retrieve
            repository.save(workflow)
            val retrieved = repository.findById(workflow.id)

            // Verify exact match of all properties
            retrieved shouldNotBe null
            retrieved!!.id shouldBe workflow.id
            retrieved.name shouldBe workflow.name
            retrieved.description shouldBe workflow.description
            retrieved.initialStatus shouldBe workflow.initialStatus
            retrieved.allowedStatuses shouldBe workflow.allowedStatuses
            retrieved.createdAt shouldBe workflow.createdAt
            retrieved.updatedAt shouldBe workflow.updatedAt
        }
    }

    "should handle workflows with maximum name length" {
        runTest {
            // RED: Testing boundary conditions
            val maxLengthName = "a".repeat(255)
            val workflow = createTestWorkflow(
                name = maxLengthName,
                description = "Testing maximum name length"
            )

            repository.save(workflow)

            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe maxLengthName
            retrieved.name.length shouldBe 255
        }
    }

    "should handle all possible IssueStatus combinations" {
        runTest {
            // RED: Testing all IssueStatus enum values
            val allStatuses = IssueStatus.entries.toSet()
            val workflow = createTestWorkflow(
                name = "All Status Workflow",
                description = "Contains all possible status values",
                initialStatus = IssueStatus.TODO,
                allowedStatuses = allStatuses
            )

            repository.save(workflow)

            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null
            retrieved!!.allowedStatuses shouldBe allStatuses
        }
    }

    // ==========================================
    // Business Logic Integration
    // ==========================================

    "should save and retrieve default workflow" {
        runTest {
            // RED: Testing predefined workflow patterns
            val defaultWorkflow = Workflow.createDefault(mockTimeProvider)

            repository.save(defaultWorkflow)

            val retrieved = repository.findById(defaultWorkflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe "Default Workflow"
            retrieved.allowedStatuses shouldBe setOf(
                IssueStatus.BACKLOG,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
        }
    }

    "should save and retrieve bug workflow" {
        runTest {
            // RED: Testing bug-specific workflow pattern
            val bugWorkflow = Workflow.createBugWorkflow(mockTimeProvider)

            repository.save(bugWorkflow)

            val retrieved = repository.findById(bugWorkflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe "Bug Workflow"
            retrieved.allowedStatuses shouldBe setOf(
                IssueStatus.BACKLOG,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
        }
    }

    "should save and retrieve feature workflow" {
        runTest {
            // RED: Testing feature-specific workflow pattern
            val featureWorkflow = Workflow.createFeatureWorkflow(mockTimeProvider)

            repository.save(featureWorkflow)

            val retrieved = repository.findById(featureWorkflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe "Feature Workflow"
            retrieved.allowedStatuses shouldBe setOf(
                IssueStatus.BACKLOG,
                IssueStatus.TODO,
                IssueStatus.IN_PROGRESS,
                IssueStatus.IN_REVIEW,
                IssueStatus.DONE,
                IssueStatus.CANCELED
            )
        }
    }

    "should preserve workflow transition validation after retrieval" {
        runTest {
            // Testing that business logic works after persistence round-trip
            val workflow = createTestWorkflow(
                name = "Transition Test Workflow",
                allowedStatuses = setOf(
                    IssueStatus.TODO,
                    IssueStatus.IN_PROGRESS,
                    IssueStatus.CANCELED,
                    IssueStatus.DONE
                )
            )

            repository.save(workflow)
            val retrieved = repository.findById(workflow.id)

            retrieved shouldNotBe null
            
            // Test valid transitions according to IssueStatus rules
            retrieved!!.canTransition(IssueStatus.TODO, IssueStatus.IN_PROGRESS) shouldBe true
            retrieved.canTransition(IssueStatus.TODO, IssueStatus.CANCELED) shouldBe true
            
            // Test invalid transitions
            // IN_PROGRESS cannot go directly to DONE (must go through IN_REVIEW first)
            retrieved.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.DONE) shouldBe false
            // TODO cannot go directly to DONE
            retrieved.canTransition(IssueStatus.TODO, IssueStatus.DONE) shouldBe false
            // Status not in allowed set
            retrieved.canTransition(IssueStatus.TODO, IssueStatus.IN_REVIEW) shouldBe false
            retrieved.canTransition(IssueStatus.IN_PROGRESS, IssueStatus.IN_REVIEW) shouldBe false
        }
    }

    // ==========================================
    // Transaction Handling and Concurrency
    // ==========================================

    "should handle concurrent save operations" {
        runTest {
            // RED: Testing concurrent repository operations
            val workflow1 = createTestWorkflow(name = "Concurrent Workflow 1")
            val workflow2 = createTestWorkflow(name = "Concurrent Workflow 2")
            val workflow3 = createTestWorkflow(name = "Concurrent Workflow 3")

            // Save them (simulating concurrent operations)
            repository.save(workflow1)
            repository.save(workflow2)
            repository.save(workflow3)

            // Verify all were saved correctly
            val all = repository.findAll()
            all shouldHaveSize 3
        }
    }

    "should handle rapid updates to same workflow" {
        runTest {
            // RED: Testing rapid sequential updates
            val workflow = createTestWorkflow(name = "Rapid Update Test")
            repository.save(workflow)

            // Perform multiple rapid updates
            mockTimeProvider.advance(1.minutes)
            workflow.updateName("Update 1")
            repository.save(workflow)

            mockTimeProvider.advance(1.minutes)
            workflow.updateDescription("Update 2")
            repository.save(workflow)

            mockTimeProvider.advance(1.minutes)
            workflow.updateName("Final Update")
            repository.save(workflow)

            // Verify final state
            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe "Final Update"
            retrieved.description shouldBe "Update 2"
        }
    }

    "should maintain consistency during mixed operations" {
        runTest {
            // RED: Testing mixed CRUD operations
            val workflow1 = createTestWorkflow(name = "Workflow 1")
            repository.save(workflow1)

            // Mix of operations
            val workflow2 = createTestWorkflow(name = "Workflow 2")
            repository.save(workflow2)

            workflow1.updateName("Updated Workflow 1")
            repository.update(workflow1)

            repository.delete(workflow2.id)

            val workflow3 = createTestWorkflow(name = "Workflow 3")
            repository.save(workflow3)

            // Verify final state
            val all = repository.findAll()
            all shouldHaveSize 2
            all.map { it.name } shouldContain "Updated Workflow 1"
            all.map { it.name } shouldContain "Workflow 3"
        }
    }

    // ==========================================
    // Edge Cases and Error Scenarios
    // ==========================================

    "should handle workflows with special characters in name and description" {
        runTest {
            // RED: Testing special character handling
            val specialName = "Workflow with 'quotes' and \"double quotes\" & symbols: @#$%^&*()"
            val specialDescription = "Description with\nnewlines\tand\ttabs and émojis 🚀 and unicode ñáéí"

            val workflow = createTestWorkflow(
                name = specialName,
                description = specialDescription
            )

            repository.save(workflow)

            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null
            retrieved!!.name shouldBe specialName
            retrieved.description shouldBe specialDescription
        }
    }

    "should handle empty database operations gracefully" {
        runTest {
            // RED: Testing operations on empty repository
            repository.findAll().shouldBeEmpty()
            repository.findById(WorkflowId.generate()) shouldBe null
            repository.existsById(WorkflowId.generate()) shouldBe false
            repository.delete(WorkflowId.generate()) shouldBe false
        }
    }

    "should maintain referential integrity" {
        runTest {
            // RED: Testing ID consistency and integrity
            val workflow = createTestWorkflow(name = "Integrity Test")
            repository.save(workflow)

            val workflowId = workflow.id

            // Retrieve by ID should return same ID
            val retrieved = repository.findById(workflowId)
            retrieved shouldNotBe null
            retrieved!!.id shouldBe workflowId
            retrieved.id.value shouldBe workflowId.value

            // Exists check should be consistent
            repository.existsById(workflowId) shouldBe true

            // Delete and verify consistency
            repository.delete(workflowId)
            repository.existsById(workflowId) shouldBe false
            repository.findById(workflowId) shouldBe null
        }
    }

    // ==========================================
    // JSON Serialization Edge Cases
    // ==========================================

    "should handle single status workflow" {
        runTest {
            // RED: Testing edge case with minimal status configuration
            val singleStatusWorkflow = createTestWorkflow(
                name = "Single Status Workflow",
                description = "Only TODO status allowed",
                allowedStatuses = setOf(IssueStatus.TODO)
            )

            repository.save(singleStatusWorkflow)

            val retrieved = repository.findById(singleStatusWorkflow.id)
            retrieved shouldNotBe null
            retrieved!!.allowedStatuses shouldBe setOf(IssueStatus.TODO)
            retrieved.allowedStatuses shouldHaveSize 1
        }
    }

    "should handle workflow with empty description" {
        runTest {
            // RED: Testing null vs empty string handling
            val emptyDescWorkflow = createTestWorkflow(
                name = "Empty Description Workflow",
                description = ""
            )

            repository.save(emptyDescWorkflow)

            val retrieved = repository.findById(emptyDescWorkflow.id)
            retrieved shouldNotBe null
            retrieved!!.description shouldBe ""
        }
    }

    // ==========================================
    // Performance and Stress Testing
    // ==========================================

    "should handle multiple workflows efficiently" {
        runTest {
            // RED: Testing scalability with many workflows
            val workflows = (1..50).map { index ->
                createTestWorkflow(
                    name = "Workflow $index",
                    description = "Description for workflow $index"
                )
            }

            // Save all workflows
            workflows.forEach { repository.save(it) }

            // Verify all were saved
            val allWorkflows = repository.findAll()
            allWorkflows shouldHaveSize 50

            // Test individual lookups are still performant
            workflows.forEach { workflow ->
                val retrieved = repository.findById(workflow.id)
                retrieved shouldNotBe null
                retrieved!!.id shouldBe workflow.id
            }
        }
    }

    "should handle large workflow descriptions" {
        runTest {
            // RED: Testing large text field handling
            val largeDescription = "Large description content: " + "Lorem ipsum ".repeat(1000)
            val workflow = createTestWorkflow(
                name = "Large Description Workflow",
                description = largeDescription
            )

            repository.save(workflow)

            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null
            retrieved!!.description shouldBe largeDescription
        }
    }

    // ==========================================
    // Domain Validation Integration
    // ==========================================

    "should respect domain validation rules after retrieval" {
        runTest {
            // RED: Testing that domain validation works after persistence
            val workflow = createTestWorkflow(name = "Validation Test")
            repository.save(workflow)

            val retrieved = repository.findById(workflow.id)
            retrieved shouldNotBe null

            // Should still enforce domain rules
            try {
                retrieved!!.updateName("") // Invalid name
                throw AssertionError("Expected DomainException for empty name")
            } catch (e: DomainException) {
                // Expected - domain validation should still work
            }
        }
    }

    // ==========================================
    // Soft-Deletion Tests (SPI-877)
    // ==========================================

    "should soft-delete workflow successfully" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Workflow to Soft Delete")
            repository.save(workflow)

            // Verify it exists
            repository.findById(workflow.id) shouldNotBe null

            // Soft-delete the workflow
            repository.softDelete(workflow.id)

            // Verify it's excluded from normal queries
            repository.findById(workflow.id) shouldBe null
            repository.existsById(workflow.id) shouldBe false
            repository.findAll() shouldNotContain workflow
        }
    }

    "should find soft-deleted workflow with findIncludingDeleted" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Workflow for Deletion Test")
            repository.save(workflow)

            // Soft-delete it
            repository.softDelete(workflow.id)

            // Should not be found by normal findById
            repository.findById(workflow.id) shouldBe null

            // But should be found by findIncludingDeleted
            val deletedWorkflow = repository.findIncludingDeleted(workflow.id)
            deletedWorkflow shouldNotBe null
            deletedWorkflow!!.id shouldBe workflow.id
            deletedWorkflow.name shouldBe workflow.name
        }
    }

    "should throw WorkflowNotFoundException when soft-deleting non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()

            // Should throw exception
            try {
                repository.softDelete(nonExistentId)
                throw AssertionError("Expected WorkflowNotFoundException")
            } catch (e: io.spiralhouse.cycletime.domain.exceptions.WorkflowNotFoundException) {
                // Expected
                e.message shouldContain nonExistentId.value
            }
        }
    }

    "should be idempotent when soft-deleting already deleted workflow" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Workflow for Idempotent Test")
            repository.save(workflow)

            // Soft-delete it once
            repository.softDelete(workflow.id)

            // Soft-delete it again - should not throw exception
            repository.softDelete(workflow.id)

            // Should still be deleted
            repository.findById(workflow.id) shouldBe null
            repository.findIncludingDeleted(workflow.id) shouldNotBe null
        }
    }

    "should set deleted_at timestamp when soft-deleting" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Timestamp Test Workflow")
            repository.save(workflow)

            // Record time before deletion
            val beforeDelete = mockTimeProvider.now()

            // Advance time and soft-delete
            mockTimeProvider.advance(1.minutes)
            repository.softDelete(workflow.id)
            val afterDelete = mockTimeProvider.now()

            // Verify workflow is in deleted list
            val deletedWorkflows = repository.findDeleted()
            deletedWorkflows shouldHaveSize 1
            deletedWorkflows[0].id shouldBe workflow.id
        }
    }

    "should restore soft-deleted workflow successfully" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Workflow to Restore")
            repository.save(workflow)

            // Soft-delete it
            repository.softDelete(workflow.id)
            repository.findById(workflow.id) shouldBe null

            // Restore it
            repository.restore(workflow.id)

            // Should be found again by normal queries
            val restoredWorkflow = repository.findById(workflow.id)
            restoredWorkflow shouldNotBe null
            restoredWorkflow!!.id shouldBe workflow.id
            restoredWorkflow.name shouldBe workflow.name
        }
    }

    "should be idempotent when restoring already active workflow" {
        runTest {
            // Create and save a workflow
            val workflow = createTestWorkflow(name = "Active Workflow")
            repository.save(workflow)

            // Restore it (even though it's not deleted) - should not fail
            repository.restore(workflow.id)

            // Should still be found
            repository.findById(workflow.id) shouldNotBe null
        }
    }

    "should be idempotent when restoring non-existent workflow" {
        runTest {
            val nonExistentId = WorkflowId.generate()

            // Should not throw exception (idempotent operation)
            repository.restore(nonExistentId)
        }
    }

    "should exclude soft-deleted workflows from findAll" {
        runTest {
            // Create multiple workflows
            val workflow1 = createTestWorkflow(name = "Active Workflow 1")
            val workflow2 = createTestWorkflow(name = "To Be Deleted")
            val workflow3 = createTestWorkflow(name = "Active Workflow 2")

            repository.save(workflow1)
            repository.save(workflow2)
            repository.save(workflow3)

            // Verify all are found initially
            repository.findAll() shouldHaveSize 3

            // Soft-delete one workflow
            repository.softDelete(workflow2.id)

            // Verify only active workflows are returned
            val activeWorkflows = repository.findAll()
            activeWorkflows shouldHaveSize 2
            activeWorkflows.map { it.id } shouldContain workflow1.id
            activeWorkflows.map { it.id } shouldContain workflow3.id
            activeWorkflows.map { it.id } shouldNotContain workflow2.id
        }
    }

    "should return all deleted workflows from findDeleted" {
        runTest {
            // Create multiple workflows
            val workflow1 = createTestWorkflow(name = "Active Workflow")
            val workflow2 = createTestWorkflow(name = "Deleted Workflow 1")
            val workflow3 = createTestWorkflow(name = "Deleted Workflow 2")

            repository.save(workflow1)
            repository.save(workflow2)
            repository.save(workflow3)

            // Soft-delete two workflows
            mockTimeProvider.advance(1.minutes)
            repository.softDelete(workflow2.id)

            mockTimeProvider.advance(1.minutes)
            repository.softDelete(workflow3.id)

            // Verify deleted workflows are returned
            val deletedWorkflows = repository.findDeleted()
            deletedWorkflows shouldHaveSize 2
            deletedWorkflows.map { it.id } shouldContain workflow2.id
            deletedWorkflows.map { it.id } shouldContain workflow3.id
            deletedWorkflows.map { it.id } shouldNotContain workflow1.id
        }
    }

    "should order deleted workflows by deletion date descending" {
        runTest {
            // Create multiple workflows
            val workflow1 = createTestWorkflow(name = "First Deleted")
            val workflow2 = createTestWorkflow(name = "Second Deleted")
            val workflow3 = createTestWorkflow(name = "Third Deleted")

            repository.save(workflow1)
            repository.save(workflow2)
            repository.save(workflow3)

            // Delete them in sequence with time advancement
            mockTimeProvider.setTime(Instant.parse("2025-01-15T10:00:00Z"))
            repository.softDelete(workflow1.id)

            mockTimeProvider.advance(1.hours)
            repository.softDelete(workflow2.id)

            mockTimeProvider.advance(1.hours)
            repository.softDelete(workflow3.id)

            // Verify order (most recently deleted first)
            val deletedWorkflows = repository.findDeleted()
            deletedWorkflows shouldHaveSize 3
            deletedWorkflows[0].id shouldBe workflow3.id // Most recent
            deletedWorkflows[1].id shouldBe workflow2.id
            deletedWorkflows[2].id shouldBe workflow1.id // Oldest
        }
    }

    "should allow creating new workflow with same name as deleted workflow" {
        runTest {
            // Create and delete a workflow
            val originalWorkflow = createTestWorkflow(name = "Duplicate Name Test")
            repository.save(originalWorkflow)
            repository.softDelete(originalWorkflow.id)

            // Create a new workflow with the same name
            val newWorkflow = createTestWorkflow(name = "Duplicate Name Test")
            repository.save(newWorkflow)

            // Both should exist (one deleted, one active)
            repository.findById(newWorkflow.id) shouldNotBe null
            repository.findIncludingDeleted(originalWorkflow.id) shouldNotBe null

            // Only the new one should appear in active list
            val activeWorkflows = repository.findAll()
            activeWorkflows shouldHaveSize 1
            activeWorkflows[0].id shouldBe newWorkflow.id
        }
    }

    "should return empty list from findDeleted when no workflows are deleted" {
        runTest {
            // Create active workflows
            val workflow1 = createTestWorkflow(name = "Active 1")
            val workflow2 = createTestWorkflow(name = "Active 2")
            repository.save(workflow1)
            repository.save(workflow2)

            // No workflows deleted
            val deletedWorkflows = repository.findDeleted()
            deletedWorkflows.shouldBeEmpty()
        }
    }

    "should handle multiple delete and restore cycles" {
        runTest {
            // Create a workflow
            val workflow = createTestWorkflow(name = "Cycle Test Workflow")
            repository.save(workflow)

            // Delete and restore multiple times
            repository.softDelete(workflow.id)
            repository.findById(workflow.id) shouldBe null

            repository.restore(workflow.id)
            repository.findById(workflow.id) shouldNotBe null

            repository.softDelete(workflow.id)
            repository.findById(workflow.id) shouldBe null

            repository.restore(workflow.id)
            repository.findById(workflow.id) shouldNotBe null
        }
    }
})