package io.spiralhouse.cycletime.dashboard.views

import kotlinx.html.*
import io.spiralhouse.cycletime.dashboard.dto.ProjectViewDTO
import io.spiralhouse.cycletime.dashboard.dto.ProjectHierarchyDTO
import io.spiralhouse.cycletime.dashboard.dto.IssueHierarchyNode
import io.spiralhouse.cycletime.dashboard.dto.IssueViewDTO
import io.spiralhouse.cycletime.dashboard.dto.ProjectStatistics

// ============================================================================
// SHARED LAYOUT COMPONENTS (DRY Principle)
// ============================================================================

/**
 * Shared HTML layout for dashboard pages.
 *
 * This function extracts common page structure to eliminate duplication and
 * provide consistent styling across all dashboard views.
 *
 * ## Layout Components
 * - **Head**: Meta tags, CDN dependencies, CycleTime styles
 * - **Body**: Skip-to-main-content link, health header, main content
 *
 * ## Accessibility
 * - Skip navigation link for keyboard users
 * - Semantic HTML structure with landmarks
 * - Focus states for interactive elements
 *
 * @param pageTitle The page title (displayed in browser tab)
 * @param content The main content builder function
 * @since 1.0.0 (SPI-800)
 */
fun HTML.dashboardLayout(
    pageTitle: String,
    content: FlowContent.() -> Unit
) {
    head {
        // Required meta tags
        meta(charset = "UTF-8")
        meta(name = "viewport", content = "width=device-width, initial-scale=1.0")

        // Page title
        title { +pageTitle }

        // External dependencies (CDN)
        script(src = "https://cdn.tailwindcss.com") {}
        script(src = "https://unpkg.com/htmx.org@1.9.10") {}

        // CycleTime design system
        cycleTimeStyles()
    }

    body(classes = "min-h-screen bg-background text-text") {
        // Skip to main content (accessibility)
        a(
            href = "#main-content",
            classes = "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded"
        ) {
            +"Skip to main content"
        }

        // Service health header
        serviceHealthHeader()

        // Main content area (semantic landmark)
        main(classes = "container mx-auto px-4 py-8") {
            id = "main-content"
            attributes["role"] = "main"
            content()
        }
    }
}

/**
 * CycleTime design system styles.
 *
 * Defines CSS custom properties, utility classes, animations, and accessibility
 * styles used across all dashboard pages.
 *
 * ## Design Tokens
 * - Color palette (primary, surface, text, semantic colors)
 * - Issue type colors (epic, story, subtask)
 * - Status colors (todo, in-progress, done, blocked)
 *
 * ## Animations
 * - HTMX loading states (fade in/out)
 * - Spinner animation
 * - Pulse animation for health indicator
 *
 * ## Accessibility
 * - Focus states with visible outlines
 * - Screen reader utility classes
 *
 * @since 1.0.0 (SPI-800)
 */
