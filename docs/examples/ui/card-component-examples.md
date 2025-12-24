---
title: "Card Component Examples"
type: example
domain: [ui, frontend, components]
description: "Working examples of card components using Ktor HTML DSL and Tailwind CSS"
dependencies: [../../patterns/ui/tailwind-design-system.md, ../../reference/ui/design-tokens.md]
related: [button-component-examples.md, badge-navigation-examples.md]
keywords: [card, container, project, issue, ktor-html-dsl, tailwind, components, ui]
tested: false
last_updated: 2025-10-28
---

# Card Component Examples

## Overview

This document provides complete working examples of card components built with Ktor's HTML DSL and styled using the Tailwind design system. Cards are content containers used to display projects, issues, notifications, and other structured data. They support hover effects, progress indicators, hierarchical layouts, and semantic styling.

**Key Features**:
- Type-safe card generation with Kotlin HTML DSL
- Multiple card types (project, issue, info, stat, empty state)
- Hover effects and interactive states
- Progress indicators and metrics
- Hierarchical visual structure (Epic → Story → Subtask)
- Semantic color coding for different issue types

## Prerequisites

- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Color tokens and utility patterns
- [Design Tokens Reference](../../reference/ui/design-tokens.md) - Brand and neutral color values
- [Badge & Navigation Examples](badge-navigation-examples.md) - Status badges used in cards
- Basic understanding of Ktor HTML DSL
- Familiarity with Tailwind CSS utility classes

## Live References

These mockups demonstrate card components in complete, working page contexts:

### Home Page Project List

