package io.spiralhouse.cycletime.domain.repositories

/**
 * Unit of Work interface for transaction management.
 *
 * Defines the contract for transaction coordination without coupling
 * to specific infrastructure implementations. This enables testability
 * through dependency injection and follows Domain-Driven Design principles.
 *
 * ## Design Principles:
 * - **Transaction Boundary**: Clear demarcation of transactional operations
 * - **Infrastructure Agnostic**: No dependencies on specific database technologies
 * - **Testability**: Easily mockable for unit testing
 * - **Consistency**: All methods are suspend functions for async compatibility
 *
 * ## Implementation Notes:
 * - Concrete implementations should handle rollback on exceptions
 * - All operations within execute() should be atomic
 * - Multiple calls to execute() may be nested depending on implementation
 */
interface UnitOfWork {
    
    /**
     * Executes a block of operations within a transactional boundary.
     *
     * All operations within the block will be committed together,
     * or rolled back if any exception occurs.
     *
     * @param block The block of operations to execute
     * @return The result of the block execution
     * @throws Exception If any operation within the block fails
     */
    suspend fun <T> execute(block: suspend () -> T): T
}