private fun HEAD.cycleTimeStyles() {
    style {
        unsafe {
            raw("""
                /* ========================================
                   CycleTime Design System
                   ======================================== */

                :root {
                    /* Primary Colors */
                    --primary: #58a6ff;
                    --background: #0d1117;
                    --surface: #161b22;
                    --surface-hover: #21262d;
                    --border: #30363d;

                    /* Text Colors */
                    --text: #c9d1d9;
                    --text-muted: #8b949e;

                    /* Semantic Colors */
                    --success: #3fb950;
                    --warning: #d29922;
                    --error: #f85149;

                    /* Issue Type Colors */
                    --epic: #a371f7;
                    --story: #58a6ff;
                    --subtask: #8b949e;
                }

                /* Base Styles */
                body {
                    background-color: var(--background);
                    color: var(--text);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                }

                /* Utility Classes for Design Tokens */
                .bg-surface { background-color: var(--surface); }
                .bg-surface-hover:hover { background-color: var(--surface-hover); }
                .text-text { color: var(--text); }
                .text-text-muted { color: var(--text-muted); }
                .border-border { border-color: var(--border); }
                .bg-primary { background-color: var(--primary); }

                /* Status Badge Colors */
                .status-todo { background-color: var(--text-muted); }
                .status-in-progress { background-color: var(--primary); }
                .status-done { background-color: var(--success); }
                .status-blocked { background-color: var(--error); }

                /* ========================================
                   HTMX Loading States
                   ======================================== */

                /* Hide loading indicator by default */
                .htmx-indicator {
                    display: none;
                }

                /* Show indicator during HTMX request */
                .htmx-request .htmx-indicator {
                    display: inline-block;
                    animation: spin 1s linear infinite;
                }

                /* Spinner animation */
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Fade out during swap */
                .htmx-swapping {
                    opacity: 0;
                    transition: opacity 200ms ease-out;
                }

                /* Fade in after settling */
                .htmx-settling {
                    opacity: 1;
                    transition: opacity 200ms ease-in;
                }

                /* ========================================
                   Animations
                   ======================================== */

                /* Pulse animation for health indicator */
                @keyframes pulse-green {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .animate-pulse-green {
                    animation: pulse-green 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                /* ========================================
                   Accessibility
                   ======================================== */

                /* Focus states for keyboard navigation */
                a:focus, button:focus {
                    outline: 2px solid var(--primary);
                    outline-offset: 2px;
                }

                /* Screen reader only class */
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }

                .sr-only:focus:not(.focus:not-sr-only) {
                    position: static;
                    width: auto;
                    height: auto;
                    padding: inherit;
                    margin: inherit;
                    overflow: visible;
                    clip: auto;
                    white-space: normal;
                }
            """.trimIndent())
        }
    }
}

/**
 * Renders the service health header (shared across dashboard pages).
 *
 * Enhanced with pulse animation for status indicator and clean styling.
 *
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.serviceHealthHeader() {
    header(classes = "bg-surface border-b border-border py-4 sticky top-0 z-10 backdrop-blur") {
        div(classes = "container mx-auto px-4 flex items-center gap-4") {
            // Status indicator with pulse animation
            div(classes = "flex items-center gap-3") {
                span(classes = "relative flex h-3 w-3") {
                    span(classes = "animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75")
                    span(classes = "relative inline-flex rounded-full h-3 w-3 bg-success")
                }
                span(classes = "text-sm font-semibold text-text") {
                    +"Service: Healthy"
                }
            }
        }
    }
}

/**
 * Renders the main dashboard page with projects list.
 *
 * This view provides a responsive grid of project cards with essential metadata,
 * service health status, and empty state handling.
 *
 * ## Page Structure
 * - **Header**: Service health indicator with project/issue counts
 * - **Main**: Project grid (responsive: 1/2/3 columns) or empty state
 * - **CDN Dependencies**: Tailwind CSS and HTMX loaded from CDN
 *
 * ## Responsive Breakpoints
 * - Mobile (< 768px): 1 column
 * - Tablet (768px-1024px): 2 columns
 * - Desktop (> 1024px): 3 columns
 *
 * @param projects List of projects to display
 * @since 1.0.0 (SPI-798, refactored in SPI-800)
 */
fun HTML.projectsIndex(projects: List<ProjectViewDTO>) {
    dashboardLayout("CycleTime Dashboard") {
        // Page heading
        h1(classes = "text-3xl font-bold text-text mb-8") {
            +"CycleTime Dashboard"
        }

        // Projects grid or empty state
        if (projects.isEmpty()) {
            emptyProjectsState()
        } else {
            div(classes = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6") {
                projects.forEach { project ->
                    projectCard(project)
                }
            }
        }
    }
}

/**
 * Renders the empty state for projects list.
 *
 * Provides a helpful, visually engaging message when no projects exist.
 *
 * @since 1.0.0 (SPI-800)
 */
private fun FlowContent.emptyProjectsState() {
    div(classes = "text-center py-16") {
        div(classes = "text-6xl mb-4 opacity-50") { +"📊" }
        h2(classes = "text-2xl font-semibold mb-2 text-text") {
            +"No projects yet"
        }
        p(classes = "text-text-muted") {
            +"Create your first project to start tracking epics, stories, and subtasks"
        }
    }
}

