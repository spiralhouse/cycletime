---
title: "Badge & Navigation Component Examples"
type: example
domain: [ui, frontend, components]
description: "Working examples of badges and navigation patterns using Ktor HTML DSL and Tailwind CSS"
dependencies: [../../patterns/ui/tailwind-design-system.md, ../../reference/ui/design-tokens.md]
related: [card-component-examples.md, button-component-examples.md]
keywords: [badge, status, navigation, header, breadcrumb, tabs, ktor-html-dsl, tailwind]
tested: false
last_updated: 2025-10-28
---

# Badge & Navigation Component Examples

## Overview

This document provides complete working examples of badge and navigation components built with Ktor's HTML DSL and styled using the Tailwind design system. Badges display status, counts, and metadata, while navigation patterns include headers, breadcrumbs, and tab controls.

**Key Features**:
- Type-safe badge and navigation generation with Kotlin HTML DSL
- Six semantic status badges (Backlog, Todo, In Progress, In Review, Done, Canceled)
- Count badges for notifications and metrics
- Responsive navigation patterns (header, breadcrumbs, tabs)
- Accessibility-first design (ARIA labels, semantic HTML)

## Prerequisites

- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Color tokens and utility patterns
- [Design Tokens Reference](../../reference/ui/design-tokens.md) - Brand and neutral color values
- [Card Component Examples](card-component-examples.md) - Badges used in cards
- Basic understanding of Ktor HTML DSL
- Familiarity with navigation patterns

## Example 1: Status Badges (6 States)

Status badges indicate issue workflow state using semantic color coding.

### Complete Working Code

```kotlin
package io.spiralhouse.cycletime.ui.components

import kotlinx.html.*

/**
 * Status badge with semantic color coding.
 */
fun FlowContent.statusBadge(status: String, withDot: Boolean = false) {
    val (bgColor, textColor, borderColor) = statusBadgeColors(status)

    span(classes = "inline-flex items-center ${if (withDot) "gap-1.5" else ""} px-2.5 py-0.5 rounded text-xs font-medium $bgColor $textColor border $borderColor") {
        // Optional status dot
        if (withDot) {
            span(classes = "w-1.5 h-1.5 rounded-full ${textColor.replace("text", "bg").replace("300", "400")}") {
                // Dot inherits color from text
            }
        }

        +status.replaceFirstChar { it.uppercase() }
    }
}

/**
 * Returns (bgColor, textColor, borderColor) for status.
 */
fun statusBadgeColors(status: String): Triple<String, String, String> {
    return when (status.lowercase().replace(" ", "-")) {
        "backlog" -> Triple("bg-gray-800", "text-gray-300", "border-gray-700")
        "todo" -> Triple("bg-blue-900/50", "text-blue-300", "border-blue-700")
        "in-progress", "in progress" -> Triple("bg-yellow-900/50", "text-yellow-300", "border-yellow-700")
        "in-review", "in review" -> Triple("bg-purple-900/50", "text-purple-300", "border-purple-700")
        "done", "completed" -> Triple("bg-green-900/50", "text-green-300", "border-green-700")
        "canceled", "cancelled" -> Triple("bg-red-900/50", "text-red-300", "border-red-700")
        else -> Triple("bg-gray-800", "text-gray-300", "border-gray-700")
    }
}

// Usage examples:
fun FlowContent.statusBadgeExamples() {
    div(classes = "flex flex-wrap gap-3") {
        statusBadge("Backlog")
        statusBadge("Todo")
        statusBadge("In Progress")
        statusBadge("In Review")
        statusBadge("Done")
        statusBadge("Canceled")
    }

    // With status dots
    div(classes = "flex flex-wrap gap-3 mt-4") {
        statusBadge("In Progress", withDot = true)
        statusBadge("Done", withDot = true)
    }
}
```

### Explanation

**Color Semantics**:
- **Backlog**: Gray - Not started, low priority
- **Todo**: Blue - Ready to start, planned
- **In Progress**: Yellow - Currently being worked on
- **In Review**: Purple - Under review, awaiting approval
- **Done**: Green - Completed successfully
- **Canceled**: Red - Abandoned or rejected

