package io.spiralhouse.cycletime.mcp.tools

import io.spiralhouse.cycletime.application.services.*

/**
 * Default implementation of ProjectToolProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultProjectToolProvider(private val projectService: ProjectApplicationService? = null) : ProjectToolProvider {
    // RED PHASE: No implementation - tests will fail as expected
}

/**
 * Default implementation of IssueToolProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultIssueToolProvider(private val issueService: IssueApplicationService? = null) : IssueToolProvider {
    // RED PHASE: No implementation - tests will fail as expected
}

/**
 * Default implementation of SessionToolProvider.
 * RED PHASE: Empty constructor that will fail tests - this is intentional.
 */
class DefaultSessionToolProvider(private val sessionService: SessionApplicationService? = null) : SessionToolProvider {
    // RED PHASE: No implementation - tests will fail as expected
}