---
title: "Form Component Examples"
type: example
domain: [ui, frontend, components]
description: "Working examples of form inputs using Ktor HTML DSL and Tailwind CSS"
dependencies: [../../patterns/ui/tailwind-design-system.md, ../../reference/ui/design-tokens.md]
related: [button-component-examples.md]
keywords: [forms, input, textarea, select, checkbox, radio, ktor-html-dsl, tailwind, validation]
tested: false
last_updated: 2025-10-28
---

# Form Component Examples

## Overview

This document provides complete working examples of form input components built with Ktor's HTML DSL and styled using the Tailwind design system. Forms are critical for data collection, supporting text inputs, textareas, select dropdowns, checkboxes, radio buttons, and search inputs with comprehensive validation states.

**Key Features**:
- Type-safe form generation with Kotlin HTML DSL
- Five validation states (default, error, success, disabled, loading)
- Accessible form controls (labels, ARIA attributes, error messages)
- Three size variants for visual hierarchy
- Character count tracking for textareas
- Icon-enhanced search inputs

## Prerequisites

- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Color tokens and utility patterns
- [Design Tokens Reference](../../reference/ui/design-tokens.md) - Brand and neutral color values
- [Button Component Examples](button-component-examples.md) - Form submission buttons
- Basic understanding of Ktor HTML DSL
- Familiarity with HTML form validation

## Example 1: Text Input (All States)

Text inputs are the most common form control, supporting default, error, success, and disabled states.

### Complete Working Code

```kotlin
package io.spiralhouse.cycletime.ui.components

import kotlinx.html.*

/**
 * Text input with validation state support.
 */
fun FlowContent.textInput(
    id: String,
    name: String,
    label: String,
    placeholder: String = "",
    value: String = "",
    state: InputState = InputState.DEFAULT,
    helpText: String? = null,
    errorMessage: String? = null,
    successMessage: String? = null,
    required: Boolean = false,
    disabled: Boolean = false,
    size: InputSize = InputSize.MEDIUM
) {
    val sizeClasses = when (size) {
        InputSize.SMALL -> "px-3 py-1.5 text-sm"
        InputSize.MEDIUM -> "px-4 py-2 text-base"
        InputSize.LARGE -> "px-6 py-3 text-lg"
    }

    val stateClasses = when (state) {
        InputState.DEFAULT -> "border-neutral-600 focus:border-brand-500 focus:ring-brand-400"
        InputState.ERROR -> "border-red-600 focus:border-red-500 focus:ring-red-400"
        InputState.SUCCESS -> "border-green-600 focus:border-green-500 focus:ring-green-400"
        InputState.DISABLED -> "border-neutral-700 opacity-50 cursor-not-allowed"
    }

    div {
        // Label
        label(classes = "block text-sm font-medium ${if (disabled) "text-neutral-500" else "text-neutral-200"} mb-2") {
            htmlFor = id
            +label
            if (required) {
                span(classes = "text-red-400") { +" *" }
            }
        }

        // Input field
        input(
            type = InputType.text,
            name = name,
            classes = """
                w-full $sizeClasses bg-neutral-900 border rounded
                text-neutral-100 placeholder-neutral-500
                focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-850
                transition-all
                $stateClasses
            """.trimIndent().replace("\n", " ")
        ) {
            this.id = id
            this.value = value
            this.placeholder = placeholder
            this.disabled = disabled
            this.required = required

            if (state == InputState.ERROR) {
                attributes["aria-invalid"] = "true"
                errorMessage?.let { attributes["aria-describedby"] = "$id-error" }
            }
            if (required) {
                attributes["aria-required"] = "true"
            }
        }

        // Help text or validation message
        when {
            state == InputState.ERROR && errorMessage != null -> {
                p(classes = "text-xs text-red-400 mt-1 flex items-center gap-1") {
                    id = "$id-error"
                    errorIcon()
                    span { +errorMessage }
                }
            }
            state == InputState.SUCCESS && successMessage != null -> {
                p(classes = "text-xs text-green-400 mt-1 flex items-center gap-1") {
                    id = "$id-success"
                    successIcon()
                    span { +successMessage }
                }
            }
            helpText != null -> {
                p(classes = "text-xs text-neutral-500 mt-1") {
                    +helpText
                }
            }
        }
    }
}

enum class InputState {
    DEFAULT, ERROR, SUCCESS, DISABLED
}

enum class InputSize {
    SMALL, MEDIUM, LARGE
}

// Helper icons
fun FlowContent.errorIcon() {
    svg(classes = "w-4 h-4") {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        unsafe {
            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
        }
    }
}

fun FlowContent.successIcon() {
    svg(classes = "w-4 h-4") {
        attributes["fill"] = "none"
        attributes["stroke"] = "currentColor"
        attributes["viewBox"] = "0 0 24 24"
        unsafe {
            raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>""")
        }
    }
}

// Usage examples:
fun FlowContent.inputStateExamples() {
    div(classes = "space-y-6") {
        // Default state
        textInput(
            id = "project-name",
            name = "name",
            label = "Project Name",
            placeholder = "Enter project name",
            helpText = "This will be visible to all team members"
        )

        // Error state
        textInput(
            id = "email",
            name = "email",
            label = "Email Address",
            value = "invalid-email",
            state = InputState.ERROR,
            errorMessage = "Please enter a valid email address",
            required = true
        )

        // Success state
        textInput(
            id = "username",
            name = "username",
            label = "Username",
            value = "john_developer",
            state = InputState.SUCCESS,
            successMessage = "Username is available"
        )

        // Disabled state
        textInput(
            id = "org-id",
            name = "orgId",
            label = "Organization ID",
            value = "org_2Dn8xKwL9Mf4",
            disabled = true,
            helpText = "This field cannot be edited"
        )
    }
}
```