**Mockup**: [home-page.html](../../../src/main/resources/static/mockups/home-page.html) | **Catalog**: [Mockup Catalog](../../reference/ui/mockup-catalog.md#home-page)

Demonstrates project cards with completion tracking in a responsive grid layout:

**Key patterns implemented**:
- **Responsive Grid**: Three-column layout (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with 24px gap
- **Progress Visualization**: Progress bars with conditional colors:
  - Brand-500 (#3ba3c9) for in-progress projects (1-99%)
  - Success-500 (#22c55e) for 100% complete projects
  - Empty state for 0% complete projects
- **Text Handling**: Smart truncation with `line-clamp-2` for descriptions, `truncate` for long titles
- **Edge Cases**: Handles missing descriptions with placeholder text, extreme completion percentages (0%/100%)
- **Accessibility**: ARIA progressbar with valuenow/valuemin/valuemax attributes, semantic article elements
- **Interactive States**: Hover effects (border color, shadow, subtle lift) with smooth transitions

**Sample projects demonstrating**:
- 75% complete: Standard progress visualization with brand color
- 100% complete: Green success color treatment
- 25% complete: Early-stage project
- 0% complete: "Not started" state with empty progress bar
- 50% complete with no description: Missing data edge case with placeholder text
- 90% complete with long name: Text truncation edge case

**Related sections in this document**:
- [Project Cards](#example-1-project-card) - Detailed component breakdown
- [Progress Indicators](#explanation) - Progress bar implementation patterns
- [Empty States](#example-5-empty-state-card) - "No projects yet" pattern (in mockup HTML comments)
- [Text Truncation](#explanation-1) - Line clamp and truncate utilities

---

## Example 1: Project Card

Project cards display project metadata, statistics, and progress in a grid layout. They're interactive and navigate to project details on click.

### Complete Working Code

```kotlin
package io.spiralhouse.cycletime.ui.components

import kotlinx.html.*
import java.time.Instant

/**
 * Project card with hover effects and progress bar.
 */
fun FlowContent.projectCard(project: ProjectViewDTO) {
    article(
        classes = """
            bg-neutral-900 border border-neutral-700 rounded-lg p-6
            hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5
            transition-all cursor-pointer
        """.trimIndent().replace("\n", " ")
    ) {
        role = "button"
        tabIndex = "0"
        attributes["aria-label"] = "View ${project.name} project details"

        // Header: Title and description
        header(classes = "mb-4") {
            h3(classes = "text-xl font-semibold text-neutral-100 mb-2") {
                +project.name
            }

            project.description?.let { desc ->
                p(classes = "text-sm text-neutral-400 line-clamp-2") {
                    +desc
                }
            }
        }

        // Statistics row
        div(classes = "flex items-center gap-4 text-sm text-neutral-400 mb-3") {
            // Issue count
            span(classes = "flex items-center gap-1") {
                issueIcon()
                span { +"${project.totalIssues} issues" }
            }

            // Points count
            span(classes = "flex items-center gap-1") {
                chartIcon()
                span { +"${project.totalPoints} points" }
            }

            // Completion percentage
            span(classes = "font-semibold text-brand-400") {
                +"${project.completionPercent}% complete"
            }
        }

        // Progress bar
        div(classes = "w-full bg-neutral-800 rounded-full h-2 overflow-hidden") {
            div(
                classes = "bg-brand-500 h-2 rounded-full transition-all"
            ) {
                style = "width: ${project.completionPercent}%;"
            }
        }
    }
}

data class ProjectViewDTO(
    val id: String,
    val name: String,
    val description: String?,
    val totalIssues: Int,
    val totalPoints: Int,
    val completionPercent: Int,
    val createdAt: Instant,
    val updatedAt: Instant
)

// Helper icons
fun FlowContent.issueIcon() {
    svg(classes = "w-4 h-4") {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        unsafe {
            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>""")
        }
    }
}

fun FlowContent.chartIcon() {
    svg(classes = "w-4 h-4") {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        unsafe {
            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>""")
        }
    }
}

// Usage in grid layout:
fun FlowContent.projectsGrid(projects: List<ProjectViewDTO>) {
    div(classes = "grid md:grid-cols-2 lg:grid-cols-3 gap-6") {
        projects.forEach { project ->
            projectCard(project)
        }
    }
}
```

### Explanation

**Hover Effects**:
- `hover:border-brand-500` changes border color on hover
- `hover:shadow-lg` adds elevation shadow
- `hover:-translate-y-0.5` subtle upward movement (lift effect)
- `transition-all` smooths all property changes
- `cursor-pointer` signals interactivity

**Semantic HTML**:
- `<article>` for self-contained content
- `role="button"` for screen readers (card is clickable)
- `tabIndex="0"` enables keyboard navigation
- `aria-label` describes click action

**Progress Visualization**:
- Progress bar uses nested div approach
- Outer div: gray background (`bg-neutral-800`)
- Inner div: brand color (`bg-brand-500`) with dynamic width
- `overflow-hidden` clips progress bar at corners
- `rounded-full` creates pill shape (height 8px = `h-2`)

**Text Truncation**:
- `line-clamp-2` limits description to 2 lines
- Requires Tailwind's line-clamp plugin
- Adds ellipsis (`...`) for overflow text

### Live Demo

See this component: [Cards - Project Card](../../../../src/main/resources/static/mockups/design-system.html#cards)

## Example 2: Issue Card (Hierarchical)

Issue cards display Epic, Story, and Subtask items with visual hierarchy indicators.

### Complete Working Code

```kotlin
/**
 * Issue card with left border color coding.
 */
fun FlowContent.issueCard(
    issue: IssueViewDTO,
    type: IssueType,
    indentLevel: Int = 0
) {
    val (borderColor, iconEmoji, badgeColor) = issueTypeStyle(type)

    val marginLeft = when (indentLevel) {
        0 -> ""          // Epic: No margin
        1 -> "ml-6"      // Story: 24px
        2 -> "ml-12"     // Subtask: 48px
        else -> "ml-6"
    }

    article(
        classes = """
            bg-neutral-900 border-l-4 $borderColor rounded-lg p-4
            hover:bg-neutral-850 transition-all
            $marginLeft
        """.trimIndent().replace("\n", " ")
    ) {
        div(classes = "flex items-start justify-between") {
            div(classes = "flex-1") {
                // Badge row: Icon, ID, Type, Status
                div(classes = "flex items-center gap-2 mb-2") {
                    // Icon emoji
                    span(classes = "text-xl") {
                        attributes["aria-hidden"] = "true"
                        +iconEmoji
                    }

                    // Issue ID
                    span(classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium $badgeColor border") {
                        +issue.identifier
                    }

                    // Issue type
                    span(classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium $badgeColor") {
                        +type.name.lowercase().replaceFirstChar { it.uppercase() }
                    }

                    // Status badge
                    statusBadge(issue.status)

                    // Estimate (if present)
                    issue.estimate?.let { points ->
                        span(classes = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-900/50 text-brand-200") {
                            +"$points points"
                        }
                    }
                }

                // Issue title
                h3(classes = "text-base font-medium text-neutral-100 mb-1") {
                    +issue.title
                }

                // Metadata (subtasks count)
                if (type == IssueType.EPIC) {
                    p(classes = "text-sm text-neutral-400") {
                        +"${issue.childCount} subtasks · ${issue.totalPoints} points"
                    }
                } else if (type == IssueType.STORY && issue.childCount > 0) {
                    p(classes = "text-sm text-neutral-400") {
                        +"${issue.childCount} subtasks"
                    }
                }
            }

            // Expand button (for items with children)
            if (issue.childCount > 0) {
                button(
                    classes = "p-1 hover:bg-neutral-800 rounded transition-colors",
                    type = ButtonType.button
                ) {
                    attributes["aria-label"] = "Expand ${type.name.lowercase()}"
                    attributes["aria-expanded"] = "false"

                    svg(classes = "w-5 h-5 text-neutral-400") {
                        attributes["fill"] = "none"
                        attributes["stroke"] = "currentColor"
                        attributes["viewBox"] = "0 0 24 24"
                        unsafe {
                            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>""")
                        }
                    }
                }
            }
        }
    }
}

enum class IssueType {
    EPIC, STORY, SUBTASK
}

data class IssueViewDTO(
    val id: String,
    val identifier: String,  // e.g., "SPI-835"
    val title: String,
    val status: String,
    val estimate: Int?,
    val childCount: Int,
    val totalPoints: Int
)

/**
 * Returns (borderColor, iconEmoji, badgeColor) for issue type.
 */
fun issueTypeStyle(type: IssueType): Triple<String, String, String> {
    return when (type) {
        IssueType.EPIC -> Triple(
            "border-orange-500",
            "📊",
            "bg-orange-900/50 text-orange-200 border-orange-700"
        )
        IssueType.STORY -> Triple(
            "border-blue-500",
            "📖",
            "bg-blue-900/50 text-blue-200 border-blue-700"
        )
        IssueType.SUBTASK -> Triple(
            "border-teal-500",
            "✓",
            "bg-teal-900/50 text-teal-200 border-teal-700"
        )
    }
}

// Usage with hierarchy:
fun FlowContent.issueHierarchy(
    epic: IssueViewDTO,
    stories: List<IssueViewDTO>,
    subtasks: Map<String, List<IssueViewDTO>>
) {
    div(classes = "space-y-3") {
        // Epic
        issueCard(epic, IssueType.EPIC, indentLevel = 0)

        // Stories under epic
        stories.forEach { story ->
            issueCard(story, IssueType.STORY, indentLevel = 1)

            // Subtasks under story
            subtasks[story.id]?.forEach { subtask ->
                issueCard(subtask, IssueType.SUBTASK, indentLevel = 2)
            }
        }
    }
}
```

### Explanation

**Visual Hierarchy**:
- Left border color coding: Orange (Epic), Blue (Story), Teal (Subtask)
- Indentation levels: 0px, 24px (`ml-6`), 48px (`ml-12`)
- Icon emojis: 📊 (Epic), 📖 (Story), ✓ (Subtask)
- Larger cards for higher-level items

**Border Styling**:
- `border-l-4` creates thick left border (4px)
- Border color matches issue type
- `rounded-lg` rounds all corners (border doesn't affect rounding)

**Expandable Items**:
- Chevron button appears when `childCount > 0`
- `aria-expanded` tracks expansion state
- Requires JavaScript to toggle child visibility

### Live Demo

See this component: [Cards - Issue Card](../../../../src/main/resources/static/mockups/design-system.html#cards)

## Example 3: Info Card (Semantic Variants)

Info cards display notifications, alerts, and feedback messages with semantic color coding.

### Complete Working Code

```kotlin
/**
 * Info card with semantic variant (success, warning, error, info).
 */
fun FlowContent.infoCard(
    variant: InfoVariant,
    title: String,
    message: String,
    dismissible: Boolean = true
) {
    val (bgColor, borderColor, iconColor, textColor, titleColor) = infoVariantStyle(variant)

    div(classes = "bg-$bgColor border border-$borderColor rounded-lg p-4") {
        div(classes = "flex items-start gap-3") {
            // Icon
            svg(classes = "w-6 h-6 text-$iconColor flex-shrink-0") {
                attributes["fill"] = "none"
                attributes["stroke"] = "currentColor"
                attributes["viewBox"] = "0 0 24 24"

                when (variant) {
                    InfoVariant.SUCCESS -> unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
                    }
                    InfoVariant.WARNING -> unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>""")
                    }
                    InfoVariant.ERROR -> unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
                    }
                    InfoVariant.INFO -> unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
                    }
                }
            }

            // Content
            div(classes = "flex-1") {
                h4(classes = "text-sm font-semibold text-$titleColor mb-1") {
                    +title
                }

                p(classes = "text-sm text-$textColor") {
                    +message
                }
            }

            // Dismiss button
            if (dismissible) {
                button(
                    classes = "text-$iconColor hover:text-${iconColor.replace("400", "300")} transition-colors",
                    type = ButtonType.button
                ) {
                    attributes["aria-label"] = "Dismiss $variant message"

                    svg(classes = "w-5 h-5") {
                        attributes["fill"] = "none"
                        attributes["stroke"] = "currentColor"
                        attributes["viewBox"] = "0 0 24 24"
                        unsafe {
                            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>""")
                        }
                    }
                }
            }
        }
    }
}

enum class InfoVariant {
    SUCCESS, WARNING, ERROR, INFO
}

/**
 * Returns (bgColor, borderColor, iconColor, textColor, titleColor) for variant.
 */
fun infoVariantStyle(variant: InfoVariant): Tuple5<String, String, String, String, String> {
    return when (variant) {
        InfoVariant.SUCCESS -> Tuple5(
            "green-900/20", "green-700", "green-400", "green-200", "green-300"
        )
        InfoVariant.WARNING -> Tuple5(
            "yellow-900/20", "yellow-700", "yellow-400", "yellow-200", "yellow-300"
        )
        InfoVariant.ERROR -> Tuple5(
            "red-900/20", "red-700", "red-400", "red-200", "red-300"
        )
        InfoVariant.INFO -> Tuple5(
            "blue-900/20", "blue-700", "blue-400", "blue-200", "blue-300"
        )
    }
}

data class Tuple5<A, B, C, D, E>(val a: A, val b: B, val c: C, val d: D, val e: E)

// Usage examples:
fun FlowContent.notificationExamples() {
    div(classes = "space-y-4") {
        infoCard(
            variant = InfoVariant.SUCCESS,
            title = "Success",
            message = "Your changes have been saved successfully. The project status is now updated."
        )

        infoCard(
            variant = InfoVariant.WARNING,
            title = "Warning",
            message = "This action will affect 12 related issues. Review dependencies before proceeding."
        )

        infoCard(
            variant = InfoVariant.ERROR,
            title = "Error",
            message = "Failed to update project status. Please check your connection and try again."
        )

        infoCard(
            variant = InfoVariant.INFO,
            title = "Information",
            message = "You have 3 unread notifications. Click here to view them in your inbox."
        )
    }
}
```

### Explanation

**Color Semantics**:
- Success: Green (positive confirmation)
- Warning: Yellow (caution, requires attention)
- Error: Red (failure, critical issue)
- Info: Blue (neutral information)

**Background Transparency**:
- `bg-green-900/20` creates subtle tinted background
- `/20` applies 20% opacity
- Dark background with translucent overlay
- Border uses solid color for definition

**Dismissible Behavior**:
- `dismissible` parameter controls X button visibility
- Requires JavaScript to handle dismiss action
- Typically fades out or slides away on dismiss

### Live Demo

See this component: [Cards - Info Card](../../../../src/main/resources/static/mockups/design-system.html#cards)

## Example 4: Stat Card

Stat cards display key metrics with large numbers and supporting context.

### Complete Working Code

```kotlin
/**
 * Stat card for displaying metrics.
 */
fun FlowContent.statCard(
    label: String,
    value: String,
    change: StatChange? = null,
    icon: (FlowContent.() -> Unit)? = null
) {
    div(classes = "bg-neutral-900 border border-neutral-700 rounded-lg p-6") {
        div(classes = "flex items-start justify-between mb-4") {
            // Label
            p(classes = "text-sm font-medium text-neutral-400") {
                +label
            }

            // Icon (if provided)
            icon?.let {
                div(classes = "p-2 bg-neutral-800 rounded") {
                    it()
                }
            }
        }

        // Value
        p(classes = "text-3xl font-bold text-neutral-100 mb-2") {
            +value
        }

        // Change indicator (if provided)
        change?.let { ch ->
            val (color, arrow) = if (ch.isPositive) {
                "text-green-400" to "↑"
            } else {
                "text-red-400" to "↓"
            }

            p(classes = "text-sm $color flex items-center gap-1") {
                span { +arrow }
                span { +"${ch.percentage}% ${ch.label}" }
            }
        }
    }
}

data class StatChange(
    val percentage: Int,
    val label: String,
    val isPositive: Boolean
)

// Usage examples:
fun FlowContent.dashboardStats() {
    div(classes = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6") {
        statCard(
            label = "Total Projects",
            value = "24",
            change = StatChange(12, "from last month", isPositive = true)
        ) {
            projectIcon()
        }

        statCard(
            label = "Active Issues",
            value = "187",
            change = StatChange(8, "from last week", isPositive = false)
        ) {
            issueIcon()
        }

        statCard(
            label = "Completed Tasks",
            value = "1,429",
            change = StatChange(23, "this month", isPositive = true)
        ) {
            checkIcon()
        }

        statCard(
            label = "Team Velocity",
            value = "42 pts",
            change = StatChange(5, "average", isPositive = true)
        ) {
            chartIcon()
        }
    }
}

fun FlowContent.checkIcon() {
    svg(classes = "w-5 h-5 text-neutral-400") {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        unsafe {
            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>""")
        }
    }
}
```

### Explanation

**Visual Hierarchy**:
- Label: Small, muted (`text-sm text-neutral-400`)
- Value: Large, prominent (`text-3xl font-bold`)
- Change: Small, colored based on direction

**Change Indicator**:
- Positive changes: Green (`text-green-400`) with ↑
- Negative changes: Red (`text-red-400`) with ↓
- Percentage + descriptive label ("from last month")

**Grid Layout**:
- Responsive: 1 col (mobile), 2 cols (tablet), 4 cols (desktop)
- Equal height cards with `grid`
- Consistent spacing with `gap-6`

## Example 5: Empty State Card

Empty state cards guide users when no content is available.

### Complete Working Code

```kotlin
/**
 * Empty state card with optional action button.
 */
fun FlowContent.emptyStateCard(
    icon: String = "📭",
    title: String,
    message: String,
    actionLabel: String? = null,
    actionHref: String? = null
) {
    div(classes = "bg-neutral-900 border border-neutral-700 rounded-lg p-12 text-center") {
        // Large icon
        div(classes = "text-6xl mb-4") {
            +icon
        }

        // Title
        h3(classes = "text-lg font-semibold text-neutral-200 mb-2") {
            +title
        }

        // Message
        p(classes = "text-sm text-neutral-400 mb-6") {
            +message
        }

        // Optional action button
        if (actionLabel != null && actionHref != null) {
            a(
                href = actionHref,
                classes = """
                    inline-block px-4 py-2
                    bg-brand-500 text-white rounded
                    hover:bg-brand-600
                    transition-colors
                """.trimIndent().replace("\n", " ")
            ) {
                +actionLabel
            }
        }
    }
}

// Usage examples:
fun FlowContent.emptyProjectsList() {
    emptyStateCard(
        icon = "📚",
        title = "No projects yet",
        message = "Create your first project to get started with CycleTime.",
        actionLabel = "Create Project",
        actionHref = "/projects/new"
    )
}

fun FlowContent.noSearchResults() {
    emptyStateCard(
        icon = "🔍",
        title = "No results found",
        message = "Try adjusting your search terms or filters."
    )
}
```

### Explanation

**Centered Layout**:
- `text-center` centers all content
- Large padding (`p-12`) creates spacious feel
- Icon, title, message, action vertical flow

**Icon Selection**:
- Large emoji icon (`text-6xl` = 60px)
- Choose emoji that matches context:
  - 📚 Projects
  - 🔍 Search
  - 📭 Inbox
  - ✅ Tasks

**Optional Action**:
- Call-to-action button for next step
- Only shown when both label and href provided
- Helps users recover from empty state

## Best Practices

### 1. Consistent Card Styling

```kotlin
// ✅ Good: Consistent base styles across card types
val baseCardClasses = "bg-neutral-900 border border-neutral-700 rounded-lg"

projectCard: "$baseCardClasses p-6 hover:border-brand-500"
issueCard: "$baseCardClasses p-4 border-l-4"
statCard: "$baseCardClasses p-6"
```

**Rule**: Maintain consistent background, border, and rounding across all card types.

### 2. Proper Hover Affordances

```kotlin
// ✅ Good: Clear hover states for interactive cards
"hover:border-brand-500 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"

// ❌ Bad: No visual feedback
"cursor-pointer"
```

**Rule**: Interactive cards MUST have visible hover effects (border, shadow, or transform).

### 3. Semantic Color Usage

```kotlin
// ✅ Good: Semantic meaning
InfoVariant.SUCCESS // Green for positive
InfoVariant.ERROR   // Red for negative

// ❌ Bad: Arbitrary colors
"bg-purple-500"  // No meaning
```

**Rule**: Use color to convey meaning (success, warning, error, info).

## Common Issues

### Issue: Cards Have Different Heights in Grid

**Problem**: Flexbox or grid items with varying content heights.

**Solution**: Use CSS Grid for equal height cards:

```kotlin
div(classes = "grid grid-cols-3 gap-6") {
    // All cards will be same height
}
```

### Issue: Hover Transform Causes Layout Shift

**Problem**: `-translate-y` moves card up, shifting surrounding content.

**Solution**: Use margin compensation or position absolute:

```kotlin
// Option 1: Margin bottom compensation
"hover:-translate-y-0.5 mb-0.5"

// Option 2: Absolute positioning (more complex)
```

### Issue: Long Text Breaks Card Layout

**Problem**: Long titles or descriptions overflow card width.

**Solution**: Use text truncation:

```kotlin
// Single line: truncate
"truncate"

// Multiple lines: line-clamp
"line-clamp-2"
```

## Related Examples

- [Button Component Examples](button-component-examples.md) - Buttons within cards
- [Badge & Navigation Examples](badge-navigation-examples.md) - Status badges in cards
- [Form Component Examples](form-component-examples.md) - Form cards

## References

- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)
- [Design Tokens](../../reference/ui/design-tokens.md)
- [Ktor HTML DSL Documentation](https://ktor.io/docs/html-dsl.html)
