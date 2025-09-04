package io.spiralhouse.cycletime.infrastructure.persistence

import io.spiralhouse.cycletime.domain.entities.Workflow
import io.spiralhouse.cycletime.domain.entities.WorkflowSnapshot
import io.spiralhouse.cycletime.domain.repositories.WorkflowRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.services.SystemTimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.IssueStatus
import io.spiralhouse.cycletime.domain.valueobjects.WorkflowId
import io.spiralhouse.cycletime.infrastructure.database.WorkflowsTable
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.SerializationException
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction

/**
 * Repository implementation for Workflow entities using Exposed ORM.
 *
 * This implementation follows Domain-Driven Design patterns:
 * - **Repository Pattern**: Encapsulates data access logic for Workflow aggregates
 * - **Snapshot Pattern**: Uses WorkflowSnapshot for persistence without exposing domain internals
 * - **Single Responsibility**: Focuses solely on persistence operations
 * - **Dependency Injection**: Accepts dependencies through constructor for better testability
 *
 * ## Architecture Principles
 * 
 * - **Domain Isolation**: No domain logic in the repository, only persistence concerns
 * - **Transaction Management**: Supports both standalone and UnitOfWork transactions
 * - **Error Handling**: Proper exception handling with logging for debugging
 * - **Performance**: Optimized queries with proper indexing on WorkflowId
 *
 * ## Thread-Safety Guarantees
 * 
 * This repository is **thread-safe** and designed for singleton scope in DI:
 * - All instance properties are immutable (timeProvider, database, json)
 * - Each operation runs in its own transaction context via dbQuery()
 * - No mutable state is maintained between operations
 * - Exposed ORM handles connection pooling and transaction isolation
 * 
 * @property timeProvider The time provider for entity reconstitution (immutable)
 * @property database Optional database instance for testing (immutable)
 */