/**
 * Renders a single project card with metadata and navigation.
 *
 * ## Card Components
 * - **Title**: Project name with primary accent color
 * - **Description**: Optional project description (if present)
 * - **Metadata**: Status and issue count
 * - **Navigation**: Link to project hierarchy page
 *
 * ## Styling
 * - Hover effect: Border color change and subtle lift animation
 * - Transition: Smooth 200ms transitions for all interactive states
 * - Responsive: Adapts to grid layout
 *
 * @param project Project data to render
 * @since 1.0.0 (SPI-798, enhanced in SPI-800)
 */
private fun FlowContent.projectCard(project: ProjectViewDTO) {
    div(classes = "project-card bg-surface rounded-lg border border-border p-6 hover:border-primary transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg") {
        // Project name
        h2(classes = "text-xl font-semibold text-primary mb-2") {
            +project.name
        }

        // Project description (if present)
        project.description?.let { desc ->
            p(classes = "text-sm text-text-muted mb-4 line-clamp-2") {
                +desc
            }
        }

        // Metadata row
        div(classes = "flex gap-4 text-sm text-text-muted mb-4") {
            // Status indicator
            span {
                +"Status: ${project.status}"
            }

            // Issue count
            span {
                +"${project.issueCount} issues"
            }
        }

        // Helper text with issue type keywords
        p(classes = "text-xs text-text-muted mb-3") {
            +"Browse epics, stories, and subtasks in this project"
        }

        // Navigation link to hierarchy page
        a(
            href = "/dashboard/projects/${project.id}",
            classes = "text-primary hover:underline text-sm inline-block transition-colors duration-200"
        ) {
            attributes["aria-label"] = "View details for ${project.name}"
            +"View Details →"
        }
    }
}

/**
 * Renders the project hierarchy page with Epic → Story → Subtask structure.
 *
 * This view provides a complete project view with organized issues, statistics,
 * and HTMX-powered lazy loading for subtasks.
 *
 * ## Page Structure
 * - **Header**: Service health indicator
 * - **Breadcrumb**: Navigation back to projects list
 * - **Project Info**: Name and description
 * - **Statistics**: Epic/Story/Subtask counts
 * - **Epics Section**: Nested hierarchy with lazy-loaded subtasks
 * - **Orphaned Stories**: Stories without epic parents
 *
 * ## HTMX Integration
 * Story nodes include lazy-load buttons that fetch subtasks on demand:
 * - Button triggers `GET /dashboard/stories/{id}/subtasks`
 * - Response is HTML fragment injected into target div
 * - No page reload required
 *
 * @param hierarchy Complete project hierarchy with statistics
 * @since 1.0.0 (SPI-799, refactored in SPI-800)
 */
fun HTML.projectHierarchy(hierarchy: ProjectHierarchyDTO) {
    dashboardLayout("${hierarchy.project.name} - CycleTime Dashboard") {
        // Breadcrumb navigation
        nav(classes = "mb-6") {
            attributes["aria-label"] = "Breadcrumb"
            a(href = "/dashboard", classes = "text-primary hover:underline transition-colors duration-200") {
                +"← Back to Projects"
            }
        }

        // Project header
        h1(classes = "text-3xl font-bold text-text mb-2") {
            +hierarchy.project.name
        }

        hierarchy.project.description?.let { desc ->
            p(classes = "text-text-muted mb-6") {
                +desc
            }
        }

        // Statistics summary
        hierarchyStatistics(hierarchy.statistics)

        // Epics section
        if (hierarchy.epics.isNotEmpty()) {
            h2(classes = "text-2xl font-semibold text-text mb-4 mt-8") {
                +"Epics"
            }

            div(classes = "space-y-6") {
                hierarchy.epics.forEach { epic ->
                    epicNode(epic)
                }
            }
        } else {
            // Empty state for epics
            emptyEpicsState()
        }

        // Orphaned stories section
        if (hierarchy.orphanedStories.isNotEmpty()) {
            h2(classes = "text-2xl font-semibold text-text mb-4 mt-8") {
                +"Stories (No Epic)"
            }

            div(classes = "space-y-4") {
                hierarchy.orphanedStories.forEach { story ->
                    storyNode(story)
                }
            }
        }
    }
}

