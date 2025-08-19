package com.spiralhouse.jcvd.infrastructure.persistence

import com.spiralhouse.jcvd.domain.entities.Issue
import com.spiralhouse.jcvd.domain.repositories.IssueRepository
import com.spiralhouse.jcvd.domain.valueobjects.*
import com.spiralhouse.jcvd.infrastructure.database.IssueDependenciesTable
import com.spiralhouse.jcvd.infrastructure.database.IssueLabelsTable
import com.spiralhouse.jcvd.infrastructure.database.IssuesTable
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.dao.id.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.util.UUID

class ExposedIssueRepository : IssueRepository {
    
    override suspend fun findById(id: IssueId): Issue? = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.id eq id.value }
            .singleOrNull()
            ?.toIssue()
    }
    
    override suspend fun findByProject(projectId: ProjectId): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.projectId eq projectId.value }
            .map { it.toIssue() }
    }
    
    override suspend fun findByParent(parentId: IssueId): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.parentId eq parentId.value }
            .map { it.toIssue() }
    }
    
    override suspend fun findByStatus(status: IssueStatus): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.status eq status.value }
            .map { it.toIssue() }
    }
    
    override suspend fun findByType(type: IssueType): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.type eq type.value }
            .map { it.toIssue() }
    }
    
    override suspend fun findByAssignee(assigneeId: String): List<Issue> = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.assigneeId eq assigneeId }
            .map { it.toIssue() }
    }
    
    override suspend fun save(issue: Issue) = dbQuery {
        val exists = IssuesTable
            .selectAll()
            .where { IssuesTable.id eq issue.id.value }
            .count() > 0
        
        if (exists) {
            IssuesTable.update({ IssuesTable.id eq issue.id.value }) {
                it[title] = issue.title
                it[description] = issue.description
                it[status] = issue.status.value
                it[priority] = issue.priority
                it[estimate] = issue.estimate
                it[assigneeId] = issue.assigneeId
                it[updatedAt] = issue.updatedAt
            }
        } else {
            IssuesTable.insert {
                it[id] = EntityID(issue.id.value, IssuesTable)
                it[projectId] = issue.projectId.value
                it[parentId] = issue.parentId?.value
                it[title] = issue.title
                it[description] = issue.description
                it[type] = issue.type.value
                it[status] = issue.status.value
                it[priority] = issue.priority
                it[estimate] = issue.estimate
                it[assigneeId] = issue.assigneeId
                it[createdAt] = issue.createdAt
                it[updatedAt] = issue.updatedAt
            }
        }
        
        // Update dependencies
        saveDependencies(issue)
        
        // Update labels
        saveLabels(issue)
    }
    
    override suspend fun saveAll(issues: List<Issue>) {
        issues.forEach { save(it) }
    }
    
    override suspend fun delete(id: IssueId) {
        dbQuery {
        // Delete dependencies first
        IssueDependenciesTable.deleteWhere { 
            (IssueDependenciesTable.blockerId eq id.value) or 
            (IssueDependenciesTable.blockedId eq id.value)
        }
        
        // Delete labels
        IssueLabelsTable.deleteWhere { IssueLabelsTable.issueId eq id.value }
        
        // Delete issue
        IssuesTable.deleteWhere { IssuesTable.id eq id.value }
        }
    }
    
    override suspend fun exists(id: IssueId): Boolean = dbQuery {
        IssuesTable
            .selectAll()
            .where { IssuesTable.id eq id.value }
            .count() > 0
    }
    
    private suspend fun saveDependencies(issue: Issue) = dbQuery {
        // Clear existing dependencies
        IssueDependenciesTable.deleteWhere { 
            IssueDependenciesTable.blockedId eq issue.id.value 
        }
        
        // Insert new blockedBy dependencies
        issue.blockedBy.forEach { blockerId ->
            IssueDependenciesTable.insert {
                it[id] = UUID.randomUUID().toString()
                it[this.blockerId] = blockerId.value
                it[blockedId] = issue.id.value
                it[dependencyType] = "blocks"
                it[createdAt] = issue.updatedAt
            }
        }
        
        // Clear existing blocks
        IssueDependenciesTable.deleteWhere { 
            IssueDependenciesTable.blockerId eq issue.id.value 
        }
        
        // Insert new blocks dependencies
        issue.blocks.forEach { blockedId ->
            IssueDependenciesTable.insert {
                it[id] = UUID.randomUUID().toString()
                it[blockerId] = issue.id.value
                it[this.blockedId] = blockedId.value
                it[dependencyType] = "blocks"
                it[createdAt] = issue.updatedAt
            }
        }
    }
    
    private suspend fun saveLabels(issue: Issue) = dbQuery {
        // Clear existing labels
        IssueLabelsTable.deleteWhere { IssueLabelsTable.issueId eq issue.id.value }
        
        // Insert new labels
        issue.labels.forEach { label ->
            IssueLabelsTable.insert {
                it[issueId] = issue.id.value
                it[this.label] = label
            }
        }
    }
    
    private suspend fun ResultRow.toIssue(): Issue = dbQuery {
        val issueId = IssueId(this@toIssue[IssuesTable.id].value)
        
        // Load dependencies
        val blockedBy = IssueDependenciesTable
            .selectAll()
            .where { IssueDependenciesTable.blockedId eq issueId.value }
            .map { IssueId(it[IssueDependenciesTable.blockerId]) }
            .toMutableSet()
        
        val blocks = IssueDependenciesTable
            .selectAll()
            .where { IssueDependenciesTable.blockerId eq issueId.value }
            .map { IssueId(it[IssueDependenciesTable.blockedId]) }
            .toMutableSet()
        
        // Load labels
        val labels = IssueLabelsTable
            .selectAll()
            .where { IssueLabelsTable.issueId eq issueId.value }
            .map { it[IssueLabelsTable.label] }
            .toMutableSet()
        
        Issue(
            id = issueId,
            projectId = ProjectId(this@toIssue[IssuesTable.projectId]),
            title = this@toIssue[IssuesTable.title],
            description = this@toIssue[IssuesTable.description],
            type = IssueType.fromString(this@toIssue[IssuesTable.type]),
            parentId = this@toIssue[IssuesTable.parentId]?.let { IssueId(it) },
            status = IssueStatus.fromString(this@toIssue[IssuesTable.status]),
            priority = this@toIssue[IssuesTable.priority],
            estimate = this@toIssue[IssuesTable.estimate],
            assigneeId = this@toIssue[IssuesTable.assigneeId],
            blockedBy = blockedBy,
            blocks = blocks,
            labels = labels,
            createdAt = this@toIssue[IssuesTable.createdAt],
            updatedAt = this@toIssue[IssuesTable.updatedAt]
        )
    }
    
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }
}