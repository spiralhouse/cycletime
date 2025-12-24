---
title: "UI Mockup Catalog"
type: reference
domain: [ui, mockups]
description: "Complete catalog of available UI mockups with viewing instructions and usage guidelines"
dependencies: [design-tokens.md]
related: [../../guides/ui/viewing-mockups-guide.md, ../../patterns/ui/tailwind-design-system.md]
keywords: [mockups, html, design-system, layout, navigation, viewing, catalog]
audience: [ui-engineers, designers, developers]
last_updated: 2025-10-29
---

# UI Mockup Catalog

## Overview

This catalog provides a complete reference to all available UI mockups in the CycleTime project. Mockups are static HTML files that demonstrate UI patterns, components, and layouts using the project's design system.

**Location**: `src/main/resources/static/mockups/`

**Purpose**:
- Interactive demonstration of design system components
- Layout and navigation patterns for dashboard pages
- Reference for implementing server-side rendered views (Ktor HTML DSL)
- Visual QA and responsive design testing

## Available Mockups

### 1. Design System Foundation

**File**: `src/main/resources/static/mockups/design-system.html`
**Status**: ✅ Complete (SPI-835)
**Size**: ~2,200 lines

**Purpose**: Comprehensive interactive showcase of the CycleTime design system including all foundational tokens and component examples.

**Contents**:
- **Color Palette** (Section 1.1)
  - Brand colors (brand-400 through brand-900)
  - Neutral scale (neutral-50 through neutral-950)
  - Status colors (success, warning, error, info)

- **Typography Scale** (Section 1.2)
  - Display, Heading, Body, Small, Caption sizes
  - Font families: Inter (sans), JetBrains Mono (mono)
  - Font weight examples (400, 500, 600, 700)

- **Spacing System** (Section 1.3)
  - 4px base unit scale (space-1 through space-16)
  - Visual spacing examples

- **Component Library** (Section 2)
  - Buttons (primary, secondary, ghost, danger variants)
  - Cards (project, issue, info layouts)
  - Badges (status, count, pill styles)
  - Forms (inputs, textarea, select, checkbox, radio)
  - Icons and loading states
  - Navigation patterns

**Viewing**:
- Direct: [Open design-system.html](../../../src/main/resources/static/mockups/design-system.html)
- Via server: `http://localhost:8080/mockups/design-system.html`

**Documentation References**:
- [Design Tokens](design-tokens.md) - Complete token specifications
- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md) - Implementation patterns
- [Component Examples](../../examples/ui/) - Code snippets for each component

**Use Cases**:
- Reference when implementing new UI components
- Copy color codes and spacing values
- Visual QA for design consistency
- Onboarding new UI engineers

---

### 2. Layout Pattern & Navigation Structure

**File**: `src/main/resources/static/mockups/layout-template.html`
**Status**: ✅ Complete (SPI-836)
**Size**: 290 lines

**Purpose**: Foundational navigation layout template that establishes patterns for all dashboard pages with responsive behavior and active page indicators.

**Contents**:
- **Primary Navigation Bar**
  - Brand logo (CycleTime)
  - 4 navigation links: Projects (home), Issues, Settings, System Status
  - Active page indicator (Projects highlighted)
  - Responsive behavior (hamburger menu on mobile)

- **Mobile Menu**
  - Hidden by default
  - JavaScript toggle for mockup (HTMX integration notes included)
  - Vertical stacked layout with touch-friendly targets

- **Content Area**
  - Centered layout with max-width 1280px
  - Responsive padding (16px mobile, 24px tablet, 32px desktop)
  - Example content placeholder showing layout features

- **Footer**
  - Minimal footer with project name
  - Sticks to bottom using flexbox

**Responsive Breakpoints**:
- **375px (mobile)**: Hamburger button visible, horizontal nav hidden
- **768px (tablet)**: Transition to horizontal navigation
- **1280px (desktop)**: Full layout with optimal spacing