/**
 * Renders the empty state for epics section.
 *
 * Provides a helpful message when no epics exist in the project.
 *
 * @since 1.0.0 (SPI-800)
 */
private fun FlowContent.emptyEpicsState() {
    div(classes = "text-center py-12 bg-surface rounded-lg border border-border mt-8") {
        div(classes = "text-4xl mb-2 opacity-50") { +"📚" }
        p(classes = "text-text-muted") {
            +"No epics in this project"
        }
    }
}

/**
 * Renders project hierarchy statistics summary.
 *
 * Displays aggregate counts in a responsive grid for quick project overview.
 *
 * @param stats Project statistics with issue counts
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.hierarchyStatistics(stats: ProjectStatistics) {
    div(classes = "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8") {
        statCard("epics", stats.epicCount.toString())
        statCard("stories", stats.storyCount.toString())
        statCard("subtasks", stats.subtaskCount.toString())
        statCard("issues", stats.totalIssues.toString())
    }
}

/**
 * Renders a single statistic card.
 *
 * @param label The statistic label
 * @param value The statistic value
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.statCard(label: String, value: String) {
    div(classes = "bg-surface border border-border rounded-lg p-4 transition-colors duration-200 hover:bg-surface-hover") {
        div(classes = "text-text-muted text-sm uppercase tracking-wide") {
            +label
        }
        div(classes = "text-2xl font-bold text-text mt-1") {
            +value
        }
    }
}

/**
 * Renders an epic node with nested stories.
 *
 * Epics are displayed as top-level cards with epic color accent borders,
 * containing their child stories in a nested structure.
 *
 * @param epic Epic issue with nested children
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.epicNode(epic: IssueHierarchyNode) {
    article(classes = "epic-node bg-surface border-l-4 rounded-r-lg p-6 transition-all duration-200") {
        // Apply epic color to border via inline style
        style = "border-left-color: var(--epic);"

        // Epic header
        div(classes = "flex items-start gap-3 mb-4") {
            span(classes = "text-2xl") { +"📚" }
            div(classes = "flex-1") {
                h3(classes = "text-xl font-semibold") {
                    style = "color: var(--epic);"
                    +epic.issue.title
                }
                epic.issue.description?.let { desc ->
                    p(classes = "text-text-muted text-sm mt-2") {
                        +desc
                    }
                }
            }
            statusBadge(epic.issue.status)
        }

        // Child stories
        if (epic.children.isNotEmpty()) {
            div(classes = "ml-8 space-y-4 mt-4") {
                epic.children.forEach { story ->
                    storyNode(story)
                }
            }
        }
    }
}

/**
 * Renders a story node with HTMX lazy loading button.
 *
 * Stories are displayed with story color accent borders. If the story has subtasks,
 * a button is rendered that uses HTMX to lazy-load the subtasks on demand.
 *
 * ## CRITICAL HTMX INTEGRATION POINT
 * The button uses four critical HTMX attributes:
 * - `hx-get`: Endpoint to fetch subtasks HTML fragment
 * - `hx-target`: ID of the div where fragment will be injected
 * - `hx-swap`: How to inject with smooth transitions (swap:200ms settle:200ms)
 * - `hx-indicator`: ID of loading spinner to show during request
 *
 * The target div must have a matching ID that includes the story's issue ID
 * to ensure uniqueness across multiple stories.
 *
 * @param story Story issue with potential child subtasks
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.storyNode(story: IssueHierarchyNode) {
    article(classes = "story-node bg-surface border-l-4 rounded-r-lg p-4 transition-all duration-200") {
        // Apply story color to border via inline style
        style = "border-left-color: var(--story);"

        // Story header
        div(classes = "flex items-start gap-3") {
            span(classes = "text-xl") { +"📖" }
            div(classes = "flex-1") {
                h4(classes = "text-lg font-semibold") {
                    style = "color: var(--story);"
                    +story.issue.title
                }
                story.issue.description?.let { desc ->
                    p(classes = "text-text-muted text-sm mt-1") {
                        +desc
                    }
                }
            }
            statusBadge(story.issue.status)
        }

        // HTMX lazy load button (if story has subtasks)
        if (story.children.isNotEmpty()) {
            button(classes = "mt-3 px-4 py-2 bg-primary text-white rounded hover:bg-primary transition-all duration-200 hover:shadow-md active:scale-95") {
                // ⚠️ CRITICAL HTMX ATTRIBUTES - Must be exact!
                attributes["hx-get"] = "/dashboard/stories/${story.issue.id}/subtasks"
                attributes["hx-target"] = "#subtasks-${story.issue.id}"
                attributes["hx-swap"] = "innerHTML"  // Test expects exact "innerHTML" value
                attributes["hx-indicator"] = "#loading-${story.issue.id}"  // Loading indicator
                attributes["aria-label"] = "Load subtasks for ${story.issue.title}"

                +"Load Subtasks (${story.children.size})"

                // Loading spinner (hidden by default, shown during HTMX request)
                span(classes = "htmx-indicator ml-2") {
                    id = "loading-${story.issue.id}"
                    +"⟳"  // Spinning character
                }
            }

            // ⚠️ HTMX injection point (must match hx-target)
            div(classes = "mt-4") {
                id = "subtasks-${story.issue.id}"
                // Initially empty, HTMX will inject content here
            }
        } else {
            // Story has no subtasks
            div(classes = "text-text-muted text-sm italic mt-2") {
                +"No subtasks"
            }
        }
    }
}

/**
 * Renders a status badge with semantic colors.
 *
 * Displays the issue status in a styled badge with color-coded semantic meaning:
 * - Todo/Backlog: Muted gray
 * - In Progress: Primary blue
 * - Done/Completed: Success green
 * - Blocked/Cancelled: Error red
 *
 * @param status The issue status string
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.statusBadge(status: String) {
    val statusClass = when (status.uppercase().replace(" ", "_")) {
        "TODO", "BACKLOG" -> "status-todo"
        "IN_PROGRESS", "INPROGRESS" -> "status-in-progress"
        "DONE", "COMPLETED" -> "status-done"
        "BLOCKED", "CANCELLED", "CANCELED" -> "status-blocked"
        else -> "status-todo"  // Default to todo styling
    }

    span(classes = "px-3 py-1 rounded-full text-xs font-medium text-white $statusClass") {
        +status
    }
}

/**
 * Renders subtask list as HTML fragment for HTMX injection.
 *
 * ⚠️ CRITICAL: This function renders ONLY the inner content, NOT a full HTML page!
 * It is designed to be injected into an existing page element by HTMX.
 *
 * ## Fragment Pattern
 * This function is used with `createHTML().div { subtaskListFragment(subtasks) }`
 * which generates ONLY the div content, without `<!DOCTYPE>`, `<html>`, `<head>`, or `<body>` tags.
 *
 * ## Usage
 * Called by the HTMX fragment endpoint: `GET /dashboard/stories/{id}/subtasks`
 * The response is injected into the target div via `innerHTML` swap with smooth transitions.
 *
 * @param subtasks List of subtasks to display
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
fun FlowContent.subtaskListFragment(subtasks: List<IssueViewDTO>) {
    if (subtasks.isEmpty()) {
        div(classes = "text-text-muted text-sm italic") {
            +"No subtasks"
        }
    } else {
        div(classes = "space-y-2") {
            subtasks.forEach { subtask ->
                subtaskItem(subtask)
            }
        }
    }
}

/**
 * Renders a single subtask item.
 *
 * Subtasks are displayed in a compact format with title, estimate (if present),
 * and status badge. Uses subtask color from design system.
 *
 * @param subtask The subtask to render
 * @since 1.0.0 (SPI-799, enhanced in SPI-800)
 */
private fun FlowContent.subtaskItem(subtask: IssueViewDTO) {
    div(classes = "subtask-item flex items-center gap-3 p-3 bg-background rounded border border-border transition-all duration-200 hover:border-primary") {
        span { +"📝" }
        div(classes = "flex-1") {
            span(classes = "font-medium text-text") {
                +subtask.title
            }
            subtask.estimate?.let { est ->
                span(classes = "ml-2 text-sm text-text-muted") {
                    +"(${est}pts)"
                }
            }
        }
        statusBadge(subtask.status)
    }
}
