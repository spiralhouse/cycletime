package io.spiralhouse.cycletime.infrastructure.database

import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.dao.id.IdTable
import org.jetbrains.exposed.sql.Column
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.kotlin.datetime.timestamp

object ProjectsTable : IdTable<String>("projects") {
    override val id: Column<EntityID<String>> = varchar("id", 100).entityId()
    val name = varchar("name", 255)
    val description = text("description").nullable()
    val status = varchar("status", 50).default("active")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)
}

object IssuesTable : IdTable<String>("issues") {
    override val id: Column<EntityID<String>> = varchar("id", 100).entityId()
    val projectId = varchar("project_id", 100).references(ProjectsTable.id).nullable()
    val parentId = varchar("parent_id", 100).references(IssuesTable.id).nullable()
    val title = varchar("title", 255)
    val description = text("description").nullable()
    val type = varchar("issue_type", 20)
    val status = varchar("status", 50).default("todo")
    val priority = integer("priority").default(0)
    val estimate = integer("estimate").nullable()
    val assigneeId = varchar("assignee_id", 100).nullable()
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, projectId)
        index(false, parentId)
        index(false, status)
        index(false, assigneeId)
        index(false, projectId, type, status)
    }
}

object IssueDependenciesTable : Table("issue_dependencies") {
    val id = varchar("id", 100)
    val blockerId = varchar("blocker_id", 100).references(IssuesTable.id)
    val blockedId = varchar("blocked_id", 100).references(IssuesTable.id)
    val dependencyType = varchar("dependency_type", 20).default("blocks")
    val createdAt = timestamp("created_at")

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(blockerId, blockedId)
        index(false, blockerId)
        index(false, blockedId)
    }
}

object IssueLabelsTable : Table("issue_labels") {
    val issueId = varchar("issue_id", 100).references(IssuesTable.id)
    val label = varchar("label", 100)

    override val primaryKey = PrimaryKey(issueId, label)

    init {
        index(false, issueId)
        index(false, label)
    }
}

object SessionStatesTable : IdTable<String>("session_states") {
    override val id: Column<EntityID<String>> = varchar("id", 100).entityId()
    val sessionKey = varchar("session_key", 100)
    val projectId = varchar("project_id", 100).references(ProjectsTable.id).nullable()
    val currentContext = text("current_context").nullable()
    val lastActivity = timestamp("last_activity")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(sessionKey)
        index(false, lastActivity)
        index(false, projectId)
    }
}

object WorkflowsTable : IdTable<String>("workflows") {
    override val id: Column<EntityID<String>> = varchar("id", 100).entityId()
    val name = varchar("name", 255)
    val description = text("description").nullable()
    val initialStatus = varchar("initial_status", 50)
    val allowedStatuses = text("allowed_statuses") // JSON array of status names
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")

    override val primaryKey = PrimaryKey(id)

    init {
        index(false, name)
        index(false, initialStatus)
    }
}

/**
 * Central registry for all database tables.
 *
 * This ensures compile-time safety - if a table is added to the codebase
 * but not registered here, it won't be created in the schema.
 *
 * IMPORTANT: Tables are listed in dependency order:
 * 1. Independent tables first (no foreign keys)
 * 2. Dependent tables after their dependencies
 *
 * This ordering is critical for schema creation to avoid foreign key errors.
 */
object TableRegistry {
    /**
     * All tables in dependency order.
     * When adding a new table:
     * 1. Add the table object to Tables.kt
     * 2. Add it to this list in the correct position based on dependencies
     * 3. That's it! DatabaseConfig and TestSupport will automatically use it
     */
    val ALL_TABLES = listOf(
        // Independent tables (no foreign keys)
        ProjectsTable,
        WorkflowsTable,

        // Tables with dependencies on ProjectsTable
        IssuesTable,        // References ProjectsTable
        SessionStatesTable, // References ProjectsTable

        // Tables with dependencies on IssuesTable
        IssueDependenciesTable, // References IssuesTable
        IssueLabelsTable        // References IssuesTable
    )

    /**
     * Validates that all table objects are registered.
     * Could be extended with compile-time checks via annotation processing.
     */
    fun validate() {
        val tableNames = ALL_TABLES.map { it.tableName }.toSet()
        val duplicates = ALL_TABLES.groupingBy { it.tableName }
            .eachCount()
            .filter { it.value > 1 }
            .keys

        require(duplicates.isEmpty()) {
            "Duplicate table names found in registry: $duplicates"
        }
    }
}
