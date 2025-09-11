package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import org.jetbrains.exposed.sql.Database

/**
 * Mock implementation of WorkflowRepository for unit testing.
 *
 * This mock provides a controlled environment for testing Application Services
 * without dependencies on the database or Exposed ORM. It maintains test data
 * in memory and allows for precise control over return values and behavior.
 *
 * ## Design Features:
 * - **Constructor Compatibility**: Matches ExposedWorkflowRepository constructor
 * - **In-Memory Storage**: Uses mutable collections for test data
 * - **CRUD Operations**: Supports full Create, Read, Update, Delete operations
 * - **Configurable Behavior**: Methods can be overridden to return specific values
 * - **Reset Capability**: Clear all test data between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockWorkflowRepository = MockWorkflowRepository()
 *     // Pre-populate with test data as needed
 *     mockWorkflowRepository.workflows[workflowId] = testWorkflow
 * }
 * ```
 *
 * @property timeProvider The time provider for entity reconstitution (unused in mock)
 * @property database The database reference (unused in mock)
 */
class MockWorkflowRepository(
    private val timeProvider: TimeProvider? = null,
    private val database: Database? = null
) : WorkflowRepository {
    
    // ================================================================================
    // Test Data Storage
    // ================================================================================
    
    /**
     * In-memory storage for workflows keyed by WorkflowId.
     * Direct access allows tests to pre-populate or inspect state.
     */
    val workflows: MutableMap<WorkflowId, Workflow> = mutableMapOf()
    
    /**
     * Counter for tracking method calls during testing.
     */
    var saveCallCount: Int = 0
    var updateCallCount: Int = 0
    var deleteCallCount: Int = 0
    var findCallCount: Int = 0
    
    // ================================================================================
    // Repository Interface Implementation
    // ================================================================================
    
    override suspend fun save(workflow: Workflow): Workflow {
        saveCallCount++
        workflows[workflow.id] = workflow
        return workflow
    }
    
    override suspend fun findById(id: WorkflowId): Workflow? {
        findCallCount++
        return workflows[id]
    }
    
    override suspend fun findAll(): List<Workflow> {
        findCallCount++
        return workflows.values.toList()
    }
    
    override suspend fun update(workflow: Workflow): Workflow {
        updateCallCount++
        workflows[workflow.id] = workflow
        return workflow
    }
    
    override suspend fun delete(id: WorkflowId): Boolean {
        deleteCallCount++
        return workflows.remove(id) != null
    }
    
    override suspend fun existsById(id: WorkflowId): Boolean {
        return workflows.containsKey(id)
    }
    
    // ================================================================================
    // Test Utilities
    // ================================================================================
    
    /**
     * Resets all test data and counters to initial state.
     * Call this in beforeEach to ensure test isolation.
     */
    fun reset() {
        workflows.clear()
        saveCallCount = 0
        updateCallCount = 0
        deleteCallCount = 0
        findCallCount = 0
    }
    
    /**
     * Pre-populates the repository with test workflows.
     * Convenience method for test setup.
     */
    fun addTestWorkflows(vararg workflows: Workflow) {
        workflows.forEach { workflow ->
            this.workflows[workflow.id] = workflow
        }
    }
    
    /**
     * Returns the total number of method calls made to this mock.
     * Useful for verifying expected interaction patterns.
     */
    fun getTotalCallCount(): Int {
        return saveCallCount + updateCallCount + deleteCallCount + findCallCount
    }
    
    /**
     * Helper methods to simulate repository exceptions for testing error handling.
     * Set these to throw specific exceptions during operations.
     */
    var saveException: Exception? = null
    var updateException: Exception? = null
    var findException: Exception? = null
    var deleteException: Exception? = null
    
    /**
     * Methods to configure the mock to throw exceptions for testing error paths.
     */
    fun throwOnSave(exception: Exception) {
        saveException = exception
    }
    
    fun throwOnUpdate(exception: Exception) {
        updateException = exception
    }
    
    fun throwOnFind(exception: Exception) {
        findException = exception
    }
    
    fun throwOnDelete(exception: Exception) {
        deleteException = exception
    }
}