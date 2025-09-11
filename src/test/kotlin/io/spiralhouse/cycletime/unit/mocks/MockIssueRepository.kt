package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.*
import org.jetbrains.exposed.sql.Database

/**
 * Mock implementation of IssueRepository for unit testing.
 *
 * This mock provides a controlled environment for testing Application Services
 * without dependencies on the database or Exposed ORM. It maintains test data
 * in memory and allows for precise control over return values and behavior.
 *
 * ## Design Features:
 * - **Constructor Compatibility**: Matches ExposedIssueRepository constructor
 * - **In-Memory Storage**: Uses mutable collections for test data
 * - **Hierarchical Support**: Maintains parent-child relationships
 * - **Configurable Behavior**: Methods can be overridden to return specific values
 * - **Reset Capability**: Clear all test data between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockIssueRepository = MockIssueRepository()
 *     // Pre-populate with test data as needed
 *     mockIssueRepository.issues[issueId] = testIssue
 * }
 * ```
 *
 * @property timeProvider The time provider for entity reconstitution (unused in mock)
 * @property database The database reference (unused in mock)
 */
class MockIssueRepository(
    private val timeProvider: TimeProvider? = null,
    private val database: Database? = null
) : IssueRepository {
    
    // ================================================================================
    // Test Data Storage
    // ================================================================================
    
    /**
     * In-memory storage for issues keyed by IssueId.
     * Direct access allows tests to pre-populate or inspect state.
     */
    val issues: MutableMap<IssueId, Issue> = mutableMapOf()
    
    /**
     * Storage for issues by project ID for efficient project-based queries.
     * Automatically maintained by save() operations.
     */
    val issuesByProject: MutableMap<ProjectId, MutableList<Issue>> = mutableMapOf()
    
    /**
     * Storage for child issues by parent ID for hierarchy queries.
     * Automatically maintained by save() operations.
     */
    val issuesByParent: MutableMap<IssueId, MutableList<Issue>> = mutableMapOf()
    
    /**
     * Storage for issues by assignee for assignee-based queries.
     * Automatically maintained by save() operations.
     */
    val issuesByAssignee: MutableMap<String, MutableList<Issue>> = mutableMapOf()
    
    /**
     * Counter for tracking method calls during testing.
     */
    var saveCallCount: Int = 0
    var deleteCallCount: Int = 0
    var findCallCount: Int = 0
    
    // ================================================================================
    // Repository Interface Implementation
    // ================================================================================
    
    override suspend fun findById(id: IssueId): Issue? {
        findCallCount++
        return issues[id]
    }
    
    override suspend fun findByProject(projectId: ProjectId): List<Issue> {
        findCallCount++
        return issuesByProject[projectId]?.toList() ?: emptyList()
    }
    
    override suspend fun findByParent(parentId: IssueId): List<Issue> {
        findCallCount++
        return issuesByParent[parentId]?.toList() ?: emptyList()
    }
    
    override suspend fun findByAssignee(assigneeId: String): List<Issue> {
        findCallCount++
        return issuesByAssignee[assigneeId]?.toList() ?: emptyList()
    }
    
    override suspend fun findByStatus(status: IssueStatus): List<Issue> {
        findCallCount++
        return issues.values.filter { it.status == status }
    }
    
    override suspend fun findByType(type: IssueType): List<Issue> {
        findCallCount++
        return issues.values.filter { it.type == type }
    }
    
    override suspend fun save(issue: Issue) {
        saveCallCount++
        issues[issue.id] = issue
        
        // Update project index
        issue.projectId?.let { projectId ->
            issuesByProject.getOrPut(projectId) { mutableListOf() }.apply {
                // Remove existing entry for this issue (for updates)
                removeAll { it.id == issue.id }
                // Add the updated issue
                add(issue)
            }
        }
        
        // Update parent index
        issue.parentId?.let { parentId ->
            issuesByParent.getOrPut(parentId) { mutableListOf() }.apply {
                // Remove existing entry for this issue (for updates)
                removeAll { it.id == issue.id }
                // Add the updated issue
                add(issue)
            }
        }
        
        // Update assignee index
        issue.assigneeId?.let { assigneeId ->
            issuesByAssignee.getOrPut(assigneeId) { mutableListOf() }.apply {
                // Remove existing entry for this issue (for updates)
                removeAll { it.id == issue.id }
                // Add the updated issue
                add(issue)
            }
        }
    }
    
    override suspend fun saveAll(issues: List<Issue>) {
        saveCallCount++
        issues.forEach { issue ->
            save(issue)
        }
    }
    
    override suspend fun delete(id: IssueId) {
        deleteCallCount++
        val issue = issues.remove(id)
        
        // Remove from all indexes
        issue?.let { removedIssue ->
            removedIssue.projectId?.let { projectId ->
                issuesByProject[projectId]?.removeAll { it.id == id }
            }
            
            removedIssue.parentId?.let { parentId ->
                issuesByParent[parentId]?.removeAll { it.id == id }
            }
            
            removedIssue.assigneeId?.let { assigneeId ->
                issuesByAssignee[assigneeId]?.removeAll { it.id == id }
            }
        }
    }
    
    override suspend fun exists(id: IssueId): Boolean {
        return issues.containsKey(id)
    }
    
    // ================================================================================
    // Test Utilities
    // ================================================================================
    
    /**
     * Resets all test data and counters to initial state.
     * Call this in beforeEach to ensure test isolation.
     */
    fun reset() {
        issues.clear()
        issuesByProject.clear()
        issuesByParent.clear()
        issuesByAssignee.clear()
        saveCallCount = 0
        deleteCallCount = 0
        findCallCount = 0
    }
    
    /**
     * Pre-populates the repository with test issues.
     * Convenience method for test setup.
     */
    fun addTestIssues(vararg issues: Issue) {
        issues.forEach { issue ->
            this.issues[issue.id] = issue
            
            issue.projectId?.let { projectId ->
                issuesByProject.getOrPut(projectId) { mutableListOf() }.add(issue)
            }
            
            issue.parentId?.let { parentId ->
                issuesByParent.getOrPut(parentId) { mutableListOf() }.add(issue)
            }
            
            issue.assigneeId?.let { assigneeId ->
                issuesByAssignee.getOrPut(assigneeId) { mutableListOf() }.add(issue)
            }
        }
    }
    
    /**
     * Returns the total number of method calls made to this mock.
     * Useful for verifying expected interaction patterns.
     */
    fun getTotalCallCount(): Int {
        return saveCallCount + deleteCallCount + findCallCount
    }
    
    /**
     * Helper method to simulate repository exceptions for testing error handling.
     * Set this to throw specific exceptions during save operations.
     */
    var saveException: Exception? = null
    var findException: Exception? = null
    var deleteException: Exception? = null
    
    /**
     * Method to configure the mock to throw exceptions for testing error paths.
     */
    fun throwOnSave(exception: Exception) {
        saveException = exception
    }
    
    fun throwOnFind(exception: Exception) {
        findException = exception
    }
    
    fun throwOnDelete(exception: Exception) {
        deleteException = exception
    }
}