package com.spiralhouse.jcvd.domain.repositories

import com.spiralhouse.jcvd.domain.entities.Issue
import com.spiralhouse.jcvd.domain.valueobjects.IssueId
import com.spiralhouse.jcvd.domain.valueobjects.IssueStatus
import com.spiralhouse.jcvd.domain.valueobjects.IssueType
import com.spiralhouse.jcvd.domain.valueobjects.ProjectId

interface IssueRepository {
    suspend fun findById(id: IssueId): Issue?
    suspend fun findByProject(projectId: ProjectId): List<Issue>
    suspend fun findByParent(parentId: IssueId): List<Issue>
    suspend fun findByStatus(status: IssueStatus): List<Issue>
    suspend fun findByType(type: IssueType): List<Issue>
    suspend fun findByAssignee(assigneeId: String): List<Issue>
    suspend fun save(issue: Issue)
    suspend fun saveAll(issues: List<Issue>)
    suspend fun delete(id: IssueId)
    suspend fun exists(id: IssueId): Boolean
}