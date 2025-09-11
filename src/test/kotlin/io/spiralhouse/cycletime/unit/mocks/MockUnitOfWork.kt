package io.spiralhouse.cycletime.unit.mocks

import org.jetbrains.exposed.sql.Database

/**
 * Mock implementation of UnitOfWork for unit testing.
 *
 * This mock provides a controlled environment for testing Application Services
 * without dependencies on database transactions. It simply executes the provided
 * blocks while tracking call counts and providing exception simulation capabilities.
 *
 * ## Design Features:
 * - **Constructor Compatibility**: Matches ExposedUnitOfWork constructor
 * - **Simple Execution**: Executes blocks directly without transaction overhead
 * - **Call Tracking**: Counts method invocations for verification
 * - **Exception Simulation**: Can be configured to throw exceptions for testing error paths
 * - **Reset Capability**: Clear all counters between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockUnitOfWork = MockUnitOfWork()
 * }
 * 
 * // Test normal execution
 * val result = mockUnitOfWork.execute { "test result" }
 * 
 * // Test exception handling
 * mockUnitOfWork.throwOnExecute(RuntimeException("Test error"))
 * assertThrows<RuntimeException> {
 *     mockUnitOfWork.execute { "this will fail" }
 * }
 * ```
 *
 * @property database The database reference (unused in mock)
 */
class MockUnitOfWork(
    private val database: Database? = null
) {
    
    // ================================================================================
    // Test Data Tracking
    // ================================================================================
    
    /**
     * Counter for tracking execute() method calls during testing.
     */
    var executeCallCount: Int = 0
    
    /**
     * Exception to throw during execute() calls for testing error handling.
     * Set this to simulate transaction failures.
     */
    var executeException: Exception? = null
    
    // ================================================================================
    // UnitOfWork Interface Implementation
    // ================================================================================
    
    /**
     * Executes the provided block, simulating transactional behavior.
     *
     * In a real implementation, this would wrap the block in a database transaction.
     * For testing purposes, this simply executes the block directly while tracking
     * the call count and potentially throwing configured exceptions.
     *
     * @param block The block of code to execute
     * @return The result of executing the block
     * @throws Exception If executeException is configured, throws that exception instead
     */
    suspend fun <T> execute(block: suspend () -> T): T {
        executeCallCount++
        
        // Simulate exception if configured
        executeException?.let { exception ->
            throw exception
        }
        
        // Execute the block directly (no actual transaction management)
        return block()
    }
    
    /**
     * Legacy transaction management methods - throws UnsupportedOperationException.
     *
     * These methods match the ExposedUnitOfWork interface but are not supported
     * in either the production or mock implementation. They exist to maintain
     * interface compatibility while clearly indicating the unsupported operations.
     */
    suspend fun begin() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported in MockUnitOfWork. " +
            "Use the execute() method instead, which properly handles test execution."
        )
    }
    
    suspend fun commit() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported in MockUnitOfWork. " +
            "Use the execute() method instead, which properly handles test execution."
        )
    }
    
    suspend fun rollback() {
        throw UnsupportedOperationException(
            "Manual transaction management is not supported in MockUnitOfWork. " +
            "Use the execute() method instead, which properly handles test execution."
        )
    }
    
    // ================================================================================
    // Test Utilities
    // ================================================================================
    
    /**
     * Resets all counters and exception configuration to initial state.
     * Call this in beforeEach to ensure test isolation.
     */
    fun reset() {
        executeCallCount = 0
        executeException = null
    }
    
    /**
     * Configures the mock to throw an exception on the next execute() call.
     * Useful for testing error handling paths in application services.
     *
     * @param exception The exception to throw
     */
    fun throwOnExecute(exception: Exception) {
        executeException = exception
    }
    
    /**
     * Clears any configured exception, allowing normal execution to resume.
     */
    fun clearException() {
        executeException = null
    }
    
    /**
     * Returns whether an exception is configured to be thrown on execute().
     */
    fun willThrowException(): Boolean {
        return executeException != null
    }
}