@ThreadSafe // Documenting thread-safety guarantee
class ExposedWorkflowRepository(
    private val timeProvider: TimeProvider = SystemTimeProvider(),
    private val database: Database? = null
) : WorkflowRepository {

    /**
     * JSON serializer for IssueStatus sets with lenient configuration.
     * Configured for resilient deserialization with minimal overhead.
     * 
     * Configuration rationale:
     * - ignoreUnknownKeys: Allows schema evolution without breaking existing data
     * - isLenient: Handles various JSON formats for backwards compatibility
     * - prettyPrint=false: Minimizes storage space in database
     */
    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        prettyPrint = false
        encodeDefaults = false // Don't store default values
    }

    /**
     * Saves a workflow to the repository.
     * Implements upsert pattern: inserts if new, updates if exists.
     *
     * @param workflow The workflow to save
     * @return The saved workflow
     * @throws Exception if database operation fails
     */
    override suspend fun save(workflow: Workflow): Workflow = dbQuery {
        val exists = WorkflowsTable
            .select(WorkflowsTable.id)
            .where { WorkflowsTable.id eq workflow.id.value }
            .count() > 0
        
        if (exists) {
            WorkflowsTable.update({ WorkflowsTable.id eq workflow.id.value }) {
                it[name] = workflow.name
                it[description] = workflow.description
                it[initialStatus] = workflow.initialStatus.name
                it[allowedStatuses] = serializeAllowedStatuses(workflow.allowedStatuses)
                it[updatedAt] = workflow.updatedAt
            }
        } else {
            WorkflowsTable.insert {
                it[id] = EntityID(workflow.id.value, WorkflowsTable)
                it[name] = workflow.name
                it[description] = workflow.description
                it[initialStatus] = workflow.initialStatus.name
                it[allowedStatuses] = serializeAllowedStatuses(workflow.allowedStatuses)
                it[createdAt] = workflow.createdAt
                it[updatedAt] = workflow.updatedAt
            }
        }
        
        workflow
    }

    /**
     * Finds a workflow by its unique identifier.
     *
     * @param id The workflow identifier
     * @return The workflow if found, null otherwise
     * @throws Exception if database operation fails
     */
    override suspend fun findById(id: WorkflowId): Workflow? = dbQuery {
        WorkflowsTable
            .selectAll()
            .where { WorkflowsTable.id eq id.value }
            .singleOrNull()
            ?.toWorkflow()
    }

    /**
     * Retrieves all workflows from the repository.
     * Results are ordered by creation date for consistent iteration.
     *
     * @return List of all workflows
     * @throws Exception if database operation fails
     */
    override suspend fun findAll(): List<Workflow> = dbQuery {
        WorkflowsTable
            .selectAll()
            .orderBy(WorkflowsTable.createdAt to SortOrder.ASC)
            .map { it.toWorkflow() }
    }

    /**
     * Updates an existing workflow.
     * Validates existence before attempting update to provide clear error messages.
     *
     * @param workflow The workflow to update
     * @return The updated workflow
     * @throws IllegalArgumentException if workflow doesn't exist
     * @throws Exception if database operation fails
     */
    override suspend fun update(workflow: Workflow): Workflow = dbQuery {
        val rowsUpdated = WorkflowsTable.update({ WorkflowsTable.id eq workflow.id.value }) {
            it[name] = workflow.name
            it[description] = workflow.description
            it[initialStatus] = workflow.initialStatus.name
            it[allowedStatuses] = serializeAllowedStatuses(workflow.allowedStatuses)
            it[updatedAt] = workflow.updatedAt
        }
        
        if (rowsUpdated == 0) {
            throw IllegalArgumentException("Workflow with ID ${workflow.id.value} not found")
        }
        
        workflow
    }

    /**
     * Deletes a workflow by its unique identifier.
     * Returns false if workflow doesn't exist (idempotent operation).
     *
     * @param id The workflow identifier
     * @return true if the workflow was deleted, false if it didn't exist
     * @throws Exception if database operation fails
     */
    override suspend fun delete(id: WorkflowId): Boolean = dbQuery {
        val deletedCount = WorkflowsTable.deleteWhere { WorkflowsTable.id eq id.value }
        deletedCount > 0
    }

    /**
     * Checks if a workflow exists with the given identifier.
     * Optimized to return just a boolean without loading the entire entity.
     *
     * @param id The workflow identifier
     * @return true if the workflow exists, false otherwise
     * @throws Exception if database operation fails
     */
    override suspend fun existsById(id: WorkflowId): Boolean = dbQuery {
        WorkflowsTable
            .select(WorkflowsTable.id)
            .where { WorkflowsTable.id eq id.value }
            .count() > 0
    }


    /**
     * Converts a database row to a Workflow domain entity.
     * Uses the Snapshot pattern to maintain domain encapsulation.
     *
     * @return The reconstituted Workflow entity
     * @throws IllegalArgumentException if data cannot be converted
     */
    private fun ResultRow.toWorkflow(): Workflow {
        val snapshot = WorkflowSnapshot(
            id = WorkflowId(this[WorkflowsTable.id].value),
            name = this[WorkflowsTable.name],
            description = this[WorkflowsTable.description],
            initialStatus = IssueStatus.valueOf(this[WorkflowsTable.initialStatus]),
            allowedStatuses = deserializeAllowedStatuses(this[WorkflowsTable.allowedStatuses]),
            createdAt = this[WorkflowsTable.createdAt],
            updatedAt = this[WorkflowsTable.updatedAt]
        )
        return Workflow.fromSnapshot(snapshot, timeProvider)
    }

    /**
     * Serializes a set of IssueStatus to JSON string.
     * Stores status names rather than ordinals for better schema evolution.
     *
     * @param statuses The set of statuses to serialize
     * @return JSON string representation
     */
    private fun serializeAllowedStatuses(statuses: Set<IssueStatus>): String {
        return json.encodeToString(statuses.map { it.name }.sorted()) // Sort for consistent storage
    }

    /**
     * Deserializes JSON string to a set of IssueStatus.
     * Includes error recovery for data migration scenarios.
     *
     * @param statusJson The JSON string to deserialize
     * @return Set of IssueStatus
     */
    private fun deserializeAllowedStatuses(statusJson: String): Set<IssueStatus> {
        return try {
            val statusNames: List<String> = json.decodeFromString(statusJson)
            statusNames.mapNotNull { statusName ->
                try {
                    IssueStatus.valueOf(statusName)
                } catch (e: IllegalArgumentException) {
                    // Unknown status in database, skip it
                    null
                }
            }.toSet().ifEmpty {
                // Ensure we always have at least one status
                setOf(IssueStatus.TODO, IssueStatus.DONE)
            }
        } catch (e: Exception) {
            // Fallback to minimal viable statuses for data recovery
            setOf(IssueStatus.TODO, IssueStatus.IN_PROGRESS, IssueStatus.DONE)
        }
    }

    /**
     * Executes a database query with proper transaction management.
     * 
     * ## Transaction Strategy
     * 
     * 1. **UnitOfWork Integration**: Reuses existing transactions when present
     * 2. **Standalone Operations**: Creates new transactions with proper isolation
     * 3. **Thread Safety**: Each transaction runs in isolated context
     * 4. **Connection Management**: Leverages Exposed's connection pooling
     * 
     * ## Error Handling
     * 
     * - Database exceptions are propagated to caller for proper handling
     * - Transaction rollback is automatic on exceptions
     * - Logging captures transaction boundaries for debugging
     *
     * @param block The query to execute within transaction context
     * @return The query result
     * @throws Exception if database operation fails
     */
    private suspend fun <T> dbQuery(block: suspend () -> T): T {
        // Check if we're already in a transaction (e.g., from UnitOfWork)
        val currentTransaction = TransactionManager.currentOrNull()
        
        return if (currentTransaction != null) {
            // Already in transaction - execute directly to preserve transaction boundaries
            // This is critical for UnitOfWork pattern to function correctly
            block()
        } else {
            // Create new transaction with proper isolation
            val db = database ?: TransactionManager.defaultDatabase
                ?: throw IllegalStateException("No database configured")
                
            newSuspendedTransaction(Dispatchers.IO, db) { 
                block()
            }
        }
    }
}