**Opacity Usage**:
- `/50` suffix applies 50% opacity: `bg-yellow-900/50`
- Creates subtle, translucent backgrounds
- Border uses solid color for definition
- Text uses lighter shade for contrast (e.g., `yellow-300` on `yellow-900/50`)

**Status Dot**:
- Optional visual indicator: `withDot = true`
- Small circle (`w-1.5 h-1.5`) with `rounded-full`
- Color matches text color (converted to background)
- Adds `gap-1.5` spacing when present

**Text Transformation**:
- `replaceFirstChar { it.uppercase() }` capitalizes first letter
- Handles hyphenated statuses: "in-progress" → "In-progress"

Uses [Status Colors](../../reference/ui/design-tokens.md#status-colors) from design tokens.

### Live Demo

See this component: [Badges - Status Badges](../../../../src/main/resources/static/mockups/design-system.html#badges)

## Example 2: Count Badges

Count badges display numeric indicators for notifications, unread items, or metrics.

### Complete Working Code

```kotlin
/**
 * Count badge (circular notification indicator).
 */
fun FlowContent.countBadge(count: Int, variant: BadgeVariant = BadgeVariant.BRAND) {
    val variantClasses = when (variant) {
        BadgeVariant.BRAND -> "bg-brand-500 text-white"
        BadgeVariant.DANGER -> "bg-red-500 text-white"
        BadgeVariant.SUCCESS -> "bg-green-500 text-white"
    }

    span(
        classes = """
            inline-flex items-center justify-center
            w-6 h-6 text-xs font-bold
            rounded-full $variantClasses
        """.trimIndent().replace("\n", " ")
    ) {
        +if (count > 99) "99+" else count.toString()
    }
}

/**
 * Notification button with count badge.
 */
fun FlowContent.notificationButton(count: Int) {
    div(classes = "relative inline-block") {
        button(
            classes = "px-4 py-2 text-base font-medium rounded bg-neutral-700 text-neutral-100",
            type = ButtonType.button
        ) {
            +"Notifications"
        }

        // Count badge positioned absolutely
        if (count > 0) {
            span(classes = "absolute -top-2 -right-2") {
                countBadge(count, variant = BadgeVariant.BRAND)
            }
        }
    }
}

/**
 * Icon with count badge.
 */
fun FlowContent.notificationIcon(count: Int) {
    div(classes = "relative inline-block") {
        svg(classes = "w-6 h-6 text-neutral-400") {
            attributes["fill"] = "none"
            attributes["stroke"] = "currentColor"
            attributes["viewBox"] = "0 0 24 24"
            unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>""")
            }
        }

        // Smaller count badge for icons
        if (count > 0) {
            span(classes = "absolute -top-1 -right-1") {
                span(
                    classes = "inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full"
                ) {
                    +if (count > 9) "9+" else count.toString()
                }
            }
        }
    }
}

enum class BadgeVariant {
    BRAND, DANGER, SUCCESS
}

// Usage examples:
fun FlowContent.countBadgeExamples() {
    div(classes = "flex items-center gap-4") {
        notificationButton(count = 5)
        notificationIcon(count = 3)
    }
}
```

### Explanation

**Positioning**:
- Parent: `relative inline-block` establishes positioning context
- Badge: `absolute -top-2 -right-2` positions outside parent bounds
- Negative values (`-top-2`) overlap parent edge
- Creates "floating" effect common in notification badges

**Size Variants**:
- Button badges: `w-6 h-6` (24px) for visibility
- Icon badges: `w-5 h-5` (20px) to avoid overwhelming icon
- Font: `text-xs font-bold` for readability at small sizes

**Count Handling**:
- Display actual count: "1", "5", "12"
- Truncate large counts: "99+" (>99), "9+" (>9 for icons)
- Hide badge when count is 0
- Prevents layout breaking with large numbers

**Variant Colors**:
- `BRAND`: Blue for general notifications
- `DANGER`: Red for alerts, errors, warnings
- `SUCCESS`: Green for positive notifications

### Live Demo

See this component: [Badges - Count Badges](../../../../src/main/resources/static/mockups/design-system.html#badges)

## Example 3: Pill Badges

Pill badges are fully rounded badges used for tags, labels, and metadata.

### Complete Working Code

```kotlin
/**
 * Pill badge (fully rounded).
 */
fun FlowContent.pillBadge(
    label: String,
    variant: PillVariant = PillVariant.DEFAULT
) {
    val variantClasses = when (variant) {
        PillVariant.DEFAULT -> "bg-neutral-800 text-neutral-300 border-neutral-700"
        PillVariant.BRAND -> "bg-brand-900/50 text-brand-200 border-brand-700"
        PillVariant.SUCCESS -> "bg-green-900/50 text-green-200 border-green-700"
        PillVariant.PURPLE -> "bg-purple-900/50 text-purple-200 border-purple-700"
    }

    span(
        classes = """
            inline-flex items-center px-3 py-1
            rounded-full text-xs font-medium
            border $variantClasses
        """.trimIndent().replace("\n", " ")
    ) {
        +label
    }
}

/**
 * Outlined pill badge (border only).
 */
fun FlowContent.outlinedPillBadge(
    label: String,
    borderColor: String = "brand-500",
    textColor: String = "brand-300"
) {
    span(
        classes = """
            inline-flex items-center px-2.5 py-0.5
            rounded text-xs font-medium
            border-2 border-$borderColor text-$textColor
        """.trimIndent().replace("\n", " ")
    ) {
        +label
    }
}

enum class PillVariant {
    DEFAULT, BRAND, SUCCESS, PURPLE
}

// Usage examples:
fun FlowContent.pillBadgeExamples() {
    div(classes = "flex flex-wrap gap-3") {
        // Filled pills
        pillBadge("New Feature", variant = PillVariant.BRAND)
        pillBadge("Beta", variant = PillVariant.PURPLE)
        pillBadge("Active", variant = PillVariant.SUCCESS)

        // Outlined pills
        outlinedPillBadge("Primary", borderColor = "brand-500", textColor = "brand-300")
        outlinedPillBadge("Secondary", borderColor = "neutral-600", textColor = "neutral-300")
    }
}
```

### Explanation

**Shape**:
- `rounded-full` creates fully rounded ends (pill shape)
- Standard badges use `rounded` (subtle rounding)
- Pills stand out more due to distinctive shape

**Outlined Variant**:
- `border-2` creates thicker border (2px vs 1px)
- No background color (transparent)
- Use for emphasis without color fill
- Higher contrast with dark backgrounds

**Use Cases**:
- Filled pills: Tags, categories, feature flags
- Outlined pills: Primary/secondary labels, filters
- Status indicators with pill shape for visual variety

### Live Demo

See this component: [Badges - Pill Badges](../../../../src/main/resources/static/mockups/design-system.html#badges)

## Example 4: Primary Navigation Bar

Navigation bars provide top-level navigation with responsive mobile support.

### Complete Working Code

```kotlin
/**
 * Primary navigation bar with responsive mobile menu.
 */
fun FlowContent.primaryNavigation(
    brandName: String,
    activeRoute: String,
    navItems: List<NavItem>
) {
    nav(
        classes = "bg-neutral-900 border border-neutral-700 rounded-lg"
    ) {
        attributes["aria-label"] = "Primary navigation"

        div(classes = "px-6 py-4") {
            div(classes = "flex items-center justify-between") {
                // Left: Brand and nav items
                div(classes = "flex items-center gap-8") {
                    // Brand/logo
                    div(classes = "text-xl font-bold text-brand-400") {
                        +brandName
                    }

                    // Desktop navigation items
                    div(classes = "hidden md:flex items-center gap-6") {
                        navItems.forEach { item ->
                            navLink(
                                label = item.label,
                                href = item.href,
                                active = item.href == activeRoute
                            )
                        }
                    }
                }

                // Right: Mobile menu button
                button(
                    classes = "md:hidden p-2 text-neutral-400 hover:text-neutral-200",
                    type = ButtonType.button
                ) {
                    attributes["aria-label"] = "Open menu"

                    svg(classes = "w-6 h-6") {
                        attributes["fill"] = "none"
                        attributes["stroke"] = "currentColor"
                        attributes["viewBox"] = "0 0 24 24"
                        unsafe {
                            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>""")
                        }
                    }
                }
            }
        }
    }
}

/**
 * Navigation link with active state.
 */
fun FlowContent.navLink(label: String, href: String, active: Boolean) {
    a(
        href = href,
        classes = """
            text-sm font-medium pb-1
            ${if (active) "text-brand-400 border-b-2 border-brand-400" else "text-neutral-400 hover:text-neutral-200"}
            transition-colors
        """.trimIndent().replace("\n", " ")
    ) {
        if (active) {
            attributes["aria-current"] = "page"
        }
        +label
    }
}

data class NavItem(val label: String, val href: String)

// Usage example:
fun FlowContent.appNavigation(currentPath: String) {
    primaryNavigation(
        brandName = "CycleTime",
        activeRoute = currentPath,
        navItems = listOf(
            NavItem("Projects", "/projects"),
            NavItem("Issues", "/issues"),
            NavItem("Settings", "/settings"),
            NavItem("System Status", "/status")
        )
    )
}
```

### Explanation

**Active State Indicators**:
- Active link: Brand color text + bottom border (underline)
- Inactive links: Muted gray with hover effect
- `aria-current="page"` for screen readers
- Bottom border (2px) indicates current page

**Responsive Behavior**:
- Desktop: Horizontal list of links (`hidden md:flex`)
- Mobile: Hamburger menu button (`md:hidden`)
- `md:` breakpoint (768px) switches layouts
- Mobile menu requires JavaScript to toggle visibility

**Brand Element**:
- Larger text: `text-xl font-bold`
- Brand color: `text-brand-400`
- Positioned before nav items
- Can be replaced with logo image

### Live Demo

See this component: [Navigation - Primary Nav Bar](../../../../src/main/resources/static/mockups/design-system.html#navigation)

## Example 5: Breadcrumb Navigation

Breadcrumbs show current location in hierarchical navigation.

### Complete Working Code

```kotlin
/**
 * Breadcrumb navigation.
 */
fun FlowContent.breadcrumbs(
    items: List<BreadcrumbItem>,
    truncate: Boolean = false
) {
    nav {
        attributes["aria-label"] = "Breadcrumb"

        ol(classes = "flex items-center gap-2 text-sm") {
            items.forEachIndexed { index, item ->
                val isLast = index == items.size - 1

                // Breadcrumb item
                li {
                    if (isLast) {
                        // Current page (no link)
                        span(classes = "text-neutral-200 font-medium") {
                            attributes["aria-current"] = "page"
                            +item.label
                        }
                    } else {
                        // Link to parent page
                        a(
                            href = item.href,
                            classes = "text-neutral-400 hover:text-neutral-200 transition-colors"
                        ) {
                            +item.label
                        }
                    }
                }

                // Separator (chevron)
                if (!isLast) {
                    li(classes = "text-neutral-600") {
                        svg(classes = "w-4 h-4") {
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
}

/**
 * Truncated breadcrumbs for mobile (shows first and last only).
 */
fun FlowContent.truncatedBreadcrumbs(items: List<BreadcrumbItem>) {
    if (items.size <= 2) {
        breadcrumbs(items)
        return
    }

    nav {
        attributes["aria-label"] = "Breadcrumb"

        ol(classes = "flex items-center gap-2 text-sm") {
            // First item
            li {
                a(
                    href = items.first().href,
                    classes = "text-neutral-400 hover:text-neutral-200"
                ) {
                    +items.first().label
                }
            }

            // Separator
            li(classes = "text-neutral-600") {
                svg(classes = "w-4 h-4") {
                    attributes["fill"] = "none"
                    attributes["stroke"] = "currentColor"
                    attributes["viewBox"] = "0 0 24 24"
                    unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>""")
                    }
                }
            }

            // Ellipsis for truncated items
            li(classes = "text-neutral-500") { +"..." }

            // Separator
            li(classes = "text-neutral-600") {
                svg(classes = "w-4 h-4") {
                    attributes["fill"] = "none"
                    attributes["stroke"] = "currentColor"
                    attributes["viewBox"] = "0 0 24 24"
                    unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>""")
                    }
                }
            }

            // Last item (current page)
            li {
                span(classes = "text-neutral-200 font-medium") {
                    attributes["aria-current"] = "page"
                    +items.last().label
                }
            }
        }
    }
}

data class BreadcrumbItem(val label: String, val href: String)

// Usage examples:
fun FlowContent.projectBreadcrumbs() {
    breadcrumbs(
        items = listOf(
            BreadcrumbItem("Projects", "/projects"),
            BreadcrumbItem("CycleTime", "/projects/cycletime"),
            BreadcrumbItem("Issues", "/projects/cycletime/issues"),
            BreadcrumbItem("SPI-835", "/projects/cycletime/issues/spi-835")
        )
    )
}

fun FlowContent.mobileBreadcrumbs() {
    truncatedBreadcrumbs(
        items = listOf(
            BreadcrumbItem("Projects", "/projects"),
            BreadcrumbItem("CycleTime", "/projects/cycletime"),
            BreadcrumbItem("Issues", "/projects/cycletime/issues"),
            BreadcrumbItem("SPI-835", "/projects/cycletime/issues/spi-835")
        )
    )
}
```

### Explanation

**Semantic Structure**:
- `<nav>` with `aria-label="Breadcrumb"`
- `<ol>` for ordered list of links
- Last item marked with `aria-current="page"`
- Screen readers announce navigation context

**Separator Icons**:
- Chevron right (`>`) between items
- Rendered as SVG for scalability
- Muted color (`text-neutral-600`)
- Not included after last item

**Mobile Truncation**:
- Shows first and last items only
- Ellipsis (`...`) indicates hidden items
- Prevents horizontal overflow on narrow screens
- Could be expanded with dropdown menu

**Visual Hierarchy**:
- Links: Muted gray with hover effect
- Current page: Brighter + bold font weight
- No link on current page (not clickable)

### Live Demo

See this component: [Navigation - Breadcrumbs](../../../../src/main/resources/static/mockups/design-system.html#navigation)

## Best Practices

### 1. Consistent Badge Sizes

```kotlin
// ✅ Good: Consistent sizing across badge types
statusBadge: "px-2.5 py-0.5 text-xs"
pillBadge: "px-3 py-1 text-xs"
countBadge: "w-6 h-6 text-xs"

// ❌ Bad: Mixed sizes
"px-2 py-1 text-sm"  // Different from others
```

**Rule**: Use consistent padding and text sizes for all badge types.

### 2. Status Badge Semantics

```kotlin
// ✅ Good: Semantic color mapping
"in-progress" → Yellow (active work)
"done" → Green (success)
"canceled" → Red (negative)

// ❌ Bad: Arbitrary colors
"in-progress" → Purple
"done" → Blue
```

**Rule**: Follow established color conventions for workflow states.

### 3. Navigation Accessibility

```kotlin
// ✅ Good: Full accessibility attributes
nav { attributes["aria-label"] = "Primary navigation" }
a { attributes["aria-current"] = "page" }

// ❌ Bad: Missing ARIA
nav { /* no aria-label */ }
a(classes = "active") { /* no aria-current */ }
```

**Rule**: Always include `aria-label` on `<nav>` and `aria-current` on active links.

## Common Issues

### Issue: Badge Text Not Centered

**Problem**: Badge height doesn't match font size, causing vertical misalignment.

**Solution**: Use `inline-flex items-center justify-center`:

```kotlin
"inline-flex items-center justify-center w-6 h-6"
```

### Issue: Count Badge Overlaps Content

**Problem**: Absolute positioning without space causes overlap.

**Solution**: Add margin to parent or adjust badge position:

```kotlin
// Parent needs space for badge
"mr-3"  // Right margin for badge

// Badge positioned outside
"absolute -top-2 -right-2"
```

### Issue: Breadcrumb Separator Misaligned

**Problem**: SVG icon not vertically centered.

**Solution**: Wrap separator in flex container:

```kotlin
li(classes = "text-neutral-600 flex items-center") {
    svg(classes = "w-4 h-4") { /* chevron */ }
}
```

## Related Examples

- [Card Component Examples](card-component-examples.md) - Badges within cards
- [Button Component Examples](button-component-examples.md) - Navigation buttons
- [Form Component Examples](form-component-examples.md) - Form navigation patterns

## References

- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)
- [Design Tokens](../../reference/ui/design-tokens.md)
- [MDN ARIA Navigation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/navigation_role)
- [Ktor HTML DSL Documentation](https://ktor.io/docs/html-dsl.html)
