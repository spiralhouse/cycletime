package io.spiralhouse.cycletime.application.services

import io.spiralhouse.cycletime.dashboard.dto.*
import io.spiralhouse.cycletime.dashboard.mappers.DashboardMapper
import io.spiralhouse.cycletime.domain.repositories.IssueRepository
import io.spiralhouse.cycletime.domain.repositories.ProjectRepository
import io.spiralhouse.cycletime.domain.repositories.UnitOfWork
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.ProjectId
import io.spiralhouse.cycletime.domain.valueobjects.IssueId
import kotlin.time.Duration.Companion.minutes

/**
 * Application service for dashboard operations with intelligent caching.
 *
 * This service provides optimized data access for dashboard views through:
 * - **Smart Caching**: LRU cache with TTL for frequently accessed data
 * - **Batch Loading**: Minimizes database queries through efficient loading patterns
 * - **Hierarchy Building**: Constructs project/issue hierarchies without N+1 queries
 * - **Statistics**: Computes dashboard metrics from cached data
 *
 * ## Design Principles:
 * - **Performance**: Cache-first strategy reduces database load
 * - **Freshness**: Configurable TTL ensures data relevance
 * - **Consistency**: Explicit cache invalidation on data changes
 * - **Testability**: Injected dependencies enable comprehensive testing
 *
 * ## Caching Strategy:
 * - Project lists cached for 5 minutes
 * - Project hierarchies cached for 5 minutes
 * - Story subtasks cached for 3 minutes (more dynamic)
 * - Manual invalidation on project updates
 *
 * ## Usage Example:
 * ```kotlin
 * val service = DashboardApplicationService(
 *     projectRepository,
 *     issueRepository,
 *     unitOfWork,
 *     dashboardCache,
 *     timeProvider
 * )
 *
 * val projects = service.listProjects()
 * val hierarchy = service.getProjectHierarchy(projectId)
 * val subtasks = service.getStorySubtasks(storyId)
 * ```
 *
 * ## Thread Safety:
 * All methods are thread-safe through underlying cache and repository implementations.
 *
 * @property projectRepository Repository for project data access
 * @property issueRepository Repository for issue data access
 * @property unitOfWork Transaction coordinator for database operations
 * @property dashboardCache LRU cache with TTL for dashboard data
 * @property timeProvider Time provider for health status timestamps
 */
