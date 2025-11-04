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
import org.slf4j.LoggerFactory

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
    timeProvider: TimeProvider = SystemTimeProvider(),
    database: Database? = null
) : BaseExposedRepository(timeProvider, database), WorkflowRepository {

    companion object {
        private val logger = LoggerFactory.getLogger(ExposedWorkflowRepository::class.java)
    }

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
        val exists = checkExists(WorkflowsTable) { WorkflowsTable.id eq workflow.id.value }
        
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
     * Excludes soft-deleted workflows.
     *
     * @param id The workflow identifier
     * @return The workflow if found and not deleted, null otherwise
     * @throws Exception if database operation fails
     */
    override suspend fun findById(id: WorkflowId): Workflow? = dbQuery {
        WorkflowsTable
            .selectAll()
            .where {
                (WorkflowsTable.id eq id.value) and
                (WorkflowsTable.deletedAt.isNull())
            }
            .singleOrNull()
            ?.toWorkflow()
    }

    /**
     * Retrieves all workflows from the repository.
     * Excludes soft-deleted workflows.
     * Results are ordered by creation date for consistent iteration.
     *
     * @return List of all active workflows (excluding deleted)
     * @throws Exception if database operation fails
     */
    override suspend fun findAll(): List<Workflow> = dbQuery {
        WorkflowsTable
            .selectAll()
            .where { WorkflowsTable.deletedAt.isNull() }
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
     * Excludes soft-deleted workflows.
     * Optimized to return just a boolean without loading the entire entity.
     *
     * @param id The workflow identifier
     * @return true if the workflow exists and is not deleted, false otherwise
     * @throws Exception if database operation fails
     */
    override suspend fun existsById(id: WorkflowId): Boolean = dbQuery {
        checkExists(WorkflowsTable) {
            (WorkflowsTable.id eq id.value) and
            (WorkflowsTable.deletedAt.isNull())
        }
    }

    /**
     * Soft-deletes a workflow by setting the deleted_at timestamp.
     *
     * Workflows have no child entities, so no cascade operations are performed.
     * Unlike projects and issues, workflows do not own other entities.
     *
     * Future enhancement: Add validation to prevent deletion of workflows
     * assigned to active issues when workflow-issue assignment is implemented.
     *
     * @param id The workflow ID to soft-delete
     * @throws WorkflowNotFoundException if the workflow does not exist
     */
    override suspend fun softDelete(id: WorkflowId) {
        dbQuery {
            // 1. Verify workflow exists (throw exception if not)
            val exists = checkExists(WorkflowsTable) { WorkflowsTable.id eq id.value }

            if (!exists) {
                throw io.spiralhouse.cycletime.domain.exceptions.WorkflowNotFoundException(id.value)
            }

            // 2. Set deleted_at timestamp on workflow
            val now = timeProvider.now()
            WorkflowsTable.update({ WorkflowsTable.id eq id.value }) {
                it[deletedAt] = now
            }

            // No cascade operations - workflows have no child entities
            logger.info("Soft-deleted workflow ${id.value}")
        }
    }

    /**
     * Restores a soft-deleted workflow by clearing the deleted_at timestamp.
     *
     * This operation is idempotent - restoring an already active workflow
     * will succeed without error.
     *
     * @param id The workflow ID to restore
     */
    override suspend fun restore(id: WorkflowId) {
        dbQuery {
            // Idempotent restore - just clear deleted_at if set
            val updateCount = WorkflowsTable.update({
                WorkflowsTable.id eq id.value
            }) {
                it[deletedAt] = null
            }

            // Idempotent: If workflow doesn't exist or already active, updateCount will be 0 or 1
            if (updateCount > 0) {
                logger.info("Restored workflow ${id.value}")
            }
        }
    }

    /**
     * Finds all soft-deleted workflows.
     *
     * @return List of deleted workflows ordered by deletion date (most recent first)
     */
    override suspend fun findDeleted(): List<Workflow> = dbQuery {
        WorkflowsTable
            .selectAll()
            .where { WorkflowsTable.deletedAt.isNotNull() }
            .orderBy(WorkflowsTable.deletedAt to SortOrder.DESC)
            .map { it.toWorkflow() }
    }

    /**
     * Finds a workflow by ID, including soft-deleted workflows.
     *
     * Unlike findById(), this method does not filter by deleted_at status,
     * allowing retrieval of deleted workflows for restoration purposes.
     *
     * @param id The workflow ID to find
     * @return The workflow if found (including deleted), null otherwise
     */
    override suspend fun findIncludingDeleted(id: WorkflowId): Workflow? = dbQuery {
        WorkflowsTable
            .selectAll()
            .where { WorkflowsTable.id eq id.value }
            .singleOrNull()
            ?.toWorkflow()
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

}