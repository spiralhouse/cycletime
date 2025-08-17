package com.spiralhouse.jcvd.infrastructure.database

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
    val projectId = varchar("project_id", 100).references(ProjectsTable.id)
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
    val sessionKey = varchar("session_key", 100).uniqueIndex()
    val projectId = varchar("project_id", 100).references(ProjectsTable.id).nullable()
    val currentContext = text("current_context").nullable()
    val lastActivity = timestamp("last_activity")
    val createdAt = timestamp("created_at")
    val updatedAt = timestamp("updated_at")
    
    override val primaryKey = PrimaryKey(id)
    
    init {
        index(false, sessionKey)
        index(false, lastActivity)
        index(false, projectId)
    }
}