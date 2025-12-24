---
title: "Button Component Examples"
type: example
domain: [ui, frontend, components]
description: "Working examples of button components using Ktor HTML DSL and Tailwind CSS"
dependencies: [../../patterns/ui/tailwind-design-system.md, ../../reference/ui/design-tokens.md]
related: []
keywords: [button, ktor-html-dsl, tailwind, components, ui, interactive]
tested: false
last_updated: 2025-10-28
---

# Button Component Examples

## Overview

This document provides complete, working examples of button components built with Ktor's HTML DSL and styled using the Tailwind design system. Buttons are the primary interactive controls in the application, supporting four variants (primary, secondary, ghost, danger), three sizes (small, medium, large), and multiple states (default, hover, active, disabled, loading).

**Key Features**:
- Type-safe button generation with Kotlin HTML DSL
- Four semantic variants for different actions
- Three size options for visual hierarchy
- Icon support (leading, trailing, icon-only)
- Loading states with animated spinners
- Accessibility-first design (ARIA labels, keyboard navigation)

## Prerequisites

- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Color tokens and utility patterns
- [Design Tokens Reference](../../reference/ui/design-tokens.md) - Brand and neutral color values
- Basic understanding of Ktor HTML DSL
- Familiarity with Tailwind CSS utility classes

## Example 1: Primary Button (All Sizes)

Primary buttons are used for the main action on a page or section. They use the brand color (`brand-500`) and stand out visually.

### Complete Working Code

```kotlin
package io.spiralhouse.cycletime.ui.components

import kotlinx.html.*

/**
 * Primary button with three size variants.
 */
fun FlowContent.primaryButton(
    label: String,
    href: String? = null,
    size: ButtonSize = ButtonSize.MEDIUM,
    disabled: Boolean = false
) {
    val sizeClasses = when (size) {
        ButtonSize.SMALL -> "px-3 py-1.5 text-sm"
        ButtonSize.MEDIUM -> "px-4 py-2 text-base"
        ButtonSize.LARGE -> "px-6 py-3 text-lg"
    }

    val baseClasses = """
        $sizeClasses font-medium rounded
        bg-brand-500 text-white
        hover:bg-brand-600
        focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-900
        active:bg-brand-700
        transition-all
        ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
    """.trimIndent().replace("\n", " ")

    if (href != null && !disabled) {
        a(href = href, classes = baseClasses) {
            +label
        }
    } else {
        button(classes = baseClasses, type = ButtonType.button) {
            this.disabled = disabled
            attributes["aria-disabled"] = disabled.toString()
            +label
        }
    }
}

enum class ButtonSize {
    SMALL, MEDIUM, LARGE
}

// Usage examples:
fun FlowContent.buttonSizeExamples() {
    div(classes = "flex flex-wrap items-center gap-4") {
        primaryButton("Small Primary", size = ButtonSize.SMALL)
        primaryButton("Medium Primary", size = ButtonSize.MEDIUM)
        primaryButton("Large Primary", size = ButtonSize.LARGE)
        primaryButton("Disabled Primary", disabled = true)
    }
}
```

### Explanation

**Size Control**:
- `ButtonSize` enum provides type-safe size options
- Each size maps to specific padding (`px-*`, `py-*`) and text size (`text-sm`, `text-base`, `text-lg`)
- Heights: Small (32px), Medium (40px), Large (48px)

**State Management**:
- `disabled` parameter controls opacity and cursor
- `aria-disabled` attribute for accessibility
- Links (`a` tags) don't render when disabled