**Design System Integration**:
- Colors: brand-400 (#3ba3c9), neutral-850 (#1a1a1a), neutral-900 (#171717)
- Typography: Inter font family with multiple weights
- Spacing: Consistent 4px base unit scale
- Perfect consistency with design-system.html

**Accessibility** (WCAG 2.1 AAA):
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<footer>`
- ARIA attributes: `aria-label`, `aria-current`, `aria-expanded`, `aria-controls`
- Focus states: Visible brand color rings on all interactive elements
- Color contrast: > 16:1 (neutral-100 on neutral-950)
- Full keyboard navigation support

**Viewing**:
- Direct: [Open layout-template.html](../../../src/main/resources/static/mockups/layout-template.html)
- Via server: `http://localhost:8080/mockups/layout-template.html`

**Documentation References**:
- [Navigation Examples](../../examples/ui/badge-navigation-examples.md) - Navigation component code
- [HTMX Patterns](../../patterns/ui/htmx-patterns.md) - Progressive enhancement strategy
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Server-side rendering

**Use Cases**:
- Template for creating new dashboard pages
- Testing responsive navigation behavior
- Reference for implementing Ktor HTML DSL navigation component
- Visual QA for layout consistency across pages

**Future HTMX Integration**:
Template includes comprehensive inline documentation (lines 269-287) for implementing server-side menu toggle via `/api/menu/toggle` endpoint.

---

### 3. Home Page

**File**: `src/main/resources/static/mockups/home-page.html`
**Status**: ✅ Complete (SPI-837)
**Size**: 529 lines

**Purpose**: Home page displaying project list with completion indicators, statistics, and responsive grid layout demonstrating project card patterns.

**Contents**:
- **Project Card Grid**
  - Responsive columns: 1 (mobile), 2 (tablet), 3 (desktop)
  - 24px gap between cards (`gap-6`)
  - Sample data: 6 projects with varying completion states

- **Project Cards**
  - Project name with truncation for long titles (`truncate`)
  - Description with 2-line clamp (`line-clamp-2`)
  - Placeholder text for missing descriptions
  - Statistics row: issue count, points total
  - Progress bar with conditional colors
  - Hover effects: border color, shadow, subtle lift

- **Progress Visualization**
  - Brand-500 (#3ba3c9) for in-progress projects (1-99%)
  - Success-500 (#22c55e) for 100% complete projects
  - Empty state for 0% complete projects
  - ARIA progressbar attributes for accessibility

- **Edge Cases Demonstrated**
  - 0% complete: "Not started" state
  - 25%, 50%, 75%, 90%: Various progress levels
  - 100% complete: Green success color
  - Long project names: Text truncation
  - Missing descriptions: Placeholder text
  - Long descriptions: Line clamping

- **Navigation Structure**
  - Extends layout-template.html navigation
  - "Projects" link in active state
  - Responsive hamburger menu (mobile)

- **Empty State Pattern**
  - Included in HTML comments
  - "No projects yet" message
  - "Create Project" call-to-action button

**Responsive Breakpoints**:
| Breakpoint | Width | Grid Layout | Card Behavior |
|------------|-------|-------------|---------------|
| Mobile     | 375px | Single column (`grid-cols-1`) | Full-width cards, stacked stats |
| Tablet     | 768px | Two columns (`md:grid-cols-2`) | Side-by-side cards |
| Desktop    | 1280px+ | Three columns (`lg:grid-cols-3`) | Optimal grid density |

**Viewing**:
```bash
# Option 1: Direct file open
open src/main/resources/static/mockups/home-page.html

# Option 2: Via development server
./gradlew run
# Navigate to http://localhost:8080/mockups/home-page.html
```

**Documentation References**:
- [Design Tokens](design-tokens.md) - Color palette (brand-500, success-500, neutral scale)
- [Card Component Examples](../../examples/ui/card-component-examples.md) - Project card pattern
- [Tailwind Design System](../../patterns/ui/tailwind-design-system.md) - Grid and component patterns
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Server-side conversion

**Use Cases**:
- Visual reference for implementing home page with Ktor HTML DSL
- Project card layout pattern demonstration
- Progress bar visualization with conditional colors
- Responsive grid layout testing (1/2/3 columns)
- Edge case handling reference (0%/100% complete, missing data, long text)
- Empty state design pattern
- Completion percentage tracking UI
- Accessibility patterns (ARIA progressbar, semantic HTML)

---

### 4. Issues Page

**File**: `src/main/resources/static/mockups/issues-page.html`
**Status**: ✅ Complete (SPI-838)
**Size**: ~700 lines

**Purpose**: Hierarchical issue list with expandable Epic → Story → Subtask relationships, status indicators, and project/status filtering demonstrating HTMX-powered lazy loading patterns.

**Contents**:
- **Hierarchical Issue Display**
  - Expandable Epic → Story → Subtask structure
  - Left border accent with depth-based indentation (0rem, 2rem, 4rem)
  - Chevron rotation animation on expansion
  - Visual hierarchy with icon differentiation (📚 Epic, 📖 Story, 📝 Subtask)

- **HTMX Integration**
  - `hx-get="/api/issues/{id}/children"` for lazy-loading child issues
  - `hx-target` for container-specific updates
  - `hx-push-url="true"` for URL parameter persistence on filter changes
  - `hx-include` for coordinating multiple filter inputs
  - Loading indicators with spinner animation
  - Hyperscript for chevron rotation and container toggling

- **Filter Controls**
  - Project dropdown with "All Projects" option
  - Status dropdown with 6 workflow states (Backlog, Todo, In Progress, In Review, Done, Canceled)
  - Clear filters button resetting to defaults
  - HTMX-powered filter coordination (updates without page reload)

- **Status Badges**
  - Six semantic states with color coding:
    - Backlog: Gray (bg-gray-800/text-gray-300)
    - Todo: Blue (bg-blue-900/50/text-blue-300)
    - In Progress: Yellow (bg-yellow-900/50/text-yellow-300)
    - In Review: Purple (bg-purple-900/50/text-purple-300)
    - Done: Green (bg-green-900/50/text-green-300)
    - Canceled: Red (bg-red-900/50/text-red-300)

- **Issue Metadata Display**
  - Issue identifier (e.g., SPI-834) in monospace font
  - Issue title with truncation on overflow
  - Status badge with semantic colors
  - Child count indicator
  - Estimate points for subtasks

- **Empty States**
  - "No issues yet" state with "Create Issue" CTA
  - "No issues found" state for filtered results with "Clear Filters" button

- **Responsive Behavior**
  - Mobile (<768px): Vertical filter stack, 1rem indentation (ml-4), simplified metadata
  - Desktop (≥768px): Horizontal filters, 2rem indentation (ml-8), complete metadata display
  - Touch-friendly tap targets (44px minimum)

- **Accessibility**
  - Semantic HTML structure (`<nav>`, `<main>`, `<header>`)
  - ARIA attributes: `aria-label`, `aria-expanded`, `aria-controls`, `aria-current`
  - Keyboard navigation: Tab to focus expansion buttons, Enter/Space to toggle
  - Screen reader support: Descriptive labels for all interactive elements

**Sample Data**:
Uses real SPI-834 Epic hierarchy demonstrating:
- Epic: SPI-834 "Design Web UI" (In Progress) with 4 stories
  - Story: SPI-835 "Design System Foundation" (Done) - 26 points, 3 subtasks
  - Story: SPI-836 "Layout Pattern & Navigation" (Done) - 5 points, 2 subtasks
  - Story: SPI-837 "Home Page UX" (Done) - 5 points, 2 subtasks
  - Story: SPI-838 "Issue List UX" (In Progress) - 8 points, 3 subtasks (expanded to show subtasks)
- Standalone Story: SPI-700 "Migrate to Official MCP SDK" (Done) - 13 points

**HTMX Patterns Demonstrated**:
- Lazy loading with `hx-trigger="click once"` for one-time expansion
- Filter coordination with `hx-include` for multi-input queries
- URL state management with `hx-push-url="true"`
- Loading indicators with `htmx-indicator` class
- Hyperscript for client-side enhancements (chevron rotation, container toggling)

**Responsive Breakpoints**:
| Breakpoint | Width | Indentation | Filter Layout | Metadata Display |
|------------|-------|-------------|---------------|------------------|
| Mobile     | <768px | 1rem (ml-4) | Vertical stack | Simplified |
| Desktop    | ≥768px | 2rem (ml-8) | Horizontal row | Complete |

**Viewing**:
```bash
# Option 1: Direct file open
open src/main/resources/static/mockups/issues-page.html

# Option 2: Via development server
./gradlew run
# Navigate to http://localhost:8080/mockups/issues-page.html
```

**Documentation References**:
- [HTMX Patterns](../../patterns/ui/htmx-patterns.md) - Hierarchical expansion pattern
- [Badge & Navigation Examples](../../examples/ui/badge-navigation-examples.md) - Status badge usage
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Phase 2 server conversion
- [Design Tokens](design-tokens.md) - Status color palette

**Use Cases**:
- Visual reference for implementing issues page with Ktor HTML DSL
- Hierarchical data display pattern demonstration
- HTMX lazy loading and expansion mechanics
- Filter coordination without page reload
- Status badge integration in hierarchical context
- Expansion state management via URL parameters
- Accessibility patterns for tree-like structures
- Responsive indentation strategy for mobile vs desktop

---

### 5. Settings Page

**File**: `src/main/resources/static/mockups/settings-page.html`
**Status**: ✅ Complete (SPI-839)
**Size**: 294 lines

**Purpose**: Professional placeholder for future settings functionality with outlined future vision.

**Contents**:
- **Navigation Structure**: Extends layout-template.html with "Settings" active
- **Placeholder Approach**: Outlined Categories (User Preferences, Project Defaults, MCP Configuration)
- **Design Intent**: Professional, navigable, extensible (not apologetic)
- **Future Categories**:
  * User Preferences: Personal settings, notifications, display preferences
  * Project Defaults: Workflows, estimation scales, templates
  * MCP Configuration: Server settings, integrations

**Viewing**:
```bash
open src/main/resources/static/mockups/settings-page.html
# Or via server: http://localhost:8080/mockups/settings-page.html
```

**Documentation References**:
- [Design Tokens](design-tokens.md) - Color palette and spacing
- [Layout Template](../../static/mockups/layout-template.html) - Navigation foundation

**Use Cases**:
- Navigation completion testing
- Placeholder pattern reference
- Future settings page foundation

---

### 6. System Status Page

**File**: `src/main/resources/static/mockups/system-status-page.html`
**Status**: ✅ Complete (SPI-839)
**Size**: 302 lines

**Purpose**: Professional placeholder for system health monitoring with basic health indicators.

**Contents**:
- **Navigation Structure**: Extends layout-template.html with "System Status" active
- **Health Indicators**: Server Status, Database Status, MCP Connection (all operational)
- **Status Visualization**: Green dot indicators, status text, last checked timestamps
- **Design Intent**: Suggests monitoring capability without full implementation
- **Future Vision**: Metrics, logs, diagnostics, performance monitoring

**Viewing**:
```bash
open src/main/resources/static/mockups/system-status-page.html
# Or via server: http://localhost:8080/mockups/system-status-page.html
```

**Documentation References**:
- [Icon & Loading Examples](../../examples/ui/icon-loading-examples.md) - Status indicator patterns
- [Design Tokens](design-tokens.md) - Status color palette (green-500 for operational)

**Use Cases**:
- System monitoring placeholder
- Health indicator pattern demonstration
- Future status page foundation

---

## Viewing Mockups

### Quick Start

**Option 1: Direct Browser Open** (Fastest)
1. Navigate to `src/main/resources/static/mockups/` in Finder/Explorer
2. Double-click the `.html` file
3. Opens in your default browser

**Option 2: Via Ktor Server** (Recommended for testing)
1. Start the CycleTime server:
   ```bash
   ./gradlew run
   ```
2. Navigate to `http://localhost:8080/mockups/[filename].html`
3. Uses same server environment as production dashboard

**Option 3: Live Server Extension** (Best for development)
1. Install "Live Server" extension in VS Code
2. Right-click `.html` file → "Open with Live Server"
3. Auto-reloads on file changes

For detailed instructions, see [Viewing Mockups Guide](../../guides/ui/viewing-mockups-guide.md).

---

## Testing Responsive Behavior

### Required Viewports

All mockups must be tested at these standard breakpoints:

| Breakpoint | Width | Device Class | Key Behaviors |
|------------|-------|--------------|---------------|
| **Mobile** | 375px | iPhone SE | Hamburger menu, stacked layout, large touch targets |
| **Tablet** | 768px | iPad Mini | Transition point - horizontal nav appears |
| **Desktop** | 1280px | Standard laptop | Full layout with optimal spacing |
| **Large** | 1920px | External monitor | Content stays centered, doesn't stretch |

### Browser DevTools Testing

**Chrome/Edge**:
1. Press `F12` to open DevTools
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device preset or enter custom width
4. Test at all required breakpoints

**Firefox**:
1. Press `F12` to open DevTools
2. Click "Responsive Design Mode" (Ctrl+Shift+M)
3. Enter custom dimensions
4. Test touch simulation

**Safari**:
1. Enable Developer Menu: Preferences → Advanced → Show Develop menu
2. Develop → Enter Responsive Design Mode
3. Select device or custom size

### Keyboard Navigation Testing

**Required tests for all mockups**:
1. Tab through all interactive elements
2. Verify visible focus states (brand color ring)
3. Test Enter/Space on buttons
4. Test Escape to close modals/menus (when implemented)

---

## Design System Consistency Checklist

When creating new mockups, verify:

- ✅ **Colors**: Only use design token colors (no arbitrary hex codes)
  - Brand: brand-400 through brand-900
  - Neutral: neutral-50 through neutral-950
  - Status: success, warning, error, info

- ✅ **Typography**: Use defined type scale
  - Font families: Inter (sans), JetBrains Mono (mono)
  - Sizes: Display (40px) → Caption (12px)
  - Weights: 400, 500, 600, 700

- ✅ **Spacing**: Use 4px base unit scale
  - Tailwind classes: space-1 (4px) through space-16 (64px)
  - Gap utilities: gap-2, gap-4, gap-6, gap-8

- ✅ **Breakpoints**: Use standard responsive prefixes
  - Mobile: No prefix (default)
  - Tablet: `md:` (768px+)
  - Desktop: `lg:` (1024px+), `xl:` (1280px+)

- ✅ **Accessibility**: WCAG 2.1 AA minimum (AAA preferred)
  - Semantic HTML
  - ARIA attributes where needed
  - Visible focus states
  - Color contrast ratios (4.5:1 minimum)

---

## Creating New Mockups

### Mockup Template Structure

```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Mockup Title] - CycleTime</title>

    <!-- Google Fonts - Inter & JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Tailwind Configuration (CycleTime Design System) -->
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#f0f9ff',
                            100: '#e0f7ff',
                            200: '#b3ecff',
                            300: '#80d9ff',
                            400: '#3ba3c9',
                            500: '#2878a1',
                            600: '#1a5178',
                            700: '#154158',
                            800: '#0f2e3f',
                            900: '#0a1f2a',
                        },
                        neutral: {
                            50: '#fafafa',
                            100: '#f5f5f5',
                            200: '#e5e5e5',
                            300: '#d4d4d4',
                            400: '#a3a3a3',
                            500: '#737373',
                            600: '#525252',
                            700: '#404040',
                            800: '#262626',
                            850: '#1a1a1a',
                            900: '#171717',
                            950: '#0a0a0a',
                        },
                    },
                    fontFamily: {
                        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
                    },
                }
            }
        }
    </script>

    <!-- HTMX for Progressive Enhancement -->
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>

<body class="min-h-screen bg-neutral-950 text-neutral-100">
    <!-- Your mockup content here -->
</body>
</html>
```

### File Naming Convention

- Use kebab-case: `feature-name-template.html`
- Include purpose suffix: `-template`, `-demo`, `-example`
- Examples:
  - `design-system.html` (comprehensive system showcase)
  - `layout-template.html` (page layout pattern)
  - `project-list-demo.html` (specific page demo)

### Documentation Requirements

When creating a new mockup:

1. **Update this catalog** with new entry
2. **Create or update guide** in `docs/guides/ui/` if needed
3. **Add examples** to `docs/examples/ui/` for key components
4. **Reference in patterns** if establishing new pattern
5. **Link from implementation guide** if part of feature development

---

## Integration with Server-Side Rendering

### Ktor HTML DSL Conversion

Mockups serve as visual references for Ktor HTML DSL implementation:

**HTML Mockup**:
```html
<nav class="bg-neutral-900 border border-neutral-700">
    <a href="/projects" class="text-brand-400">Projects</a>
</nav>
```

**Ktor HTML DSL**:
```kotlin
nav(classes = "bg-neutral-900 border border-neutral-700") {
    a(href = "/projects", classes = "text-brand-400") {
        +"Projects"
    }
}
```

See [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) for complete conversion patterns.

---

## Placeholder Pages (SPI-839)

**Purpose**: Complete navigation structure with professional placeholders

**Settings Page** (`settings-page.html`):
- Outlines future categories: User Preferences, Project Defaults, MCP Configuration
- Professional and extensible design
- Not apologetic - hints at future capabilities

**System Status Page** (`system-status-page.html`):
- Basic health indicators: Server, Database, MCP (green dots)
- Suggests monitoring capability
- Foundation for future metrics/logs/diagnostics

**Design Philosophy**:
- Placeholder state clearly temporary but navigable
- Future vision outlined without over-promising
- Consistent with overall dashboard aesthetic
- Expandable in future implementation phases

---

## Future Mockups (Planned)

As UI development continues, additional mockups will be added:

### Phase 2: Page-Specific Mockups
- `project-list-page.html` - Projects page with table/card views
- `project-detail-page.html` - Single project with epic hierarchy
- `issue-list-page.html` - Issues page with filters
- ~~`settings-page.html` - Settings interface~~ ✅ Complete (SPI-839)
- ~~`system-status-page.html` - System health dashboard~~ ✅ Complete (SPI-839)

### Phase 3: Advanced Patterns
- `modal-examples.html` - Modal dialog patterns
- `table-patterns.html` - Data table with sorting/filtering
- `form-layouts.html` - Complex form patterns
- `empty-states.html` - Empty state variations

---

## Related Resources

**Design System**:
- [Design Tokens Reference](design-tokens.md) - Complete token specifications
- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md) - Implementation patterns

**Component Documentation**:
- [Button Component Examples](../../examples/ui/button-component-examples.md)
- [Card Component Examples](../../examples/ui/card-component-examples.md)
- [Badge & Navigation Examples](../../examples/ui/badge-navigation-examples.md)
- [Form Component Examples](../../examples/ui/form-component-examples.md)
- [Icon & Loading Examples](../../examples/ui/icon-loading-examples.md)

**Implementation Guides**:
- [Viewing Mockups Guide](../../guides/ui/viewing-mockups-guide.md) - Detailed viewing instructions
- [Dashboard Implementation Guide](../../guides/dashboard/dashboard-implementation-guide.md) - Server-side rendering
- [HTMX Patterns](../../patterns/ui/htmx-patterns.md) - Progressive enhancement

**Architecture**:
- [Dashboard Architecture Concept](../../concepts/dashboard/dashboard-architecture-concept.md) - Server-driven UI philosophy

---

## Quick Reference

**Find a mockup**: `src/main/resources/static/mockups/[filename].html`
**View via server**: `http://localhost:8080/mockups/[filename].html`
**Test breakpoints**: 375px (mobile), 768px (tablet), 1280px (desktop)
**Design system**: See `design-system.html` for all components
**Layout template**: See `layout-template.html` for navigation pattern

**Questions?** See [Viewing Mockups Guide](../../guides/ui/viewing-mockups-guide.md) or ask in team chat.