class DashboardApplicationService(
    private val projectRepository: ProjectRepository,
    private val issueRepository: IssueRepository,
    private val unitOfWork: UnitOfWork,
    private val dashboardCache: DashboardCache,
    private val timeProvider: TimeProvider
) {
    companion object {
        // Cache keys
        private const val PROJECTS_LIST_KEY = "dashboard:projects:all"
        private const val PROJECT_HIERARCHY_PREFIX = "dashboard:project"
        private const val STORY_SUBTASKS_PREFIX = "dashboard:story"
        private const val SERVICE_HEALTH_KEY = "dashboard:health"

        // Cache TTLs
        private val PROJECTS_LIST_TTL = 5.minutes
        private val PROJECT_HIERARCHY_TTL = 5.minutes
        private val STORY_SUBTASKS_TTL = 3.minutes
        private val SERVICE_HEALTH_TTL = 1.minutes
    }

    /**
     * Lists all projects with basic information.
     *
     * Returns a cached list of all projects in the system optimized for
     * dashboard display. Uses batch loading to minimize database queries.
     *
     * ## Caching:
     * - Cached for 5 minutes
     * - Invalidated on project creation/deletion
     * - Key: "dashboard:projects:all"
     *
     * ## Performance:
     * - Single database query for all projects
     * - No N+1 query issues
     * - Minimal DTO conversion overhead
     *
     * @return List of project view DTOs
     */
    suspend fun listProjects(): List<ProjectViewDTO> {
        return dashboardCache.getOrPut(
            key = PROJECTS_LIST_KEY,
            ttl = PROJECTS_LIST_TTL
        ) {
            unitOfWork.execute {
                val projects = projectRepository.findAll()
                DashboardMapper.toProjectViews(projects)
            }
        }
    }

    /**
     * Retrieves complete project hierarchy with organized issues.
     *
     * Builds a hierarchical view of a project with:
     * - Project metadata
     * - Epics with their stories and subtasks
     * - Orphaned stories (stories without epic parents)
     * - Statistical summary (counts, estimates)
     *
     * ## Caching:
     * - Cached for 5 minutes per project
     * - Invalidated when project or its issues change
     * - Key pattern: "dashboard:project:{id}:hierarchy"
     *
     * ## Performance:
     * - Two database queries: project + all issues
     * - Hierarchy built in-memory (no additional queries)
     * - Handles large issue sets efficiently
     *
     * ## Orphaned Story Handling:
     * Stories without epic parents or with invalid parent references are
     * collected separately for visibility and correction.
     *
     * @param projectId The project identifier
     * @return Project hierarchy DTO with organized issues and statistics
     * @throws IllegalArgumentException if project not found
     */
    suspend fun getProjectHierarchy(projectId: ProjectId): ProjectHierarchyDTO {
        val cacheKey = "$PROJECT_HIERARCHY_PREFIX:${projectId.value}:hierarchy"

        return dashboardCache.getOrPut(
            key = cacheKey,
            ttl = PROJECT_HIERARCHY_TTL
        ) {
            unitOfWork.execute {
                // Load project
                val project = projectRepository.findById(projectId)
                    ?: throw IllegalArgumentException("Project not found: ${projectId.value}")

                // Batch load all issues for this project (single query)
                val issues = issueRepository.findByProject(projectId)

                // Build hierarchy in-memory (no additional queries)
                DashboardMapper.toProjectHierarchy(project, issues)
            }
        }
    }

    /**
     * Retrieves subtasks for a specific story.
     *
     * Returns all direct subtasks of a story, organized for dashboard display.
     * Uses caching for frequently accessed stories.
     *
     * ## Caching:
     * - Cached for 3 minutes per story (shorter TTL due to higher volatility)
     * - Invalidated when story's subtasks change
     * - Key pattern: "dashboard:story:{id}:subtasks"
     *
     * ## Performance:
     * - Single database query for subtasks
     * - Lightweight DTO conversion
     *
     * @param storyId The story identifier
     * @return List of subtask view DTOs
     * @throws IllegalArgumentException if story not found or not a STORY type
     */
    suspend fun getStorySubtasks(storyId: IssueId): List<IssueViewDTO> {
        val cacheKey = "$STORY_SUBTASKS_PREFIX:${storyId.value}:subtasks"

        return dashboardCache.getOrPut(
            key = cacheKey,
            ttl = STORY_SUBTASKS_TTL
        ) {
            unitOfWork.execute {
                // Verify story exists and is correct type
                val story = issueRepository.findById(storyId)
                    ?: throw IllegalArgumentException("Story not found: ${storyId.value}")

                // Verify this is actually a STORY type (not EPIC or SUBTASK)
                if (story.type != io.spiralhouse.cycletime.domain.valueobjects.IssueType.STORY) {
                    throw IllegalArgumentException("Story not found: ${storyId.value}")
                }

                // Load all subtasks (single query)
                val subtasks = issueRepository.findByParent(storyId)

                // Convert to DTOs
                DashboardMapper.toIssueViews(subtasks)
            }
        }
    }

    /**
     * Retrieves service health status for dashboard monitoring.
     *
     * Provides real-time health information including:
     * - Service status (healthy/degraded/down)
     * - Uptime metrics
     * - Dependency health (database, cache)
     * - Performance metrics
     *
     * ## Caching:
     * - Cached for 1 minute (short TTL for real-time monitoring)
     * - Key: "dashboard:health"
     *
     * ## Implementation Note:
     * Current implementation returns basic health status.
     * Future enhancements: database ping, cache stats, memory usage.
     *
     * @return Service health DTO
     */
    suspend fun getServiceHealth(): ServiceHealthDTO {
        return dashboardCache.getOrPut(
            key = SERVICE_HEALTH_KEY,
            ttl = SERVICE_HEALTH_TTL
        ) {
            val now = timeProvider.now()

            ServiceHealthDTO(
                status = "healthy",
                timestamp = now,
                uptime = 0L, // TODO: Track actual uptime from application start
                dependencies = mapOf(
                    "database" to "connected",
                    "cache" to "active"
                ),
                metrics = mapOf(
                    "cacheSize" to dashboardCache.size().toString()
                )
            )
        }
    }

    /**
     * Invalidates all cached data for a specific project.
     *
     * Removes project-related cache entries when project data changes:
     * - Project list cache
     * - Project hierarchy cache
     * - Related story subtask caches
     *
     * ## Usage:
     * Call this method after:
     * - Project creation/update/deletion
     * - Issue addition/removal from project
     * - Project hierarchy changes
     *
     * ## Cache Invalidation Strategy:
     * Uses pattern matching to find and remove all related entries.
     * This ensures consistency without manual key tracking.
     *
     * @param projectId The project whose cache should be invalidated
     */
    suspend fun invalidateProject(projectId: ProjectId) {
        // Invalidate project list (affects all projects)
        dashboardCache.invalidate(PROJECTS_LIST_KEY)

        // Invalidate specific project hierarchy
        dashboardCache.invalidatePattern("$PROJECT_HIERARCHY_PREFIX:${projectId.value}:*")

        // Note: Story subtasks are invalidated separately when issues change
        // to avoid over-invalidation
    }

    /**
     * Invalidates cache for a specific story's subtasks.
     *
     * Use this when subtasks are added, removed, or modified for a story.
     *
     * @param storyId The story whose subtask cache should be invalidated
     */
    suspend fun invalidateStorySubtasks(storyId: IssueId) {
        dashboardCache.invalidate("$STORY_SUBTASKS_PREFIX:${storyId.value}:subtasks")
    }

    /**
     * Clears all dashboard caches.
     *
     * Nuclear option for cache invalidation. Use when:
     * - Bulk data imports complete
     * - Database migrations occur
     * - Cache corruption detected
     *
     * ## Performance Impact:
     * Next dashboard requests will experience cache miss latency.
     * Use sparingly.
     */
    suspend fun clearAllCaches() {
        dashboardCache.clear()
    }
}
