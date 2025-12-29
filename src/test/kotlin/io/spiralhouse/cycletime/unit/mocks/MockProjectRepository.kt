package io.spiralhouse.cycletime.unit.mocks

import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.ProjectStatus
import org.jetbrains.exposed.sql.Database

/**
 * Mock implementation of ProjectRepository for unit testing.
 *
 * This mock provides a controlled environment for testing Application Services
 * without dependencies on the database or Exposed ORM. It maintains test data
 * in memory and allows for precise control over return values and behavior.
 *
 * ## Design Features:
 * - **Constructor Compatibility**: Matches ExposedProjectRepository constructor
 * - **In-Memory Storage**: Uses mutable collections for test data
 * - **Status Filtering**: Supports project filtering by status
 * - **Configurable Behavior**: Methods can be overridden to return specific values
 * - **Reset Capability**: Clear all test data between tests
 * - **Thread Safety**: Not thread-safe by design - each test gets its own instance
 *
 * ## Usage Pattern:
 * ```kotlin
 * beforeEach {
 *     mockProjectRepository = MockProjectRepository()
 *     // Pre-populate with test data as needed
 *     mockProjectRepository.projects[projectId] = testProject
 * }
 * ```
 *
 * @property timeProvider The time provider for entity reconstitution (unused in mock)
 * @property database The database reference (unused in mock)
 */
class MockProjectRepository(
    private val timeProvider: TimeProvider? = null,
    private val database: Database? = null
) : ProjectRepository {
    
    // ================================================================================
    // Test Data Storage
    // ================================================================================
    
    /**
     * In-memory storage for projects keyed by ProjectId.
     * Direct access allows tests to pre-populate or inspect state.
     */
    val projects: MutableMap<ProjectId, Project> = mutableMapOf()
    
    /**
     * Storage for projects by status for efficient status-based queries.
     * Automatically maintained by save() operations.
     */
    val projectsByStatus: MutableMap<ProjectStatus, MutableList<Project>> = mutableMapOf()

    /**
     * Storage for deleted projects (soft-deleted) for testing restore operations.
     */
    val deletedProjects: MutableMap<ProjectId, Project> = mutableMapOf()

    /**
     * Counter for tracking method calls during testing.
     */
    var saveCallCount: Int = 0
    var deleteCallCount: Int = 0
    var findCallCount: Int = 0
    var softDeleteCallCount: Int = 0
    var restoreCallCount: Int = 0
    var purgeCallCount: Int = 0
    
    // ================================================================================
    // Repository Interface Implementation
    // ================================================================================
    
    override suspend fun findById(id: ProjectId): Project? {
        findCallCount++
        findException?.let { throw it }
        return projects[id]
    }
    
    override suspend fun findByStatus(status: ProjectStatus): List<Project> {
        findCallCount++
        findException?.let { throw it }
        return projectsByStatus[status]?.toList() ?: emptyList()
    }
    
    override suspend fun findAll(): List<Project> {
        findCallCount++
        findException?.let { throw it }
        return projects.values.toList()
    }
    
    override suspend fun save(project: Project) {
        saveCallCount++
        saveException?.let { throw it }
        projects[project.id] = project
        
        // Update status index
        projectsByStatus.getOrPut(project.status) { mutableListOf() }.apply {
            // Remove existing entry for this project (for updates)
            removeAll { it.id == project.id }
            // Add the updated project
            add(project)
        }
    }
    
    override suspend fun delete(id: ProjectId) {
        deleteCallCount++
        deleteException?.let { throw it }
        val project = projects.remove(id)
        
        // Remove from status index
        project?.let { removedProject ->
            projectsByStatus[removedProject.status]?.removeAll { it.id == id }
        }
    }
    
    override suspend fun exists(id: ProjectId): Boolean {
        return projects.containsKey(id)
    }

    override suspend fun softDelete(id: ProjectId) {
        softDeleteCallCount++
        // Mock implementation: move to deletedProjects
        val project = projects.remove(id)
        project?.let {
            deletedProjects[id] = it
            // Remove from status index
            projectsByStatus[it.status]?.removeAll { p -> p.id == id }
        }
    }

    override suspend fun restore(id: ProjectId) {
        restoreCallCount++
        // Mock implementation: move from deletedProjects back to projects
        val project = deletedProjects.remove(id)
        project?.let {
            projects[id] = it
            // Add back to status index
            projectsByStatus.getOrPut(it.status) { mutableListOf() }.add(it)
        }
    }

    override suspend fun findIncludingDeleted(id: ProjectId): Project? {
        findCallCount++
        return projects[id] ?: deletedProjects[id]
    }

    override suspend fun findDeletedBefore(cutoffDate: kotlinx.datetime.Instant): List<Project> {
        findCallCount++
        findException?.let { throw it }
        // Filter by deletedAt < cutoffDate to match real repository behavior
        return deletedProjects.values
            .filter { project ->
                project.deletedAt != null && project.deletedAt!! < cutoffDate
            }
            .toList()
    }

    override suspend fun purge(id: ProjectId) {
        purgeCallCount++
        // Hard delete: remove from both active and deleted maps
        projects.remove(id)
        deletedProjects.remove(id)
    }

    override suspend fun purgeDeletedBefore(cutoffDate: kotlinx.datetime.Instant): Int {
        purgeCallCount++
        // Get list of deleted projects to purge (calls findDeletedBefore for exception propagation)
        val toPurge = findDeletedBefore(cutoffDate)

        // Remove them from the deleted map
        toPurge.forEach { project ->
            deletedProjects.remove(project.id)
        }

        return toPurge.size
    }

    // ================================================================================
    // Test Utilities
    // ================================================================================
    
    /**
     * Resets all test data and counters to initial state.
     * Call this in beforeEach to ensure test isolation.
     */
    fun reset() {
        projects.clear()
        projectsByStatus.clear()
        deletedProjects.clear()
        saveCallCount = 0
        deleteCallCount = 0
        findCallCount = 0
        softDeleteCallCount = 0
        restoreCallCount = 0
        purgeCallCount = 0
    }
    
    /**
     * Pre-populates the repository with test projects.
     * Convenience method for test setup.
     */
    fun addTestProjects(vararg projects: Project) {
        projects.forEach { project ->
            this.projects[project.id] = project
            projectsByStatus.getOrPut(project.status) { mutableListOf() }.add(project)
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
     * Helper methods to simulate repository exceptions for testing error handling.
     * Set these to throw specific exceptions during operations.
     */
    var saveException: Exception? = null
    var findException: Exception? = null
    var deleteException: Exception? = null
    
    /**
     * Methods to configure the mock to throw exceptions for testing error paths.
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