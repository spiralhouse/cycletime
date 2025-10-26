package io.spiralhouse.cycletime.test.utils

import io.spiralhouse.cycletime.domain.entities.Issue
import io.spiralhouse.cycletime.domain.entities.Project
import io.spiralhouse.cycletime.domain.services.TimeProvider
import io.spiralhouse.cycletime.domain.valueobjects.Estimate
import io.spiralhouse.cycletime.domain.valueobjects.IssueType
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedIssueRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedProjectRepository
import io.spiralhouse.cycletime.infrastructure.persistence.ExposedUnitOfWork

/**
 * Test data builder for dashboard integration tests.
 *
 * Provides reusable functions to seed common test scenarios:
 * - Simple projects with varying issue counts
 * - Complex hierarchies (Epic → Story → Subtask)
 * - Edge cases (orphaned stories, empty projects)
 * - Multiple epic scenarios
 *
 * ## Design Principles:
 * - **Reusable**: Functions work across multiple test suites
 * - **Composable**: Build complex scenarios from simple building blocks
 * - **Explicit**: Clear naming reveals test scenario intent
 * - **Isolated**: Each function creates independent test data
 *
 * ## Usage Example:
 * ```kotlin
 * val (project, epic, story, subtask) = DashboardTestDataBuilder.seedProjectWithHierarchy(
 *     projectRepo, issueRepo, unitOfWork, timeProvider
 * )
 *
 * // Assert on project hierarchy
 * val hierarchy = dashboardService.getProjectHierarchy(project.id)
 * hierarchy.epics shouldHaveSize 1
 * ```
 *
 * @since 1.0.0 (SPI-690)
 */
object DashboardTestDataBuilder {

    /**
     * Seeds two simple test projects into the database.
     *
     * Creates minimal projects with basic metadata, useful for testing
     * project list endpoints and basic retrieval operations.
     *
     * @param projectRepo Repository for project persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return Pair of created projects
     */
    suspend fun seedTestProjects(
        projectRepo: ExposedProjectRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): Pair<Project, Project> {
        val project1 = Project.create("Test Project 1", "Description 1", timeProvider)
        val project2 = Project.create("Test Project 2", "Description 2", timeProvider)

        unitOfWork.execute {
            projectRepo.save(project1)
            projectRepo.save(project2)
        }

        return Pair(project1, project2)
    }

    /**
     * Seeds a project with complete Epic → Story → Subtask hierarchy.
     *
     * Creates a three-level hierarchy useful for testing:
     * - Hierarchy rendering and navigation
     * - Parent-child relationships
     * - Statistics calculation (issue counts, estimate totals)
     *
     * ## Hierarchy Structure:
     * ```
     * Project "Test Project with Hierarchy"
     * └── Epic "Epic 1" (no estimate)
     *     └── Story "Story 1" (3 points)
     *         └── Subtask "Subtask 1" (2 points)
     * ```
     *
     * **Total estimate**: 5 points (story + subtask)
     *
     * @param projectRepo Repository for project persistence
     * @param issueRepo Repository for issue persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return TestProjectHierarchy with project and all three issue levels
     */
    suspend fun seedProjectWithHierarchy(
        projectRepo: ExposedProjectRepository,
        issueRepo: ExposedIssueRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): TestProjectHierarchy {
        val project = Project.create("Test Project with Hierarchy", "Project description", timeProvider)

        val epic = Issue.create(
            title = "Epic 1",
            description = "Epic description",
            type = IssueType.EPIC,
            parentId = null,
            projectId = project.id,
            timeProvider = timeProvider
        )

        val story = Issue.create(
            title = "Story 1",
            description = "Story description",
            type = IssueType.STORY,
            parentId = epic.id,
            projectId = project.id,
            timeProvider = timeProvider
        )
        story.setEstimate(Estimate.of(3))

        val subtask = Issue.create(
            title = "Subtask 1",
            description = "Subtask description",
            type = IssueType.SUBTASK,
            parentId = story.id,
            projectId = project.id,
            timeProvider = timeProvider
        )
        subtask.setEstimate(Estimate.of(2))

        unitOfWork.execute {
            projectRepo.save(project)
            project.addIssue(epic.id)
            project.addIssue(story.id)
            project.addIssue(subtask.id)
            projectRepo.save(project)
            issueRepo.save(epic)
            issueRepo.save(story)
            issueRepo.save(subtask)
        }

        return TestProjectHierarchy(project, epic, story, subtask)
    }

    /**
     * Seeds a project with multiple epics, each containing a story.
     *
     * Useful for testing:
     * - Multi-epic rendering
     * - Epic-level statistics aggregation
     * - Navigation between sibling epics
     *
     * ## Hierarchy Structure:
     * ```
     * Project "Project with Multiple Epics"
     * ├── Epic "Epic 1"
     * │   └── Story "Story 1"
     * └── Epic "Epic 2"
     *     └── Story "Story 2"
     * ```
     *
     * @param projectRepo Repository for project persistence
     * @param issueRepo Repository for issue persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return Project with 2 epics and 2 stories (4 total issues)
     */
    suspend fun seedProjectWithMultipleEpics(
        projectRepo: ExposedProjectRepository,
        issueRepo: ExposedIssueRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): Project {
        val project = Project.create("Project with Multiple Epics", null, timeProvider)

        val epic1 = Issue.create(
            title = "Epic 1",
            description = null,
            type = IssueType.EPIC,
            parentId = null,
            projectId = project.id,
            timeProvider = timeProvider
        )

        val story1 = Issue.create(
            title = "Story 1",
            description = null,
            type = IssueType.STORY,
            parentId = epic1.id,
            projectId = project.id,
            timeProvider = timeProvider
        )

        val epic2 = Issue.create(
            title = "Epic 2",
            description = null,
            type = IssueType.EPIC,
            parentId = null,
            projectId = project.id,
            timeProvider = timeProvider
        )

        val story2 = Issue.create(
            title = "Story 2",
            description = null,
            type = IssueType.STORY,
            parentId = epic2.id,
            projectId = project.id,
            timeProvider = timeProvider
        )

        unitOfWork.execute {
            projectRepo.save(project)
            project.addIssue(epic1.id)
            project.addIssue(story1.id)
            project.addIssue(epic2.id)
            project.addIssue(story2.id)
            projectRepo.save(project)
            issueRepo.save(epic1)
            issueRepo.save(story1)
            issueRepo.save(epic2)
            issueRepo.save(story2)
        }

        return project
    }