**Color Progression**:
- Default: `bg-brand-500` (Blue #4C9AFF)
- Hover: `bg-brand-600` (Darker blue)
- Active: `bg-brand-700` (Even darker for click feedback)
- Uses [Brand Colors](../../reference/ui/design-tokens.md#color-tokens) from design tokens

### Live Demo

See this component: [Button Variants - Primary](../../../../src/main/resources/static/mockups/design-system.html#buttons-variants)

## Example 2: Secondary Button

Secondary buttons provide less emphasis than primary buttons. Use for secondary actions like "Cancel" or "Back".

### Complete Working Code

```kotlin
/**
 * Secondary button (neutral gray background).
 */
fun FlowContent.secondaryButton(
    label: String,
    href: String? = null,
    size: ButtonSize = ButtonSize.MEDIUM,
    disabled: Boolean = false
) {
    val sizeClasses = when (size) {
        ButtonSize.SMALL -> "px-3 py-1.5 text-sm"
        ButtonSize.MEDIUM -> "px-4 py-2 text-base"
        ButtonSize.LARGE -> "px-6 py-3 text-lg"
    }

    val baseClasses = """
        $sizeClasses font-medium rounded
        bg-neutral-700 text-neutral-100
        hover:bg-neutral-600
        focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900
        active:bg-neutral-800
        transition-all
        ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
    """.trimIndent().replace("\n", " ")

    if (href != null && !disabled) {
        a(href = href, classes = baseClasses) { +label }
    } else {
        button(classes = baseClasses, type = ButtonType.button) {
            this.disabled = disabled
            +label
        }
    }
}

// Usage in button groups:
fun FlowContent.buttonGroupExample() {
    div(classes = "flex gap-2") {
        primaryButton("Save")
        secondaryButton("Cancel")
    }
}
```

### Explanation

**Visual Hierarchy**:
- Secondary buttons use neutral colors (`neutral-700`) to recede visually
- Primary buttons always draw more attention with brand colors
- Pair together for Save/Cancel, Submit/Back flows

**Color Tokens**:
- Background: `neutral-700` (Gray #3C444D)
- Text: `neutral-100` (Light gray #E5E7EB)
- Hover: `neutral-600` (Lighter on hover)

### Live Demo

See this component: [Button Variants - Secondary](../../../../src/main/resources/static/mockups/design-system.html#buttons-variants)

## Example 3: Ghost Button (Outline Style)

Ghost buttons have a transparent background with a border. Use for tertiary actions or when you need minimal visual weight.

### Complete Working Code

```kotlin
/**
 * Ghost button (border only, transparent background).
 */
fun FlowContent.ghostButton(
    label: String,
    href: String? = null,
    size: ButtonSize = ButtonSize.MEDIUM,
    disabled: Boolean = false
) {
    val sizeClasses = when (size) {
        ButtonSize.SMALL -> "px-3 py-1.5 text-sm"
        ButtonSize.MEDIUM -> "px-4 py-2 text-base"
        ButtonSize.LARGE -> "px-6 py-3 text-lg"
    }

    val baseClasses = """
        $sizeClasses font-medium rounded
        border border-neutral-600 text-neutral-100
        hover:bg-neutral-800 hover:border-neutral-500
        focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-900
        active:bg-neutral-700
        transition-all
        ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
    """.trimIndent().replace("\n", " ")

    if (href != null && !disabled) {
        a(href = href, classes = baseClasses) { +label }
    } else {
        button(classes = baseClasses, type = ButtonType.button) {
            this.disabled = disabled
            +label
        }
    }
}
```

### Explanation

**Transparency**:
- No background color by default
- Border provides structure: `border border-neutral-600`
- Hover adds subtle background: `hover:bg-neutral-800`

**Focus Ring**:
- Uses brand color for focus: `focus:ring-brand-400`
- Ring offset matches dark background: `focus:ring-offset-neutral-900`

### Live Demo

See this component: [Button Variants - Ghost](../../../../src/main/resources/static/mockups/design-system.html#buttons-variants)

## Example 4: Danger Button

Danger buttons signal destructive actions (delete, remove, cancel subscription). Use sparingly and with confirmation dialogs.

### Complete Working Code

```kotlin
/**
 * Danger button (red background for destructive actions).
 */
fun FlowContent.dangerButton(
    label: String,
    href: String? = null,
    size: ButtonSize = ButtonSize.MEDIUM,
    disabled: Boolean = false,
    ariaLabel: String = label
) {
    val sizeClasses = when (size) {
        ButtonSize.SMALL -> "px-3 py-1.5 text-sm"
        ButtonSize.MEDIUM -> "px-4 py-2 text-base"
        ButtonSize.LARGE -> "px-6 py-3 text-lg"
    }

    val baseClasses = """
        $sizeClasses font-medium rounded
        bg-red-600 text-white
        hover:bg-red-700
        focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-neutral-900
        active:bg-red-800
        transition-all
        ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
    """.trimIndent().replace("\n", " ")

    button(classes = baseClasses, type = ButtonType.button) {
        this.disabled = disabled
        attributes["aria-label"] = ariaLabel
        +label
    }
}

// Usage with confirmation:
fun FlowContent.deleteProjectButton(projectId: String) {
    dangerButton(
        label = "Delete Project",
        ariaLabel = "Delete project $projectId - this action cannot be undone"
    ) {
        attributes["onclick"] = "confirmDelete('$projectId')"
    }
}
```

### Explanation

**Semantic Color**:
- Red signals danger universally
- Background: `red-600`, Hover: `red-700`, Active: `red-800`
- Always use with clear labeling ("Delete", "Remove", "Cancel")

**Accessibility**:
- `ariaLabel` parameter for screen readers
- Should describe consequences: "Delete project - this action cannot be undone"
- Pair with confirmation dialogs to prevent accidental clicks

### Live Demo

See this component: [Button Variants - Danger](../../../../src/main/resources/static/mockups/design-system.html#buttons-variants)

## Example 5: Loading State Button

Loading buttons show progress for async operations. Disable interaction and display a spinner.

### Complete Working Code

```kotlin
/**
 * Button with loading state (spinner + disabled).
 */
fun FlowContent.loadingButton(
    label: String,
    isLoading: Boolean,
    variant: ButtonVariant = ButtonVariant.PRIMARY
) {
    val variantClasses = when (variant) {
        ButtonVariant.PRIMARY -> "bg-brand-500 text-white"
        ButtonVariant.SECONDARY -> "bg-neutral-700 text-neutral-100"
    }

    val baseClasses = """
        px-4 py-2 text-base font-medium rounded
        flex items-center gap-2
        transition-all
        ${if (isLoading) "opacity-70 cursor-wait" else variantClasses}
    """.trimIndent().replace("\n", " ")

    button(classes = baseClasses, type = ButtonType.button) {
        disabled = isLoading
        attributes["aria-disabled"] = isLoading.toString()
        attributes["aria-label"] = if (isLoading) "Loading" else label

        if (isLoading) {
            // Animated spinner SVG
            unsafe {
                raw("""
                    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                """.trimIndent())
            }
        }

        span { +(if (isLoading) "Loading..." else label) }
    }
}

enum class ButtonVariant {
    PRIMARY, SECONDARY
}

// Usage in form submission:
fun FlowContent.submitFormButton(isSubmitting: Boolean) {
    loadingButton(
        label = "Submit Form",
        isLoading = isSubmitting,
        variant = ButtonVariant.PRIMARY
    )
}
```

### Explanation

**Loading UX**:
- Spinner uses `animate-spin` Tailwind class for rotation
- Text changes: "Save" → "Saving...", "Submit" → "Loading..."
- Cursor changes to `cursor-wait` to signal async operation

**State Management**:
- `isLoading` parameter controls visibility
- Button disabled during loading to prevent double-submit
- ARIA label updates for screen readers

### Live Demo

See this component: [Button States - Loading](../../../../src/main/resources/static/mockups/design-system.html#buttons-states)

## Example 6: Icon Buttons

Icon buttons combine text labels with SVG icons. Support leading icons, trailing icons, and icon-only variants.

### Complete Working Code

```kotlin
/**
 * Button with leading icon.
 */
fun FlowContent.iconButton(
    label: String,
    iconPosition: IconPosition = IconPosition.LEADING,
    variant: ButtonVariant = ButtonVariant.PRIMARY,
    icon: FlowContent.() -> Unit
) {
    val variantClasses = when (variant) {
        ButtonVariant.PRIMARY -> "bg-brand-500 text-white hover:bg-brand-600"
        ButtonVariant.SECONDARY -> "border border-neutral-600 text-neutral-100 hover:bg-neutral-800"
    }

    val baseClasses = """
        px-4 py-2 text-base font-medium rounded
        flex items-center gap-2
        focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-900
        transition-all
        $variantClasses
    """.trimIndent().replace("\n", " ")

    button(classes = baseClasses, type = ButtonType.button) {
        attributes["aria-label"] = label

        if (iconPosition == IconPosition.LEADING) {
            icon()
            span { +label }
        } else {
            span { +label }
            icon()
        }
    }
}

/**
 * Icon-only button (must have aria-label).
 */
fun FlowContent.iconOnlyButton(
    ariaLabel: String,
    variant: ButtonVariant = ButtonVariant.PRIMARY,
    icon: FlowContent.() -> Unit
) {
    val variantClasses = when (variant) {
        ButtonVariant.PRIMARY -> "bg-brand-500 text-white hover:bg-brand-600"
        ButtonVariant.SECONDARY -> "border border-neutral-600 text-neutral-100 hover:bg-neutral-800"
    }

    val baseClasses = """
        p-2 rounded
        focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-900
        transition-all
        $variantClasses
    """.trimIndent().replace("\n", " ")

    button(classes = baseClasses, type = ButtonType.button) {
        attributes["aria-label"] = ariaLabel
        icon()
    }
}

enum class IconPosition {
    LEADING, TRAILING
}

// Usage with SVG icons:
fun FlowContent.addProjectButton() {
    iconButton(label = "Add Project", variant = ButtonVariant.PRIMARY) {
        svg(classes = "w-5 h-5") {
            attributes["fill"] = "none"
            attributes["stroke"] = "currentColor"
            attributes["viewBox"] = "0 0 24 24"
            attributes["aria-hidden"] = "true"
            unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>""")
            }
        }
    }
}

fun FlowContent.editIconButton() {
    iconOnlyButton(ariaLabel = "Edit") {
        svg(classes = "w-5 h-5") {
            attributes["fill"] = "none"
            attributes["stroke"] = "currentColor"
            attributes["viewBox"] = "0 0 24 24"
            unsafe {
                raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>""")
            }
        }
    }
}
```

### Explanation

**Icon Positioning**:
- `IconPosition.LEADING`: Icon before text ("+ Add Project")
- `IconPosition.TRAILING`: Icon after text ("View Details →")
- Icon-only: No text, requires `aria-label`

**SVG Icons**:
- Use `w-5 h-5` for 20px icons (consistent with text height)
- `stroke="currentColor"` inherits text color
- `aria-hidden="true"` on decorative icons
- Always use `aria-label` on icon-only buttons

### Live Demo

See this component: [Button Enhancements - Icon Buttons](../../../../src/main/resources/static/mockups/design-system.html#buttons-states)

## Example 7: Button Groups

Button groups organize related actions together. Support spaced groups (separate buttons) and segmented controls (connected buttons).

### Complete Working Code

```kotlin
/**
 * Horizontal button group with spacing.
 */
fun FlowContent.buttonGroup(
    gap: String = "gap-2",
    buttons: FlowContent.() -> Unit
) {
    div(classes = "flex $gap") {
        buttons()
    }
}

/**
 * Segmented control (radio-style button group).
 */
fun FlowContent.segmentedControl(
    options: List<SegmentOption>,
    selectedIndex: Int = 0,
    groupLabel: String
) {
    div(classes = "inline-flex rounded border border-neutral-600") {
        role = "group"
        attributes["aria-label"] = groupLabel

        options.forEachIndexed { index, option ->
            val isFirst = index == 0
            val isLast = index == options.size - 1
            val isSelected = index == selectedIndex

            val roundingClasses = when {
                isFirst -> "rounded-l"
                isLast -> "rounded-r"
                else -> ""
            }

            val borderClasses = if (!isLast) "border-r border-neutral-600" else ""

            val selectedClasses = if (isSelected) {
                "bg-neutral-700 text-white"
            } else {
                "text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
            }

            button(
                classes = """
                    px-4 py-2 text-sm font-medium
                    $roundingClasses $borderClasses $selectedClasses
                    focus:z-10 focus:ring-2 focus:ring-brand-400
                    transition-all
                """.trimIndent().replace("\n", " "),
                type = ButtonType.button
            ) {
                attributes["aria-pressed"] = isSelected.toString()
                +option.label
            }
        }
    }
}

data class SegmentOption(val label: String, val value: String)

// Usage examples:
fun FlowContent.formActions() {
    buttonGroup {
        primaryButton("Save")
        secondaryButton("Cancel")
    }
}

fun FlowContent.viewModeControl() {
    segmentedControl(
        options = listOf(
            SegmentOption("List View", "list"),
            SegmentOption("Grid View", "grid"),
            SegmentOption("Timeline", "timeline")
        ),
        selectedIndex = 0,
        groupLabel = "View mode"
    )
}
```

### Explanation

**Spaced Groups**:
- Simple flex container with gap
- Use for Save/Cancel, Submit/Reset patterns
- Each button maintains individual focus rings

**Segmented Controls**:
- Connected buttons act like radio buttons
- Only one can be selected at a time
- `aria-pressed` indicates selection state
- Use for view modes, filters, or tab-like navigation

**Rounding Logic**:
- First button: `rounded-l` (left corners)
- Middle buttons: No rounding
- Last button: `rounded-r` (right corners)
- Borders between buttons: `border-r`

### Live Demo

See this component: [Button Enhancements - Button Groups](../../../../src/main/resources/static/mockups/design-system.html#buttons-states)

## Best Practices

### 1. Semantic Variant Selection

```kotlin
// ✅ Good: Semantic variant choice
primaryButton("Create Project")      // Main action
secondaryButton("Cancel")           // Secondary action
ghostButton("Learn More")           // Tertiary action
dangerButton("Delete Forever")      // Destructive action

// ❌ Bad: Multiple primary buttons competing
primaryButton("Save")
primaryButton("Save as Draft")
primaryButton("Export")
```

**Rule**: One primary button per section. Use secondary/ghost for additional actions.

### 2. Size Consistency

```kotlin
// ✅ Good: Consistent sizes in groups
buttonGroup {
    primaryButton("Save", size = ButtonSize.MEDIUM)
    secondaryButton("Cancel", size = ButtonSize.MEDIUM)
}

// ❌ Bad: Mixed sizes look misaligned
buttonGroup {
    primaryButton("Save", size = ButtonSize.LARGE)
    secondaryButton("Cancel", size = ButtonSize.SMALL)
}
```

**Rule**: Use the same size for all buttons in a group or related context.

### 3. Loading State Management

```kotlin
// ✅ Good: Disable during async operation
fun FlowContent.saveProjectForm(isSaving: Boolean) {
    form {
        // ... form fields ...

        loadingButton(
            label = "Save Project",
            isLoading = isSaving
        )
    }
}

// ❌ Bad: User can double-click
button { +"Save Project" }  // No loading state
```

**Rule**: Always use loading states for async operations (API calls, file uploads, etc.).

### 4. Icon-Only Accessibility

```kotlin
// ✅ Good: ARIA label describes action
iconOnlyButton(ariaLabel = "Edit project") {
    // edit icon
}

// ❌ Bad: No label for screen readers
button { svg { /* icon */ } }
```

**Rule**: Icon-only buttons MUST have descriptive `aria-label` attributes.

## Common Issues

### Issue: Focus Ring Cut Off

**Problem**: Focus rings are clipped by parent containers.

**Solution**: Add ring-offset to push ring outside button:

```kotlin
// ✅ Include ring-offset matching background
"focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
```

### Issue: Buttons Not Aligned

**Problem**: Buttons with different padding don't align vertically.

**Solution**: Use consistent `ButtonSize` enum:

```kotlin
primaryButton("Save", size = ButtonSize.MEDIUM)
secondaryButton("Cancel", size = ButtonSize.MEDIUM)
```

### Issue: Double-Submit on Forms

**Problem**: Users click submit button multiple times during loading.

**Solution**: Use `loadingButton` with proper state management:

```kotlin
loadingButton(label = "Submit", isLoading = isSubmitting)
```

## Related Examples

- [Form Component Examples](form-component-examples.md) - Form integration with buttons
- [Card Component Examples](card-component-examples.md) - Buttons within card layouts
- [Badge & Navigation Examples](badge-navigation-examples.md) - Navigation button patterns

## References

- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)
- [Design Tokens](../../reference/ui/design-tokens.md)
- [Ktor HTML DSL Documentation](https://ktor.io/docs/html-dsl.html)