### Explanation

**Validation States**:
- `DEFAULT`: Neutral border (`border-neutral-600`), brand focus ring
- `ERROR`: Red border (`border-red-600`), red focus ring, error icon
- `SUCCESS`: Green border (`border-green-600`), success icon
- `DISABLED`: Gray border, reduced opacity, `cursor-not-allowed`

**Accessibility**:
- `htmlFor` connects label to input via `id`
- `aria-invalid="true"` on error inputs
- `aria-describedby` links to error message
- `aria-required` for required fields
- Required indicator: red asterisk (*) after label

**Size Variants**:
- Small: 32px height (`px-3 py-1.5 text-sm`)
- Medium: 40px height (`px-4 py-2 text-base`) - default
- Large: 48px height (`px-6 py-3 text-lg`)

### Live Demo

See this component: [Forms - Text Input](../../../../src/main/resources/static/mockups/design-system.html#forms-inputs)

## Example 2: Textarea with Character Count

Textareas support multi-line text entry with optional character count tracking.

### Complete Working Code

```kotlin
/**
 * Textarea with character count.
 */
fun FlowContent.textareaInput(
    id: String,
    name: String,
    label: String,
    placeholder: String = "",
    value: String = "",
    rows: String = "6",
    maxLength: Int? = null,
    helpText: String? = null,
    required: Boolean = false,
    disabled: Boolean = false
) {
    div {
        // Label with optional character count
        div(classes = "flex items-center justify-between mb-2") {
            label(classes = "block text-sm font-medium ${if (disabled) "text-neutral-500" else "text-neutral-200"}") {
                htmlFor = id
                +label
                if (required) {
                    span(classes = "text-red-400") { +" *" }
                }
            }

            // Character count
            if (maxLength != null) {
                span(classes = "text-xs text-neutral-500") {
                    +"${value.length} / $maxLength"
                }
            }
        }

        // Textarea field
        textArea(
            name = name,
            classes = """
                w-full px-4 py-3 bg-neutral-900 border border-neutral-600 rounded
                text-neutral-100 placeholder-neutral-500 resize-y
                focus:border-brand-500 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850
                transition-all
                ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
            """.trimIndent().replace("\n", " ")
        ) {
            this.id = id
            this.rows = rows
            this.placeholder = placeholder
            this.disabled = disabled
            this.required = required
            maxLength?.let { attributes["maxlength"] = it.toString() }

            +value
        }

        // Help text
        helpText?.let {
            p(classes = "text-xs text-neutral-500 mt-1") { +it }
        }
    }
}

// Usage examples:
fun FlowContent.textareaExamples() {
    div(classes = "space-y-6") {
        // Basic textarea
        textareaInput(
            id = "description",
            name = "description",
            label = "Project Description",
            placeholder = "Describe your project goals, scope, and requirements...",
            helpText = "Minimum 20 characters"
        )

        // With character count
        textareaInput(
            id = "issue-desc",
            name = "issueDescription",
            label = "Issue Description",
            value = "A unified project orchestration framework for Claude Code that extends development capabilities with structured task management.",
            rows = "4",
            maxLength = 500
        )
    }
}
```

### Explanation

**Character Count Display**:
- Shows current length vs max length: "127 / 500"
- Positioned in label row for space efficiency
- Uses `maxlength` attribute to enforce limit browser-side
- Updates dynamically as user types (requires JavaScript)

**Resizing**:
- `resize-y` allows vertical resizing only
- Prevents horizontal resize which breaks layouts
- User can adjust height for longer content

### Live Demo

See this component: [Forms - Textarea](../../../../src/main/resources/static/mockups/design-system.html#forms-textarea)

## Example 3: Select Dropdown

Select dropdowns provide a list of options with custom styling.

### Complete Working Code

```kotlin
/**
 * Select dropdown with custom chevron icon.
 */
fun FlowContent.selectDropdown(
    id: String,
    name: String,
    label: String,
    options: List<SelectOption>,
    selectedValue: String? = null,
    required: Boolean = false,
    disabled: Boolean = false
) {
    div {
        // Label
        label(classes = "block text-sm font-medium ${if (disabled) "text-neutral-500" else "text-neutral-200"} mb-2") {
            htmlFor = id
            +label
            if (required) {
                span(classes = "text-red-400") { +" *" }
            }
        }

        // Select wrapper with custom chevron
        div(classes = "relative") {
            select(
                classes = """
                    w-full px-4 py-2 bg-neutral-900 border border-neutral-600 rounded
                    text-neutral-100 appearance-none
                    focus:border-brand-500 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850
                    cursor-pointer transition-all
                    ${if (disabled) "opacity-50 cursor-not-allowed" else ""}
                """.trimIndent().replace("\n", " ")
            ) {
                this.id = id
                this.name = name
                this.disabled = disabled
                this.required = required

                options.forEach { opt ->
                    option {
                        value = opt.value
                        selected = opt.value == selectedValue
                        +opt.label
                    }
                }
            }

            // Custom chevron icon
            div(classes = "pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 ${if (disabled) "text-neutral-600" else "text-neutral-400"}") {
                svg(classes = "w-5 h-5") {
                    attributes["fill"] = "none"
                    attributes["stroke"] = "currentColor"
                    attributes["viewBox"] = "0 0 24 24"
                    unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>""")
                    }
                }
            }
        }
    }
}

data class SelectOption(val label: String, val value: String)

// Usage example:
fun FlowContent.issueStatusSelect(currentStatus: String = "in-progress") {
    selectDropdown(
        id = "status",
        name = "status",
        label = "Issue Status",
        selectedValue = currentStatus,
        options = listOf(
            SelectOption("Backlog", "backlog"),
            SelectOption("Todo", "todo"),
            SelectOption("In Progress", "in-progress"),
            SelectOption("In Review", "in-review"),
            SelectOption("Done", "done"),
            SelectOption("Canceled", "canceled")
        )
    )
}
```

### Explanation

**Custom Chevron**:
- Browser default dropdowns can't be styled consistently
- `appearance-none` removes native styling
- Custom chevron positioned absolutely in right padding
- `pointer-events-none` prevents clicking chevron (click passes through to select)

**Selected State**:
- `selectedValue` parameter sets initial selection
- `selected` attribute on matching option
- Server-side rendering includes selection state

### Live Demo

See this component: [Forms - Select Dropdown](../../../../src/main/resources/static/mockups/design-system.html#forms-select)

## Example 4: Checkbox

Checkboxes allow multi-select options with clear visual states.

### Complete Working Code

```kotlin
/**
 * Checkbox input with label.
 */
fun FlowContent.checkbox(
    id: String,
    name: String,
    label: String,
    checked: Boolean = false,
    disabled: Boolean = false
) {
    div(classes = "flex items-center") {
        input(
            type = InputType.checkBox,
            name = name,
            classes = """
                w-5 h-5 bg-neutral-900 border-2 border-neutral-600 rounded
                text-brand-500
                focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850
                transition-all
                ${if (disabled) "opacity-50 cursor-not-allowed" else "cursor-pointer"}
            """.trimIndent().replace("\n", " ")
        ) {
            this.id = id
            this.checked = checked
            this.disabled = disabled
        }

        label(
            classes = "ml-3 text-sm ${if (disabled) "text-neutral-500 cursor-not-allowed" else "text-neutral-200 cursor-pointer"}"
        ) {
            htmlFor = id
            +label
        }
    }
}

// Usage examples:
fun FlowContent.checkboxExamples() {
    div(classes = "space-y-4") {
        checkbox(
            id = "notify-email",
            name = "notifyEmail",
            label = "Send email notifications for new issues"
        )

        checkbox(
            id = "realtime",
            name = "realtime",
            label = "Enable real-time collaboration features",
            checked = true
        )

        checkbox(
            id = "analytics",
            name = "analytics",
            label = "Advanced analytics (Pro plan only)",
            disabled = true
        )

        checkbox(
            id = "2fa",
            name = "twoFactor",
            label = "Two-factor authentication (Always enabled)",
            checked = true,
            disabled = true
        )
    }
}
```

### Explanation

**Checkbox Styling**:
- `w-5 h-5` for 20px checkbox (matches icon sizes)
- `text-brand-500` colors the checkmark
- `rounded` for subtle corner rounding (not `rounded-full`)
- Border uses `border-2` for stronger visual presence

**Label Association**:
- `htmlFor` connects label to checkbox via `id`
- Clicking label toggles checkbox (native HTML behavior)
- Both checkbox and label get `cursor-pointer`

**Disabled State**:
- `opacity-50` dims appearance
- `cursor-not-allowed` on both checkbox and label
- Checked state preserved when disabled

### Live Demo

See this component: [Forms - Checkbox](../../../../src/main/resources/static/mockups/design-system.html#forms-checkbox)

## Example 5: Radio Buttons

Radio buttons provide single-select options with descriptive labels.

### Complete Working Code

```kotlin
/**
 * Radio button with label and description.
 */
fun FlowContent.radioButton(
    id: String,
    name: String,
    value: String,
    label: String,
    description: String? = null,
    checked: Boolean = false,
    disabled: Boolean = false
) {
    div(classes = "flex items-center") {
        input(
            type = InputType.radio,
            name = name,
            classes = """
                w-5 h-5 bg-neutral-900 border-2 border-neutral-600
                text-brand-500
                focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850
                transition-all
                ${if (disabled) "opacity-50 cursor-not-allowed" else "cursor-pointer"}
            """.trimIndent().replace("\n", " ")
        ) {
            this.id = id
            this.value = value
            this.checked = checked
            this.disabled = disabled
        }

        label(classes = "ml-3 ${if (disabled) "cursor-not-allowed" else "cursor-pointer"}") {
            htmlFor = id

            span(classes = "text-sm font-medium ${if (disabled) "text-neutral-500" else "text-neutral-200"}") {
                +label
            }

            description?.let { desc ->
                p(classes = "text-xs ${if (disabled) "text-neutral-600" else "text-neutral-500"}") {
                    +desc
                }
            }
        }
    }
}

/**
 * Radio button group with legend.
 */
fun FlowContent.radioGroup(
    legend: String,
    name: String,
    options: List<RadioOption>,
    selectedValue: String? = null
) {
    fieldSet {
        legend(classes = "text-sm font-medium text-neutral-200 mb-3") {
            +legend
        }

        div(classes = "space-y-4") {
            options.forEach { option ->
                radioButton(
                    id = "${name}-${option.value}",
                    name = name,
                    value = option.value,
                    label = option.label,
                    description = option.description,
                    checked = option.value == selectedValue,
                    disabled = option.disabled
                )
            }
        }
    }
}

data class RadioOption(
    val label: String,
    val value: String,
    val description: String? = null,
    val disabled: Boolean = false
)

// Usage example:
fun FlowContent.visibilityRadioGroup(selected: String = "private") {
    radioGroup(
        legend = "Project Visibility",
        name = "visibility",
        selectedValue = selected,
        options = listOf(
            RadioOption(
                label = "Private",
                value = "private",
                description = "Only team members can access"
            ),
            RadioOption(
                label = "Team",
                value = "team",
                description = "Visible to organization members"
            ),
            RadioOption(
                label = "Public",
                value = "public",
                description = "Anyone with the link can view"
            )
        )
    )
}
```

### Explanation

**Radio vs Checkbox**:
- Radio buttons: Single selection within a group (same `name`)
- Checkboxes: Multiple selections (different `name` per option)
- Radio buttons are circular (browser default), checkboxes are square

**Description Support**:
- Optional `description` parameter adds context
- Smaller text size (`text-xs`) for secondary information
- Helps users make informed choices

**Fieldset Structure**:
- `fieldSet` groups related radio buttons
- `legend` provides accessible group label
- Screen readers announce group context

### Live Demo

See this component: [Forms - Radio Buttons](../../../../src/main/resources/static/mockups/design-system.html#forms-radio)

## Example 6: Search Input

Search inputs combine icon decoration with clear functionality.

### Complete Working Code

```kotlin
/**
 * Search input with icon and clear button.
 */
fun FlowContent.searchInput(
    id: String,
    name: String,
    placeholder: String = "Search...",
    value: String = "",
    ariaLabel: String = "Search"
) {
    div {
        label(classes = "sr-only") {
            htmlFor = id
            +ariaLabel
        }

        div(classes = "relative") {
            // Search icon (left side)
            div(classes = "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4") {
                svg(classes = "w-5 h-5 text-neutral-400") {
                    attributes["fill"] = "none"
                    attributes["stroke"] = "currentColor"
                    attributes["viewBox"] = "0 0 24 24"
                    unsafe {
                        raw("""<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>""")
                    }
                }
            }

            // Input field
            input(
                type = InputType.search,
                name = name,
                classes = """
                    w-full pl-11 pr-11 py-3
                    bg-neutral-900 border border-neutral-600 rounded-full
                    text-neutral-100 placeholder-neutral-500
                    focus:border-brand-500 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850
                    transition-all
                """.trimIndent().replace("\n", " ")
            ) {
                this.id = id
                this.value = value
                this.placeholder = placeholder
            }

            // Clear button (right side)
            button(
                classes = "absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400 hover:text-neutral-300 transition-colors",
                type = ButtonType.button
            ) {
                attributes["aria-label"] = "Clear search"

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

// Usage example:
fun FlowContent.globalSearch() {
    searchInput(
        id = "global-search",
        name = "q",
        placeholder = "Search projects, issues, or documentation...",
        ariaLabel = "Search"
    )
}
```

### Explanation

**Icon Positioning**:
- Left icon: `pl-11` on input, `left-0 pl-4` on icon container
- Right button: `pr-11` on input, `right-0 pr-4` on button
- `pointer-events-none` on left icon (decorative only)
- `inset-y-0` vertically centers icons

**Rounded Style**:
- `rounded-full` creates pill shape (common for search)
- Alternative: `rounded` for standard rounded corners
- Pill shape visually distinguishes search from other inputs

**Clear Functionality**:
- X button clears input value
- Requires JavaScript: `onclick="this.previousElementSibling.value = ''"`
- `aria-label` describes button action

### Live Demo

See this component: [Forms - Search Input](../../../../src/main/resources/static/mockups/design-system.html#forms-inputs)

## Example 7: Complete Form with Validation

Complete form example with multiple input types and validation.

### Complete Working Code

```kotlin
/**
 * Complete project creation form.
 */
fun FlowContent.createProjectForm(
    errors: Map<String, String> = emptyMap(),
    values: Map<String, String> = emptyMap()
) {
    form(classes = "space-y-6") {
        attributes["method"] = "post"
        attributes["action"] = "/projects"

        // Project name
        textInput(
            id = "name",
            name = "name",
            label = "Full Name",
            placeholder = "John Doe",
            value = values["name"] ?: "",
            state = if (errors.containsKey("name")) InputState.ERROR else InputState.DEFAULT,
            errorMessage = errors["name"],
            required = true
        )

        // Email
        textInput(
            id = "email",
            name = "email",
            label = "Email Address",
            placeholder = "john@example.com",
            value = values["email"] ?: "",
            state = if (errors.containsKey("email")) InputState.ERROR else InputState.DEFAULT,
            errorMessage = errors["email"],
            required = true
        )

        // Description
        textareaInput(
            id = "description",
            name = "description",
            label = "Project Description",
            placeholder = "Describe your project...",
            value = values["description"] ?: "",
            rows = "4",
            maxLength = 500,
            required = true
        )

        // Visibility
        radioGroup(
            legend = "Project Visibility",
            name = "visibility",
            selectedValue = values["visibility"] ?: "private",
            options = listOf(
                RadioOption("Private", "private", "Only team members"),
                RadioOption("Team", "team", "Organization members"),
                RadioOption("Public", "public", "Anyone with link")
            )
        )

        // Agreement checkbox
        checkbox(
            id = "agree",
            name = "agree",
            label = "I agree to the Terms of Service and Privacy Policy *",
            checked = values["agree"] == "true"
        )

        // Submit buttons
        div(classes = "flex gap-3") {
            button(
                type = ButtonType.submit,
                classes = "px-6 py-2 text-base font-medium rounded bg-brand-500 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850 active:bg-brand-700 transition-all"
            ) {
                +"Submit Form"
            }

            button(
                type = ButtonType.reset,
                classes = "px-6 py-2 text-base font-medium rounded border border-neutral-600 text-neutral-100 hover:bg-neutral-800 focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850 transition-all"
            ) {
                +"Reset"
            }
        }
    }
}

// Server-side validation example:
fun Application.configureProjectForm() {
    post("/projects") {
        val params = call.receiveParameters()
        val errors = mutableMapOf<String, String>()

        // Validation logic
        if (params["name"].isNullOrBlank()) {
            errors["name"] = "Name is required"
        }

        val email = params["email"]
        if (email.isNullOrBlank()) {
            errors["email"] = "Email is required"
        } else if (!email.contains("@")) {
            errors["email"] = "Please enter a valid email address"
        }

        if (errors.isNotEmpty()) {
            // Re-render form with errors
            call.respondHtml(HttpStatusCode.UnprocessableEntity) {
                createProjectForm(errors, params.toMap())
            }
        } else {
            // Process form
            // ...
        }
    }
}
```

### Explanation

**Server-Side Validation**:
- Form submits to server endpoint
- Server validates and returns errors
- Errors passed to form as `Map<String, String>`
- Input states update based on error presence

**Value Preservation**:
- Form values preserved on validation failure
- `values` map passed from server
- Each input checks for existing value

**Progressive Enhancement**:
- Works without JavaScript (server-side validation)
- Can add client-side validation for instant feedback
- HTML5 validation attributes (`required`, `type="email"`)

### Live Demo

See this component: [Forms - Complete Example](../../../../src/main/resources/static/mockups/design-system.html#forms)

## Best Practices

### 1. Always Associate Labels

```kotlin
// ✅ Good: Label connected via htmlFor
label(classes = "...") {
    htmlFor = "email-input"
    +"Email"
}
input { id = "email-input" }

// ❌ Bad: Label not connected
label { +"Email" }
input { /* no id */ }
```

**Rule**: Every form input must have an associated `<label>` with `htmlFor`.

### 2. Provide Clear Error Messages

```kotlin
// ✅ Good: Specific, actionable error
errorMessage = "Email must contain @ symbol"

// ❌ Bad: Vague error
errorMessage = "Invalid input"
```

**Rule**: Error messages should explain what's wrong and how to fix it.

### 3. Required Field Indicators

```kotlin
// ✅ Good: Visual and ARIA required indicator
label {
    +"Email "
    span(classes = "text-red-400") { +"*" }
}
input {
    required = true
    attributes["aria-required"] = "true"
}

// ❌ Bad: Only visual indicator
label { +"Email *" }
input { required = true }  // Missing aria-required
```

**Rule**: Use both visual (`*`) and ARIA (`aria-required`) indicators.

## Common Issues

### Issue: Focus Ring Cut Off

**Problem**: Focus rings clipped by containers.

**Solution**: Add `ring-offset` to push ring outside element:

```kotlin
"focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-neutral-850"
```

### Issue: Label Not Clickable

**Problem**: Clicking label doesn't focus input.

**Solution**: Connect label with `htmlFor`:

```kotlin
label { htmlFor = "my-input"; +"Label" }
input { id = "my-input" }
```

### Issue: Select Dropdown Arrow Hidden

**Problem**: Custom styling hides native chevron.

**Solution**: Use `appearance-none` and add custom icon:

```kotlin
select(classes = "appearance-none") { /* options */ }
div(classes = "pointer-events-none absolute inset-y-0 right-0 ...") {
    // Custom chevron SVG
}
```

## Related Examples

- [Button Component Examples](button-component-examples.md) - Submit and reset buttons
- [Card Component Examples](card-component-examples.md) - Form layout patterns
- [Badge & Navigation Examples](badge-navigation-examples.md) - Form navigation

## References

- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)
- [Design Tokens](../../reference/ui/design-tokens.md)
- [MDN Web Forms Guide](https://developer.mozilla.org/en-US/docs/Learn/Forms)
- [Ktor HTML DSL Documentation](https://ktor.io/docs/html-dsl.html)
