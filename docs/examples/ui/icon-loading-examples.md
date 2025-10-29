---
title: "Icon & Loading Component Examples"
type: example
domain: [ui, frontend, components]
description: "Working examples of icons, loading spinners, and empty states using Ktor HTML DSL and Tailwind CSS"
dependencies: [../../patterns/ui/tailwind-design-system.md, ../../reference/ui/design-tokens.md]
related: [button-component-examples.md, card-component-examples.md]
keywords: [icon, loading, spinner, skeleton, empty-state, ktor-html-dsl, tailwind, ui]
tested: false
last_updated: 2025-10-28
---

# Icon & Loading Component Examples

## Overview

This document provides complete working examples of icons, loading indicators, and empty state components built with Ktor's HTML DSL and styled using the Tailwind design system. These components provide visual feedback during async operations, indicate data absence, and enhance user experience with clear iconography.

**Key Features**:
- Type-safe icon and loading component generation with Kotlin HTML DSL
- SVG icons with consistent sizing and color inheritance
- Animated loading spinners for async operations
- Skeleton loaders for content placeholders
- Empty state patterns for missing data
- Progress indicators for long-running operations

## Prerequisites

- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Color tokens and utility patterns
- [Design Tokens Reference](../../reference/ui/design-tokens.md) - Brand and neutral color values
- [Button Component Examples](button-component-examples.md) - Icon buttons
- [Card Component Examples](card-component-examples.md) - Empty state cards
- Basic understanding of Ktor HTML DSL and SVG

## Example 1: SVG Icon System

Consistent SVG icon usage with size variants and color inheritance.

### Complete Working Code

```kotlin
package io.spiralhouse.cycletime.ui.components

import kotlinx.html.*

/**
 * SVG icon with size variant.
 */
fun FlowContent.icon(
    name: IconName,
    size: IconSize = IconSize.MEDIUM,
    ariaHidden: Boolean = true
) {
    val sizeClass = when (size) {
        IconSize.SMALL -> "w-4 h-4"      // 16px
        IconSize.MEDIUM -> "w-5 h-5"     // 20px
        IconSize.LARGE -> "w-6 h-6"      // 24px
        IconSize.XLARGE -> "w-8 h-8"     // 32px
    }

    svg(classes = sizeClass) {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        if (ariaHidden) {
            attributes["aria-hidden"] = "true"
        }

        when (name) {
            IconName.CHECK -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>""")
            }
            IconName.CLOSE -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>""")
            }
            IconName.CHEVRON_RIGHT -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>""")
            }
            IconName.PLUS -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>""")
            }
            IconName.SEARCH -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>""")
            }
            IconName.NOTIFICATION -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>""")
            }
            IconName.SETTINGS -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>""")
            }
            IconName.EDIT -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>""")
            }
            IconName.DELETE -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>""")
            }
            IconName.INFO -> unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
            }
        }
    }
}

enum class IconName {
    CHECK, CLOSE, CHEVRON_RIGHT, PLUS, SEARCH, NOTIFICATION, SETTINGS, EDIT, DELETE, INFO
}

enum class IconSize {
    SMALL,    // 16px (w-4 h-4)
    MEDIUM,   // 20px (w-5 h-5)
    LARGE,    // 24px (w-6 h-6)
    XLARGE    // 32px (w-8 h-8)
}

// Usage examples:
fun FlowContent.iconExamples() {
    div(classes = "flex items-center gap-4") {
        // Size variants
        span(classes = "text-neutral-400") {
            icon(IconName.CHECK, size = IconSize.SMALL)
        }

        span(classes = "text-brand-500") {
            icon(IconName.PLUS, size = IconSize.MEDIUM)
        }

        span(classes = "text-green-400") {
            icon(IconName.NOTIFICATION, size = IconSize.LARGE)
        }

        // Color inherited from parent
        span(classes = "text-red-500 hover:text-red-400 transition-colors") {
            icon(IconName.DELETE, size = IconSize.MEDIUM)
        }
    }
}
```

### Explanation

**Size Consistency**:
- `SMALL` (16px): Inline with text, compact UIs
- `MEDIUM` (20px): Default for buttons, forms
- `LARGE` (24px): Headers, prominent actions
- `XLARGE` (32px): Empty states, hero sections