    /**
     * Seeds a project with an orphaned story (no epic parent).
     *
     * Tests edge case handling for stories that:
     * - Have null parentId
     * - Are not attached to any epic
     * - Should appear in "orphanedStories" collection
     *
     * Useful for testing:
     * - Orphaned story detection logic
     * - Statistics (orphanedStoryCount field)
     * - Dashboard warnings or alerts for data quality issues
     *
     * @param projectRepo Repository for project persistence
     * @param issueRepo Repository for issue persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return Pair of project and orphaned story
     */
    suspend fun seedProjectWithOrphanedStory(
        projectRepo: ExposedProjectRepository,
        issueRepo: ExposedIssueRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): Pair<Project, Issue> {
        val project = Project.create("Project with Orphaned Story", null, timeProvider)

        val orphanedStory = Issue.create(
            title = "Orphaned Story",
            description = null,
            type = IssueType.STORY,
            parentId = null, // No epic parent - orphaned
            projectId = project.id,
            timeProvider = timeProvider
        )

        unitOfWork.execute {
            projectRepo.save(project)
            project.addIssue(orphanedStory.id)
            projectRepo.save(project)
            issueRepo.save(orphanedStory)
        }

        return Pair(project, orphanedStory)
    }

    /**
     * Seeds an empty project with no issues.
     *
     * Tests boundary condition where project exists but has:
     * - Empty epics list
     * - Empty orphanedStories list
     * - All statistics at zero
     *
     * Useful for verifying dashboard doesn't break on empty data.
     *
     * @param projectRepo Repository for project persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return Empty project
     */
    suspend fun seedEmptyProject(
        projectRepo: ExposedProjectRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): Project {
        val project = Project.create("Empty Project", "Project with no issues", timeProvider)

        unitOfWork.execute {
            projectRepo.save(project)
        }

        return project
    }

    /**
     * Seeds a story with multiple subtasks.
     *
     * Creates a story with 2 subtasks, useful for testing:
     * - Subtask listing endpoints
     * - Parent-child relationship verification
     * - Subtask field validation (estimate, status, assignee)
     *
     * ## Structure:
     * ```
     * Story "Story with Subtasks" (no project)
     * ├── Subtask "Subtask 1" (2 points)
     * └── Subtask "Subtask 2" (3 points)
     * ```
     *
     * **Note**: Story and subtasks are NOT attached to a project (projectId = null).
     * This tests subtask retrieval independent of project context.
     *
     * @param issueRepo Repository for issue persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return TestStorySubtasks with story and 2 subtasks
     */
    suspend fun seedStoryWithMultipleSubtasks(
        issueRepo: ExposedIssueRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): TestStorySubtasks {
        val story = Issue.create(
            title = "Story with Subtasks",
            description = null,
            type = IssueType.STORY,
            parentId = null,
            projectId = null, // Not attached to project
            timeProvider = timeProvider
        )

        val subtask1 = Issue.create(
            title = "Subtask 1",
            description = null,
            type = IssueType.SUBTASK,
            parentId = story.id,
            projectId = null,
            timeProvider = timeProvider
        )
        subtask1.setEstimate(Estimate.of(2))

        val subtask2 = Issue.create(
            title = "Subtask 2",
            description = null,
            type = IssueType.SUBTASK,
            parentId = story.id,
            projectId = null,
            timeProvider = timeProvider
        )
        subtask2.setEstimate(Estimate.of(3))

        unitOfWork.execute {
            issueRepo.save(story)
            issueRepo.save(subtask1)
            issueRepo.save(subtask2)
        }

        return TestStorySubtasks(story, subtask1, subtask2)
    }

    /**
     * Seeds a story without any subtasks.
     *
     * Tests boundary condition where story exists but has no children.
     * Endpoint should return empty array, not error.
     *
     * @param issueRepo Repository for issue persistence
     * @param unitOfWork Transaction coordinator
     * @param timeProvider Time provider for entity timestamps
     * @return Story with no subtasks
     */
    suspend fun seedStoryWithoutSubtasks(
        issueRepo: ExposedIssueRepository,
        unitOfWork: ExposedUnitOfWork,
        timeProvider: TimeProvider
    ): Issue {
        val story = Issue.create(
            title = "Story without Subtasks",
            description = null,
            type = IssueType.STORY,
            parentId = null,
            projectId = null,
            timeProvider = timeProvider
        )

        unitOfWork.execute {
            issueRepo.save(story)
        }

        return story
    }

    // ========================================
    // Test Data Classes
    // ========================================

    /**
     * Result type for seedProjectWithHierarchy().
     *
     * Provides strongly-typed access to all levels of test hierarchy.
     */
    data class TestProjectHierarchy(
        val project: Project,
        val epic: Issue,
        val story: Issue,
        val subtask: Issue
    )

    /**
     * Result type for seedStoryWithMultipleSubtasks().
     *
     * Provides strongly-typed access to story and its subtasks.
     */
    data class TestStorySubtasks(
        val story: Issue,
        val subtask1: Issue,
        val subtask2: Issue
    )
}