**Color Inheritance**:
- `stroke="currentColor"` inherits parent text color
- Wrap icon in `<span>` with text color class
- Enables hover effects on parent element
- Example: `text-neutral-400 hover:text-neutral-200`

**Accessibility**:
- `aria-hidden="true"` for decorative icons
- Omit `ariaHidden` for semantic icons with meaning
- Combine with `aria-label` on parent button/link

**SVG Attributes**:
- `fill="none"`: Outline style icons
- `viewBox="0 0 24 24"`: Standard coordinate system
- `stroke-width="2"`: Consistent line thickness
- `stroke-linecap="round"`: Rounded line ends

### Live Demo

See this component: [Icons Section](../../../../src/main/resources/static/mockups/design-system.html#icons)

## Example 2: Loading Spinner

Animated loading spinner for async operations.

### Complete Working Code

```kotlin
/**
 * Loading spinner with animation.
 */
fun FlowContent.loadingSpinner(
    message: String = "Loading...",
    size: SpinnerSize = SpinnerSize.MEDIUM
) {
    val sizeClass = when (size) {
        SpinnerSize.SMALL -> "h-4 w-4"
        SpinnerSize.MEDIUM -> "h-5 w-5"
        SpinnerSize.LARGE -> "h-8 w-8"
    }

    div(classes = "htmx-indicator flex items-center gap-2 text-neutral-400") {
        // Spinning circle
        svg(classes = "animate-spin $sizeClass") {
            attributes["xmlns"] = "http://www.w3.org/2000/svg"
            attributes["fill"] = "none"
            attributes["viewBox"] = "0 0 24 24"

            unsafe {
                raw("""
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                """.trimIndent())
            }
        }

        // Loading message
        span(classes = "text-sm") {
            +message
        }
    }
}

/**
 * Inline spinner (no text).
 */
fun FlowContent.inlineSpinner(size: SpinnerSize = SpinnerSize.SMALL) {
    svg(classes = "animate-spin ${when (size) {
        SpinnerSize.SMALL -> "h-4 w-4"
        SpinnerSize.MEDIUM -> "h-5 w-5"
        SpinnerSize.LARGE -> "h-8 w-8"
    }}") {
        attributes["xmlns"] = "http://www.w3.org/2000/svg"
        attributes["fill"] = "none"
        attributes["viewBox"] = "0 0 24 24"

        unsafe {
            raw("""
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            """.trimIndent())
        }
    }
}

enum class SpinnerSize {
    SMALL, MEDIUM, LARGE
}

// Usage examples:
fun FlowContent.loadingSpinnerExamples() {
    div(classes = "space-y-4") {
        // With message
        loadingSpinner(message = "Loading projects...", size = SpinnerSize.MEDIUM)

        // Inline in button
        button(classes = "px-4 py-2 bg-brand-500 text-white rounded flex items-center gap-2") {
            inlineSpinner(size = SpinnerSize.SMALL)
            span { +"Saving..." }
        }

        // Centered in container
        div(classes = "flex items-center justify-center h-48") {
            loadingSpinner(message = "Loading data...", size = SpinnerSize.LARGE)
        }
    }
}
```

### Explanation

**Animation**:
- `animate-spin` applies continuous rotation (Tailwind utility)
- No JavaScript required for animation
- Rotates 360 degrees over 1 second (default duration)
- Runs indefinitely until element removed

**SVG Structure**:
- Background circle: `opacity-25` (light gray outline)
- Foreground path: `opacity-75` (darker, creates spinning effect)
- `stroke="currentColor"`: Inherits text color from parent
- `fill="currentColor"`: Fills animated segment

**HTMX Integration**:
- `htmx-indicator` class hidden by default
- HTMX shows during requests with `hx-indicator` attribute
- Server-side can return HTML fragment to replace spinner
- Pattern: Show spinner → Make request → Replace with content

**Size Guidelines**:
- Small: Inline with text, form inputs
- Medium: Buttons, cards, default size
- Large: Full-page loading, empty states

### Live Demo

See this component: [Loading Spinner](../../../../src/main/resources/static/mockups/design-system.html#icons)

## Example 3: Skeleton Loader

Skeleton placeholders for content while loading.

### Complete Working Code

```kotlin
/**
 * Skeleton loader for text content.
 */
fun FlowContent.skeletonText(
    lines: Int = 3,
    lastLineWidth: String = "w-3/4"
) {
    div(classes = "space-y-3 animate-pulse") {
        repeat(lines - 1) {
            div(classes = "h-4 bg-neutral-700 rounded w-full")
        }

        // Last line (typically shorter)
        div(classes = "h-4 bg-neutral-700 rounded $lastLineWidth")
    }
}

/**
 * Skeleton loader for card.
 */
fun FlowContent.skeletonCard() {
    div(classes = "bg-neutral-900 border border-neutral-700 rounded-lg p-6 animate-pulse") {
        // Header skeleton
        div(classes = "flex items-start justify-between mb-4") {
            div(classes = "flex-1") {
                // Title
                div(classes = "h-6 bg-neutral-700 rounded w-3/4 mb-2")

                // Subtitle
                div(classes = "h-4 bg-neutral-700 rounded w-1/2")
            }

            // Icon placeholder
            div(classes = "w-12 h-12 bg-neutral-700 rounded")
        }

        // Content skeleton
        div(classes = "space-y-2 mb-4") {
            div(classes = "h-4 bg-neutral-700 rounded w-full")
            div(classes = "h-4 bg-neutral-700 rounded w-5/6")
            div(classes = "h-4 bg-neutral-700 rounded w-4/6")
        }

        // Footer skeleton (stats)
        div(classes = "flex items-center gap-4") {
            div(classes = "h-4 bg-neutral-700 rounded w-20")
            div(classes = "h-4 bg-neutral-700 rounded w-24")
            div(classes = "h-4 bg-neutral-700 rounded w-16")
        }
    }
}

/**
 * Skeleton loader for list items.
 */
fun FlowContent.skeletonList(count: Int = 3) {
    div(classes = "space-y-3") {
        repeat(count) {
            div(classes = "bg-neutral-900 border border-neutral-700 rounded-lg p-4 animate-pulse") {
                div(classes = "flex items-center gap-3") {
                    // Avatar placeholder
                    div(classes = "w-10 h-10 bg-neutral-700 rounded-full flex-shrink-0")

                    // Content
                    div(classes = "flex-1 space-y-2") {
                        div(classes = "h-4 bg-neutral-700 rounded w-3/4")
                        div(classes = "h-3 bg-neutral-700 rounded w-1/2")
                    }
                }
            }
        }
    }
}

// Usage examples:
fun FlowContent.skeletonExamples() {
    div(classes = "space-y-6") {
        // Text skeleton
        div {
            h3(classes = "text-lg font-semibold text-neutral-200 mb-4") {
                +"Loading Article..."
            }
            skeletonText(lines = 5, lastLineWidth = "w-2/3")
        }

        // Card skeleton
        skeletonCard()

        // List skeleton
        skeletonList(count = 3)
    }
}
```

### Explanation

**Pulse Animation**:
- `animate-pulse` applies opacity fade in/out (Tailwind utility)
- Creates "breathing" effect: opacity 100% → 50% → 100%
- 2-second cycle (default duration)
- Signals loading state without spinning

**Placeholder Shapes**:
- Text lines: `h-4` (height) + `w-full` or fraction (`w-3/4`)
- Rounded corners: `rounded` matches final content
- Color: `bg-neutral-700` (dark gray, visible on dark backgrounds)
- Last line typically shorter to mimic natural text flow

**Layout Matching**:
- Skeleton should match final content layout
- Same spacing, padding, and structure
- Prevents layout shift when content loads
- Example: Card skeleton has header, body, footer like real card

**Use Cases**:
- Initial page load (before data arrives)
- Infinite scroll (loading more items)
- Optimistic UI updates
- Better UX than blank space or single spinner

## Example 4: Progress Indicator

Progress bars for long-running operations.

### Complete Working Code

```kotlin
/**
 * Linear progress bar.
 */
fun FlowContent.progressBar(
    progress: Int,
    label: String? = null,
    variant: ProgressVariant = ProgressVariant.BRAND
) {
    val variantClasses = when (variant) {
        ProgressVariant.BRAND -> "bg-brand-500"
        ProgressVariant.SUCCESS -> "bg-green-500"
        ProgressVariant.WARNING -> "bg-yellow-500"
        ProgressVariant.DANGER -> "bg-red-500"
    }

    div {
        // Label and percentage
        label?.let {
            div(classes = "flex items-center justify-between mb-2") {
                span(classes = "text-sm font-medium text-neutral-200") { +it }
                span(classes = "text-sm font-semibold text-neutral-300") { +"$progress%" }
            }
        }

        // Progress bar container
        div(classes = "w-full bg-neutral-800 rounded-full h-2 overflow-hidden") {
            // Progress fill
            div(
                classes = "$variantClasses h-2 rounded-full transition-all duration-300"
            ) {
                style = "width: $progress%;"
                attributes["role"] = "progressbar"
                attributes["aria-valuenow"] = progress.toString()
                attributes["aria-valuemin"] = "0"
                attributes["aria-valuemax"] = "100"
            }
        }
    }
}

/**
 * Indeterminate progress bar (unknown duration).
 */
fun FlowContent.indeterminateProgressBar(
    label: String = "Loading..."
) {
    div {
        // Label
        p(classes = "text-sm font-medium text-neutral-200 mb-2") {
            +label
        }

        // Progress bar with animation
        div(classes = "w-full bg-neutral-800 rounded-full h-2 overflow-hidden") {
            div(classes = "bg-brand-500 h-2 rounded-full animate-pulse") {
                style = "width: 100%;"
            }
        }
    }
}

enum class ProgressVariant {
    BRAND, SUCCESS, WARNING, DANGER
}

// Usage examples:
fun FlowContent.progressExamples() {
    div(classes = "space-y-6") {
        // Determinate progress
        progressBar(
            progress = 67,
            label = "Upload Progress",
            variant = ProgressVariant.BRAND
        )

        progressBar(
            progress = 100,
            label = "Complete",
            variant = ProgressVariant.SUCCESS
        )

        progressBar(
            progress = 23,
            label = "Storage Used",
            variant = ProgressVariant.WARNING
        )

        // Indeterminate progress
        indeterminateProgressBar(label = "Processing...")
    }
}
```

### Explanation

**Determinate Progress**:
- Shows specific percentage (0-100%)
- Width controlled by inline `style`
- Transition animates width changes smoothly
- ARIA attributes for screen readers

**Indeterminate Progress**:
- Unknown duration or completion percentage
- Uses `animate-pulse` for activity indication
- Full width with pulsing animation
- Signals work in progress without specific progress

**Color Variants**:
- Brand: General progress (blue)
- Success: Completed operations (green)
- Warning: Limited resources (yellow)
- Danger: Critical state (red)

**Accessibility**:
- `role="progressbar"` identifies element type
- `aria-valuenow`: Current progress value
- `aria-valuemin/max`: Range (0-100)
- Label provides context

## Example 5: Empty State Component

Empty states guide users when no data is available.

### Complete Working Code

```kotlin
/**
 * Empty state with icon, message, and optional action.
 */
fun FlowContent.emptyState(
    icon: String = "📭",
    title: String,
    message: String,
    actionLabel: String? = null,
    actionHref: String? = null
) {
    div(classes = "text-center py-12") {
        // Large icon
        div(classes = "text-6xl mb-4") {
            +icon
        }

        // Title
        h3(classes = "text-lg font-semibold text-neutral-200 mb-2") {
            +title
        }

        // Message
        p(classes = "text-sm text-neutral-400 mb-6 max-w-md mx-auto") {
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

// Preset empty states:
fun FlowContent.noProjects() {
    emptyState(
        icon = "📚",
        title = "No projects yet",
        message = "Create your first project to start organizing your work with CycleTime.",
        actionLabel = "Create Project",
        actionHref = "/projects/new"
    )
}

fun FlowContent.noSearchResults(query: String) {
    emptyState(
        icon = "🔍",
        title = "No results found",
        message = "We couldn't find anything matching \"$query\". Try different keywords or check your spelling."
    )
}

fun FlowContent.noNotifications() {
    emptyState(
        icon = "✅",
        title = "All caught up!",
        message = "You have no new notifications. We'll let you know when something requires your attention."
    )
}

fun FlowContent.networkError() {
    emptyState(
        icon = "⚠️",
        title = "Connection Error",
        message = "Unable to load data. Please check your internet connection and try again.",
        actionLabel = "Retry",
        actionHref = "javascript:location.reload()"
    )
}
```

### Explanation

**Icon Selection**:
- Choose emoji that matches context semantically
- Common icons:
  - 📭 Empty inbox
  - 📚 No projects/content
  - 🔍 No search results
  - ✅ All done/complete
  - ⚠️ Error/warning
  - 🎉 Success/celebration

**Layout**:
- `text-center` centers all content
- `py-12` provides vertical spacing (48px)
- `max-w-md mx-auto` constrains message width for readability
- Vertical flow: Icon → Title → Message → Action

**Action Button**:
- Optional call-to-action for recovery
- Helps users resolve empty state
- Examples:
  - "Create Project" (no projects)
  - "Retry" (error)
  - "Clear Filters" (no results)
  - "Import Data" (empty list)

**Messaging**:
- Title: Short, direct statement
- Message: Brief explanation + guidance
- Avoid technical jargon
- Be encouraging, not discouraging

### Live Demo

See this component: [Empty States](../../../../src/main/resources/static/mockups/design-system.html#icons)

## Best Practices

### 1. Consistent Icon Sizing

```kotlin
// ✅ Good: Use size enum for consistency
icon(IconName.CHECK, size = IconSize.MEDIUM)
icon(IconName.CLOSE, size = IconSize.MEDIUM)

// ❌ Bad: Arbitrary sizes
svg(classes = "w-7 h-7")  // Non-standard size
```

**Rule**: Always use `IconSize` enum for consistent sizing across the application.

### 2. Loading State Hierarchy

```kotlin
// ✅ Good: Choose appropriate loader for context
fullPageLoad → skeleton loaders
cardRefresh → inline spinner
buttonAction → inline spinner in button

// ❌ Bad: Always using same loader
// Using skeleton for button action (too heavy)
```

**Rule**: Match loading indicator to context and duration.

### 3. Accessible Icons

```kotlin
// ✅ Good: Decorative icon hidden from screen readers
button {
    attributes["aria-label"] = "Close dialog"
    icon(IconName.CLOSE, ariaHidden = true)
}

// ❌ Bad: Icon without context
button {
    icon(IconName.CLOSE)  // Screen reader doesn't know what this does
}
```

**Rule**: Icon-only buttons MUST have `aria-label`, decorative icons MUST have `aria-hidden="true"`.

## Common Issues

### Issue: Spinner Not Animating

**Problem**: `animate-spin` class not working.

**Solution**: Ensure Tailwind CSS is loaded and animation is enabled:

```kotlin
// Tailwind config should include animations
// Default: animations are enabled
```

### Issue: Skeleton Doesn't Match Layout

**Problem**: Content shifts when skeleton replaced with data.

**Solution**: Match skeleton structure to final content:

```kotlin
// ✅ Good: Same structure
skeletonCard() → projectCard()

// ❌ Bad: Different structure
div { skeletonText() } → card { content }
```

### Issue: Empty State Icon Not Showing

**Problem**: Emoji doesn't render or looks inconsistent.

**Solution**: Use Unicode emoji or SVG icons for consistency:

```kotlin
// Option 1: Unicode emoji
div(classes = "text-6xl") { +"📭" }

// Option 2: SVG icon
icon(IconName.INBOX, size = IconSize.XLARGE)
```

## Related Examples

- [Button Component Examples](button-component-examples.md) - Loading buttons, icon buttons
- [Card Component Examples](card-component-examples.md) - Empty state cards, skeleton cards
- [Form Component Examples](form-component-examples.md) - Form loading states

## References

- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)
- [Design Tokens](../../reference/ui/design-tokens.md)
- [MDN SVG Tutorial](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial)
- [Heroicons Icon Library](https://heroicons.com/) - SVG icon source
- [Ktor HTML DSL Documentation](https://ktor.io/docs/html-dsl.html)
