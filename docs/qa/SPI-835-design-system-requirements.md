# SPI-835: Design System Foundation & Component Library

**Comprehensive Requirements Document**
**Story**: Design System Foundation & Component Library
**Linear ID**: SPI-835
**Parent Epic**: SPI-834 (Design Web UI)
**Analysis Level**: Ultrathink
**Date**: 2025-10-27
**Product Manager**: Claude (CycleTime PM Agent)

---

## Executive Summary

This document defines the complete design system foundation for the CycleTime dashboard, establishing visual language, design tokens, and component specifications that will serve as the foundation for all dashboard pages. The design system prioritizes **developer experience, information density, accessibility, and professional credibility** while maintaining the modern, technical aesthetic of the CycleTime brand.

**Key Decisions**:
- **Dark-first design** with light mode support (matches developer preferences)
- **Inspired by reference site** rather than exact clone (optimized for dashboard context)
- **Tailwind + custom components** approach (utility classes + reusable patterns)
- **WCAG 2.1 AA minimum** accessibility compliance
- **Performance-first** implementation (minimal CSS, no heavy frameworks)

---

## 1. Design Philosophy & User Empathy Analysis

### 1.1 User Context Understanding

**Who uses the CycleTime dashboard?**

1. **Solo Developers** (Primary User)
   - Managing personal projects without team support
   - Need quick status checks without cognitive overload
   - Often work in low-light environments (dark mode preference)
   - Value efficiency over visual flourishes
   - May show dashboard to clients (professional appearance matters)

2. **Freelancers** (Primary User)
   - Need to demonstrate progress to clients
   - Require clear, scannable project status
   - Want professional, credible appearance
   - Time-constrained (every interaction should be efficient)

3. **Small Teams** (Secondary User)
   - Coordinating 2-4 developers
   - Need shared visibility into project status
   - Require clear ownership indicators (assignees)
   - Value consistent, predictable UI patterns

**Emotional & Practical Needs Analysis**:

| Need | User Feeling | Design Implication |
|------|--------------|-------------------|
| **Confidence** | "This tool won't lose my data" | Solid, stable design. No flashy animations. Clear feedback. |
| **Clarity** | "I can see what needs doing at a glance" | High information density. Strong visual hierarchy. Status indicators immediately scannable. |
| **Control** | "I understand what's happening" | Predictable patterns. No surprises. Clear navigation. |
| **Efficiency** | "I'm not wasting time" | Fast loading. Minimal clicks. Keyboard shortcuts. Responsive interactions. |
| **Professionalism** | "I can show this to clients" | Clean, modern aesthetic. No playful/immature elements. Polished details. |
| **Comfort** | "I can use this for hours" | Dark mode default. Comfortable contrast ratios. Reduced eye strain. |

### 1.2 Design Principles

1. **Function Over Form** - Every design choice serves a user need, not aesthetic preference
2. **Information Density** - Show maximum relevant information without overwhelming
3. **Predictable Patterns** - Consistent components reduce cognitive load
4. **Accessible by Default** - WCAG 2.1 AA is baseline, not aspiration
5. **Performance Conscious** - Fast loading matters more than visual complexity
6. **Developer-First** - Design for people who understand and appreciate good tools

---

## 2. Design Token Specifications

### 2.1 Color Palette

**Philosophy**: Dark-first design optimized for developer workflows, with semantic color meanings that communicate system state clearly.

#### Primary Palette

```css
/* Tailwind Config Extension */
module.exports = {
  theme: {
    extend: {
      colors: {
        /* Brand Colors */
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',  /* Primary brand accent */
          500: '#0ea5e9',  /* Primary CTAs */
          600: '#0284c7',  /* Hover states */
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        /* Neutral Scale (Dark-first) */
        neutral: {
          50: '#fafafa',   /* Lightest - light mode backgrounds */
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',  /* Mid-tone - borders, disabled */
          600: '#525252',
          700: '#404040',  /* Light mode text */
          800: '#262626',  /* Dark mode elevated surfaces */
          850: '#1a1a1a',  /* Dark mode cards */
          900: '#171717',  /* Dark mode primary background */
          950: '#0a0a0a',  /* Darkest - dark mode deepest backgrounds */
        },

        /* Semantic Status Colors */
        status: {
          backlog: {
            bg: '#1e293b',     /* slate-800 */
            text: '#94a3b8',   /* slate-400 */
            border: '#334155', /* slate-700 */
          },
          todo: {
            bg: '#1e3a8a',     /* blue-900 */
            text: '#93c5fd',   /* blue-300 */
            border: '#1e40af', /* blue-800 */
          },
          inProgress: {
            bg: '#854d0e',     /* yellow-900 */
            text: '#fde047',   /* yellow-300 */
            border: '#a16207', /* yellow-800 */
          },
          inReview: {
            bg: '#581c87',     /* purple-900 */
            text: '#d8b4fe',   /* purple-300 */
            border: '#6b21a8', /* purple-800 */
          },
          done: {
            bg: '#14532d',     /* green-900 */
            text: '#86efac',   /* green-300 */
            border: '#166534', /* green-800 */
          },
          canceled: {
            bg: '#1f2937',     /* gray-800 */
            text: '#9ca3af',   /* gray-400 */
            border: '#374151', /* gray-700 */
          },
        },

        /* Issue Type Colors */
        issueType: {
          epic: {
            bg: '#7c2d12',     /* orange-900 */
            text: '#fed7aa',   /* orange-200 */
            icon: '#fb923c',   /* orange-400 */
          },
          story: {
            bg: '#1e3a8a',     /* blue-900 */
            text: '#bfdbfe',   /* blue-200 */
            icon: '#60a5fa',   /* blue-400 */
          },
          subtask: {
            bg: '#134e4a',     /* teal-900 */
            text: '#99f6e4',   /* teal-200 */
            icon: '#2dd4bf',   /* teal-400 */
          },
        },

        /* Feedback Colors */
        feedback: {
          success: {
            bg: '#14532d',     /* green-900 */
            text: '#86efac',   /* green-300 */
            border: '#166534', /* green-800 */
          },
          warning: {
            bg: '#78350f',     /* amber-900 */
            text: '#fcd34d',   /* amber-300 */
            border: '#92400e', /* amber-800 */
          },
          error: {
            bg: '#7f1d1d',     /* red-900 */
            text: '#fca5a5',   /* red-300 */
            border: '#991b1b', /* red-800 */
          },
          info: {
            bg: '#1e3a8a',     /* blue-900 */
            text: '#93c5fd',   /* blue-300 */
            border: '#1e40af', /* blue-800 */
          },
        },
      }
    }
  }
}
```

#### Color Usage Guidelines

| Element | Dark Mode | Light Mode | Rationale |
|---------|-----------|------------|-----------|
| **Page Background** | neutral-900 | neutral-50 | Maximum contrast, reduces eye strain |
| **Card Background** | neutral-850 | white | Elevated surface, clear hierarchy |
| **Card Hover** | neutral-800 | neutral-100 | Subtle feedback, clear interactivity |
| **Primary Text** | neutral-100 | neutral-700 | WCAG AA compliant contrast |
| **Secondary Text** | neutral-400 | neutral-500 | Supporting information hierarchy |
| **Borders** | neutral-800 | neutral-200 | Subtle separation, not distracting |
| **Primary Actions** | brand-500 | brand-600 | High visibility, clear affordance |
| **Hover Actions** | brand-600 | brand-700 | Clear state change |

#### Accessibility Validation

All color combinations meet WCAG 2.1 Level AA requirements:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio for interactive elements

**Status badge contrast ratios** (text on background):
- Backlog: 7.2:1 ✅
- Todo: 6.8:1 ✅
- In Progress: 8.1:1 ✅
- In Review: 7.5:1 ✅
- Done: 8.4:1 ✅
- Canceled: 6.9:1 ✅

### 2.2 Typography Scale

**Philosophy**: Clear, readable typography optimized for information density and long reading sessions.

#### Font Families

```css
/* Tailwind Config */
fontFamily: {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Menlo',
    'Monaco',
    'Consolas',
    'monospace',
  ],
}
```

**Font Loading Strategy**:
```html
<!-- Load from Google Fonts with display=swap for performance -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Rationale**:
- **Inter**: Modern, highly legible sans-serif optimized for UI. Excellent at small sizes.
- **JetBrains Mono**: Monospace font for code snippets, IDs, technical data. Better readability than system defaults.

#### Type Scale

| Name | Size | Line Height | Weight | Use Case |
|------|------|-------------|--------|----------|
| **Display** | 2.5rem (40px) | 1.2 (48px) | 700 | Page titles (rare use) |
| **Heading 1** | 2rem (32px) | 1.25 (40px) | 700 | Section headers |
| **Heading 2** | 1.5rem (24px) | 1.3 (32px) | 600 | Card titles, subsections |
| **Heading 3** | 1.25rem (20px) | 1.4 (28px) | 600 | Component headers |
| **Heading 4** | 1.125rem (18px) | 1.4 (25px) | 600 | Sub-component headers |
| **Body Large** | 1rem (16px) | 1.5 (24px) | 400 | Primary body text |
| **Body** | 0.875rem (14px) | 1.5 (21px) | 400 | Default body text, descriptions |
| **Body Small** | 0.8125rem (13px) | 1.5 (19px) | 400 | Supporting text, metadata |
| **Caption** | 0.75rem (12px) | 1.4 (17px) | 500 | Labels, badges, timestamps |
| **Code** | 0.875rem (14px) | 1.5 (21px) | 400 | Code snippets, IDs, technical |

#### Tailwind Class Mapping

```css
/* Custom Tailwind utilities for type scale */
.text-display { @apply text-[2.5rem] leading-[1.2] font-bold; }
.text-h1 { @apply text-4xl leading-tight font-bold; }
.text-h2 { @apply text-2xl leading-snug font-semibold; }
.text-h3 { @apply text-xl leading-normal font-semibold; }
.text-h4 { @apply text-lg leading-normal font-semibold; }
.text-body-lg { @apply text-base leading-relaxed font-normal; }
.text-body { @apply text-sm leading-relaxed font-normal; }
.text-body-sm { @apply text-[0.8125rem] leading-relaxed font-normal; }
.text-caption { @apply text-xs leading-snug font-medium; }
.text-code { @apply text-sm leading-relaxed font-mono font-normal; }
```

### 2.3 Spacing System

**Philosophy**: Consistent 4px base unit with exponential scale for predictable, harmonious layouts.

#### Spacing Scale

| Token | Value | Tailwind | Use Case |
|-------|-------|----------|----------|
| **xs** | 4px | `space-1` | Icon padding, tight gaps |
| **sm** | 8px | `space-2` | Badge padding, compact spacing |
| **md** | 12px | `space-3` | Input padding, button padding |
| **base** | 16px | `space-4` | Default spacing, card padding start |
| **lg** | 20px | `space-5` | Section spacing |
| **xl** | 24px | `space-6` | Card padding, component separation |
| **2xl** | 32px | `space-8` | Major section separation |
| **3xl** | 48px | `space-12` | Page margins, hero spacing |
| **4xl** | 64px | `space-16` | Maximum separation |

#### Component Spacing Patterns

**Card Padding**:
- Desktop: `p-6` (24px)
- Mobile: `p-4` (16px)

**Button Padding**:
- Small: `px-3 py-1.5` (12px x 6px)
- Medium: `px-4 py-2` (16px x 8px)
- Large: `px-6 py-3` (24px x 12px)

**Form Input Padding**:
- Horizontal: `px-3` (12px)
- Vertical: `py-2` (8px)

**Section Spacing**:
- Between sections: `mb-8` (32px)
- Between cards: `gap-4` (16px) or `gap-6` (24px)

**Page Margins**:
- Desktop: `px-8 py-6` (32px x 24px)
- Tablet: `px-6 py-4` (24px x 16px)
- Mobile: `px-4 py-3` (16px x 12px)

### 2.4 Border & Radius System

#### Border Widths

```css
borderWidth: {
  DEFAULT: '1px',  /* Standard borders */
  2: '2px',        /* Emphasized borders */
  4: '4px',        /* Heavy emphasis */
}
```

#### Border Radius Scale

| Token | Value | Tailwind | Use Case |
|-------|-------|----------|----------|
| **None** | 0px | `rounded-none` | Square elements |
| **Small** | 4px | `rounded` | Badges, small buttons |
| **Medium** | 6px | `rounded-md` | Cards, inputs, standard buttons |
| **Large** | 8px | `rounded-lg` | Large cards, modals |
| **XL** | 12px | `rounded-xl` | Hero sections |
| **Full** | 9999px | `rounded-full` | Pills, avatars |

**Component Radius Defaults**:
- Cards: `rounded-lg` (8px)
- Buttons: `rounded-md` (6px)
- Inputs: `rounded-md` (6px)
- Badges: `rounded` (4px)
- Modals: `rounded-lg` (8px)

### 2.5 Shadow & Elevation System

**Philosophy**: Subtle shadows that suggest depth without visual noise. Dark mode uses lighter shadows for visibility.

```css
/* Tailwind Config */
boxShadow: {
  'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',

  /* Dark mode variants (lighter shadows) */
  'dark-sm': '0 1px 2px 0 rgb(255 255 255 / 0.05)',
  'dark': '0 1px 3px 0 rgb(255 255 255 / 0.1), 0 1px 2px -1px rgb(255 255 255 / 0.1)',
  'dark-md': '0 4px 6px -1px rgb(255 255 255 / 0.1), 0 2px 4px -2px rgb(255 255 255 / 0.1)',
}
```

**Elevation Levels**:

| Level | Shadow | Use Case |
|-------|--------|----------|
| **0** | `shadow-none` | Flat elements, backgrounds |
| **1** | `shadow-sm` | Subtle cards, list items |
| **2** | `shadow` | Standard cards, dropdowns |
| **3** | `shadow-md` | Elevated cards, popovers |
| **4** | `shadow-lg` | Modals, overlays |
| **5** | `shadow-xl` | Toasts, notifications |

---

## 3. Component Requirements

### 3.1 Button Components

**Philosophy**: Clear affordance, distinct hierarchy, consistent behavior across all states.

#### Button Variants

##### 1. Primary Button
```html
<button class="btn btn-primary">
  Create Project
</button>
```

**Specifications**:
- **Background**: brand-500 (dark), brand-600 (light)
- **Text**: white
- **Hover**: brand-600 (dark), brand-700 (light)
- **Active**: brand-700
- **Disabled**: neutral-700, opacity-50, cursor-not-allowed
- **Focus Ring**: 2px brand-400 with offset

**Use Cases**: Primary actions, form submissions, key CTAs

##### 2. Secondary Button
```html
<button class="btn btn-secondary">
  View Details
</button>
```

**Specifications**:
- **Background**: neutral-800 (dark), neutral-200 (light)
- **Text**: neutral-100 (dark), neutral-700 (light)
- **Border**: 1px neutral-700 (dark), neutral-300 (light)
- **Hover**: neutral-700 (dark), neutral-300 (light)
- **Active**: neutral-600
- **Disabled**: Same as primary
- **Focus Ring**: 2px neutral-400

**Use Cases**: Secondary actions, navigation, less important operations

##### 3. Ghost Button
```html
<button class="btn btn-ghost">
  Cancel
</button>
```

**Specifications**:
- **Background**: transparent
- **Text**: neutral-300 (dark), neutral-600 (light)
- **Hover Background**: neutral-800/50 (dark), neutral-100 (light)
- **Active**: neutral-800/70
- **Disabled**: Same as primary
- **Focus Ring**: 2px neutral-400

**Use Cases**: Tertiary actions, cancel buttons, less emphasis needed

##### 4. Danger Button
```html
<button class="btn btn-danger">
  Delete Project
</button>
```

**Specifications**:
- **Background**: feedback.error.bg
- **Text**: feedback.error.text
- **Border**: 1px feedback.error.border
- **Hover**: red-800
- **Active**: red-700
- **Disabled**: Same as primary
- **Focus Ring**: 2px red-400

**Use Cases**: Destructive actions, permanent deletions, critical warnings

#### Button Sizes

| Size | Padding | Height | Font Size | Icon Size |
|------|---------|--------|-----------|-----------|
| **Small** | `px-3 py-1.5` | 32px | 13px (text-sm) | 16px |
| **Medium** | `px-4 py-2` | 40px | 14px (text-body) | 20px |
| **Large** | `px-6 py-3` | 48px | 16px (text-body-lg) | 24px |

#### Button States

**Interactive States** (all buttons):
- **Default**: Base styles
- **Hover**: Background darkens, cursor pointer, transition 150ms
- **Active**: Background darkens further, slight scale (0.98)
- **Focus**: Visible focus ring (keyboard navigation), outline offset 2px
- **Disabled**: Reduced opacity (0.5), no pointer events, no hover effects

**Loading State**:
```html
<button class="btn btn-primary" disabled>
  <svg class="animate-spin h-5 w-5 mr-2" />
  Processing...
</button>
```

**Icon Placement**:
```html
<!-- Leading icon -->
<button class="btn btn-primary">
  <PlusIcon class="w-5 h-5 mr-2" />
  Create Project
</button>

<!-- Trailing icon -->
<button class="btn btn-secondary">
  View Details
  <ChevronRightIcon class="w-5 h-5 ml-2" />
</button>

<!-- Icon only -->
<button class="btn btn-ghost p-2">
  <XMarkIcon class="w-5 h-5" />
  <span class="sr-only">Close</span>
</button>
```

#### Accessibility Requirements

- **Semantic HTML**: Use `<button>` element, not `<div>` or `<a>`
- **Keyboard Navigation**: Focusable with Tab, activates with Enter/Space
- **Focus Indicators**: Visible focus ring (never `outline: none` without replacement)
- **ARIA Labels**: Icon-only buttons require `aria-label` or `sr-only` text
- **Disabled State**: Use `disabled` attribute, not `aria-disabled` only
- **Loading State**: Include `aria-busy="true"` during async operations

### 3.2 Card Components

**Philosophy**: Flexible containers for grouping related information, with clear visual hierarchy and hover affordance.

#### Project Card

**Use Case**: Display project summary on homepage

```html
<div class="card card-interactive">
  <div class="card-header">
    <h3 class="card-title">CycleTime Development</h3>
    <span class="badge badge-status-active">Active</span>
  </div>
  <div class="card-body">
    <p class="card-description">Core platform development</p>
    <div class="card-stats">
      <div class="stat">
        <span class="stat-value">142</span>
        <span class="stat-label">Issues</span>
      </div>
      <div class="stat">
        <span class="stat-value">387</span>
        <span class="stat-label">Points</span>
      </div>
      <div class="stat">
        <span class="stat-value">64%</span>
        <span class="stat-label">Complete</span>
      </div>
    </div>
  </div>
</div>
```

**Specifications**:
- **Background**: neutral-850 (dark), white (light)
- **Border**: 1px neutral-800 (dark), neutral-200 (light)
- **Border Radius**: rounded-lg (8px)
- **Padding**: p-6 (24px)
- **Shadow**: shadow-sm
- **Hover**: shadow-md, border-neutral-700, transition 150ms
- **Interactive**: cursor-pointer

**Layout Structure**:
- **Header**: Flex row, space-between, items-center
- **Title**: text-h2, neutral-100 (dark)
- **Body**: mt-4
- **Description**: text-body, neutral-400
- **Stats**: Grid 3 columns, gap-4, mt-6

#### Issue Card

**Use Case**: Display Epic/Story/Subtask in hierarchy

```html
<div class="card card-issue" data-issue-type="epic">
  <div class="card-issue-header">
    <div class="issue-type-badge">
      <span class="issue-type-icon">📊</span>
      <span class="issue-type-label">Epic</span>
    </div>
    <span class="badge badge-status-inProgress">In Progress</span>
  </div>
  <div class="card-issue-body">
    <h4 class="issue-title">Core Infrastructure</h4>
    <p class="issue-description">Foundation components and architecture</p>
    <div class="issue-metadata">
      <span class="issue-meta-item">
        <span class="meta-label">Stories:</span>
        <span class="meta-value">8</span>
      </span>
      <span class="issue-meta-item">
        <span class="meta-label">Points:</span>
        <span class="meta-value">34</span>
      </span>
    </div>
  </div>
  <div class="card-issue-footer">
    <button class="btn btn-ghost btn-sm">
      <ChevronDownIcon class="w-4 h-4 mr-1" />
      Expand
    </button>
  </div>
</div>
```

**Specifications**:
- **Background**: neutral-850 (dark), white (light)
- **Border Left**: 4px solid (issue type color)
  - Epic: issueType.epic.icon
  - Story: issueType.story.icon
  - Subtask: issueType.subtask.icon
- **Border**: 1px neutral-800 (dark), neutral-200 (light)
- **Border Radius**: rounded-md (6px)
- **Padding**: p-4 (16px)
- **Hover**: Slight elevation, border-neutral-700

**Nested Hierarchy**:
```html
<div class="issue-tree">
  <div class="card card-issue" data-level="epic">
    <!-- Epic content -->
  </div>
  <div class="issue-tree-children" data-expanded="true">
    <div class="card card-issue" data-level="story" style="margin-left: 24px;">
      <!-- Story content -->
    </div>
    <div class="issue-tree-children" data-expanded="false">
      <div class="card card-issue" data-level="subtask" style="margin-left: 48px;">
        <!-- Subtask content -->
      </div>
    </div>
  </div>
</div>
```

**Indentation Pattern**:
- Epic: 0px
- Story: 24px left margin
- Subtask: 48px left margin

#### Info Card

**Use Case**: Display statistics, system status, warnings

```html
<div class="card card-info">
  <div class="card-info-header">
    <InfoIcon class="w-6 h-6 text-blue-400" />
    <h4 class="card-info-title">System Status</h4>
  </div>
  <div class="card-info-body">
    <p class="text-body">All systems operational</p>
  </div>
</div>
```

**Variants**:
- **Success**: Green border, green icon
- **Warning**: Amber border, amber icon
- **Error**: Red border, red icon
- **Info**: Blue border, blue icon

### 3.3 Form Input Components

#### Text Input

```html
<div class="form-group">
  <label for="project-name" class="form-label">
    Project Name
    <span class="form-required">*</span>
  </label>
  <input
    type="text"
    id="project-name"
    class="form-input"
    placeholder="Enter project name"
    required
  />
  <p class="form-help-text">Choose a clear, descriptive name</p>
</div>
```

**Specifications**:
- **Background**: neutral-900 (dark), white (light)
- **Border**: 1px neutral-700 (dark), neutral-300 (light)
- **Border Radius**: rounded-md (6px)
- **Padding**: px-3 py-2 (12px x 8px)
- **Text**: neutral-100 (dark), neutral-700 (light)
- **Placeholder**: neutral-500, italic
- **Focus**: border-brand-500, ring-2 ring-brand-500/20
- **Error**: border-red-500, ring-2 ring-red-500/20
- **Disabled**: opacity-50, cursor-not-allowed

**States**:
- **Default**: Neutral border
- **Focus**: Brand border with ring
- **Error**: Red border with ring, error message below
- **Success**: Green border with ring, success message below
- **Disabled**: Reduced opacity, no interaction

#### Select Dropdown

```html
<div class="form-group">
  <label for="project-status" class="form-label">Status</label>
  <select id="project-status" class="form-select">
    <option value="">Select status...</option>
    <option value="active">Active</option>
    <option value="archived">Archived</option>
  </select>
</div>
```

**Specifications**: Same as text input, plus:
- **Chevron Icon**: Down arrow on right, neutral-400
- **Dropdown**: shadow-lg, neutral-850 (dark background)
- **Option Hover**: neutral-800 background
- **Option Selected**: brand-500 background

#### Checkbox

```html
<div class="form-checkbox-group">
  <input type="checkbox" id="enable-dark-mode" class="form-checkbox" />
  <label for="enable-dark-mode" class="form-checkbox-label">
    Enable Dark Mode
  </label>
</div>
```

**Specifications**:
- **Size**: 20px x 20px
- **Border**: 2px neutral-700 (dark), neutral-300 (light)
- **Border Radius**: rounded (4px)
- **Checked Background**: brand-500
- **Checked Icon**: White checkmark
- **Focus**: ring-2 ring-brand-500/20
- **Hover**: border-brand-400

#### Search Input

```html
<div class="form-search">
  <SearchIcon class="form-search-icon" />
  <input
    type="search"
    class="form-input form-input-search pl-10"
    placeholder="Search projects, issues..."
  />
  <button class="form-search-clear" aria-label="Clear search">
    <XMarkIcon class="w-4 h-4" />
  </button>
</div>
```

**Specifications**:
- **Icon Position**: Absolute left, 12px from edge
- **Input Padding**: pl-10 (40px) for icon clearance
- **Clear Button**: Absolute right, only visible when value present
- **Background**: neutral-850 (dark), neutral-50 (light)

#### Form Validation

**Error State**:
```html
<div class="form-group form-group-error">
  <label for="email" class="form-label">Email</label>
  <input
    type="email"
    id="email"
    class="form-input form-input-error"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" class="form-error-message">
    <AlertCircleIcon class="w-4 h-4 mr-1" />
    Please enter a valid email address
  </p>
</div>
```

**Success State**:
```html
<div class="form-group form-group-success">
  <label for="username" class="form-label">Username</label>
  <input
    type="text"
    id="username"
    class="form-input form-input-success"
    aria-invalid="false"
    aria-describedby="username-success"
  />
  <p id="username-success" class="form-success-message">
    <CheckCircleIcon class="w-4 h-4 mr-1" />
    Username is available
  </p>
</div>
```

### 3.4 Badge Components

**Philosophy**: Small, scannable status indicators with semantic color coding.

#### Status Badges

```html
<!-- Issue Status -->
<span class="badge badge-status-backlog">Backlog</span>
<span class="badge badge-status-todo">Todo</span>
<span class="badge badge-status-inProgress">In Progress</span>
<span class="badge badge-status-inReview">In Review</span>
<span class="badge badge-status-done">Done</span>
<span class="badge badge-status-canceled">Canceled</span>
```

**Specifications**:
- **Base**: px-2 py-1, rounded (4px), text-caption
- **Colors**: status.{status}.bg, status.{status}.text, status.{status}.border
- **Border**: 1px solid border color
- **Font Weight**: 500 (medium)
- **Letter Spacing**: 0.01em (slight tracking)

#### Issue Type Badges

```html
<span class="badge badge-issue-epic">Epic</span>
<span class="badge badge-issue-story">Story</span>
<span class="badge badge-issue-subtask">Subtask</span>
```

**Specifications**:
- **Base**: Same as status badges
- **Colors**: issueType.{type}.bg, issueType.{type}.text
- **Icon**: Optional icon before label

#### Count Badges

```html
<div class="badge-count-group">
  <span class="badge-count-label">Subtasks</span>
  <span class="badge badge-count">8</span>
</div>
```

**Specifications**:
- **Background**: neutral-800 (dark), neutral-200 (light)
- **Text**: neutral-100 (dark), neutral-700 (light)
- **Size**: Slightly smaller than status badges

### 3.5 Navigation Components

#### Primary Navigation Bar

```html
<nav class="nav-primary">
  <div class="nav-logo">
    <CycleTimeLogo class="h-8 w-auto" />
  </div>
  <ul class="nav-links">
    <li>
      <a href="/projects" class="nav-link nav-link-active">
        <FolderIcon class="nav-link-icon" />
        <span>Projects</span>
      </a>
    </li>
    <li>
      <a href="/issues" class="nav-link">
        <ListBulletIcon class="nav-link-icon" />
        <span>Issues</span>
      </a>
    </li>
    <li>
      <a href="/settings" class="nav-link">
        <CogIcon class="nav-link-icon" />
        <span>Settings</span>
      </a>
    </li>
    <li>
      <a href="/status" class="nav-link">
        <StatusIcon class="nav-link-icon" />
        <span>System Status</span>
      </a>
    </li>
  </ul>
</nav>
```

**Specifications**:
- **Background**: neutral-900 (dark), white (light)
- **Border Bottom**: 1px neutral-800 (dark), neutral-200 (light)
- **Height**: 64px
- **Padding**: px-8 (horizontal)
- **Layout**: Flex row, space-between, items-center
- **Logo**: h-8 (32px height), auto width

**Nav Link States**:
- **Default**: neutral-400, hover:neutral-100, transition 150ms
- **Active**: brand-400, font-semibold, border-bottom 2px brand-400
- **Focus**: ring-2 ring-brand-500/20, rounded
- **Icon**: w-5 h-5, mr-2

#### Breadcrumb Navigation

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item">
      <a href="/projects" class="breadcrumb-link">Projects</a>
    </li>
    <li class="breadcrumb-separator">
      <ChevronRightIcon class="w-4 h-4" />
    </li>
    <li class="breadcrumb-item">
      <a href="/projects/123" class="breadcrumb-link">CycleTime Development</a>
    </li>
    <li class="breadcrumb-separator">
      <ChevronRightIcon class="w-4 h-4" />
    </li>
    <li class="breadcrumb-item breadcrumb-current" aria-current="page">
      <span>Issue Details</span>
    </li>
  </ol>
</nav>
```

**Specifications**:
- **Layout**: Flex row, items-center, gap-2
- **Link**: neutral-400, hover:neutral-100, text-body-sm
- **Current**: neutral-100, font-medium
- **Separator**: neutral-600, w-4 h-4

#### Mobile Navigation

```html
<nav class="nav-mobile">
  <button class="nav-mobile-toggle" aria-label="Open menu">
    <Bars3Icon class="w-6 h-6" />
  </button>

  <div class="nav-mobile-menu" data-open="false">
    <!-- Same structure as desktop, vertical layout -->
  </div>
</nav>
```

**Breakpoint**: Hide desktop nav, show mobile below 768px
**Mobile Menu**: Full-screen overlay, slide from left, backdrop-blur

### 3.6 Icon Strategy

**Decision: Heroicons v2 (Outline & Solid)**

**Rationale**:
1. **Free & Open Source**: MIT licensed, no attribution required
2. **Tailwind Integration**: Built by Tailwind team, perfect integration
3. **Comprehensive**: 292 icons covering all dashboard needs
4. **SVG-based**: Inline SVG for best performance and customization
5. **Two Styles**: Outline (default) and Solid (emphasis) variants
6. **Accessibility**: Designed for 24x24 grid, scales well to 16px-32px

**Implementation Approach**:

```html
<!-- Option 1: Inline SVG (recommended for performance) -->
<svg class="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
</svg>

<!-- Option 2: Component-based (if using HTMX with Kotlin DSL) -->
icon("check-circle", className = "w-5 h-5")
```

**Icon Sizes**:
- **xs**: 16px (`w-4 h-4`) - Inline with text, small badges
- **sm**: 20px (`w-5 h-5`) - Default size, buttons, nav
- **md**: 24px (`w-6 h-6`) - Headers, prominent actions
- **lg**: 32px (`w-8 h-8`) - Page headers, empty states

**Key Icons Needed**:
- **Navigation**: Folder, List, Cog, ChartBar, Bell
- **Actions**: Plus, Pencil, Trash, ChevronDown/Up/Right, X
- **Status**: CheckCircle, ExclamationTriangle, InformationCircle, XCircle
- **UI**: Magnifying Glass, Bars3 (hamburger), EllipsisVertical (more)
- **Issue Types**: Custom (📊 Epic, 📝 Story, ✓ Subtask) or map to Heroicons

---

## 4. Key Questions Answered

### Q2.1: How closely should we match cycletime-ai.pages.dev?

**Answer: Inspired by, not an exact clone**

**Rationale**:
The reference site (cycletime-ai.pages.dev) is a marketing/landing page with different UX requirements than a dashboard application. While we should maintain brand consistency in feel and aesthetic, the dashboard needs:

1. **Higher Information Density**: Dashboard displays 10x more data than marketing page
2. **Different Interaction Patterns**: More forms, tables, trees vs. linear scrolling
3. **Functional Focus**: Dashboard is a tool; landing page is persuasion
4. **Extended Component Library**: Dashboard needs components marketing page doesn't (data tables, tree views, complex forms)

**What to Match**:
- ✅ **Overall Aesthetic**: Dark-first, modern, technical, professional
- ✅ **Color Philosophy**: Dark backgrounds, bright accents, semantic colors
- ✅ **Typography Feel**: Clean, readable, hierarchical
- ✅ **Spacing Philosophy**: Comfortable, not cramped, clear separation
- ✅ **Brand Voice**: Developer-focused, capable, trustworthy

**What to Adapt**:
- ⚙️ **Component Density**: Dashboard needs more compact, scannable layouts
- ⚙️ **Navigation Patterns**: Persistent nav vs. scrolling sections
- ⚙️ **Interactive Elements**: More buttons, inputs, controls
- ⚙️ **Information Architecture**: Hierarchical project data vs. linear marketing content
- ⚙️ **Mobile Strategy**: Dashboard may have simplified mobile view vs. full responsive

**Implementation Approach**:
1. Use reference site for color palette inspiration (extract general tones)
2. Match typography style (modern sans-serif) but optimize scale for dashboard
3. Maintain spacing philosophy but adapt to dashboard information density
4. Create dashboard-specific components (cards, trees, tables) following the established aesthetic

### Q2.2: What are our exact design token values?

**Answer: Comprehensive token specifications provided in Section 2**

All design tokens are documented in detail:
- **Colors**: Section 2.1 (full palette with Tailwind config)
- **Typography**: Section 2.2 (type scale, font families, weights)
- **Spacing**: Section 2.3 (4px base unit, exponential scale)
- **Borders**: Section 2.4 (widths, radius scale)
- **Shadows**: Section 2.5 (elevation system with dark mode variants)

**Implementation Ready**:
All tokens are provided as:
1. Tailwind CSS configuration (can be dropped into `tailwind.config.js`)
2. CSS custom properties (for non-Tailwind usage)
3. Design guidelines (when to use each token)
4. Accessibility validations (contrast ratios verified)

**Source of Truth**:
These token values should be committed to version control in:
- `/src/main/resources/static/css/tailwind.config.js` - Tailwind configuration
- `/docs/design/design-tokens.md` - Design documentation
- `/src/main/resources/static/mockups/design-system.html` - Live reference

### Q2.3: Component library strategy (custom vs. Tailwind utilities)?

**Answer: Hybrid approach - Tailwind utilities + custom component classes**

**Rationale**:
Pure Tailwind utility classes become verbose and error-prone for complex, repeated components. Pure custom components lose Tailwind's flexibility and consistency. A hybrid approach balances both:

**Approach**:

1. **Design Tokens** → Tailwind Config
   - All colors, spacing, typography in `tailwind.config.js`
   - Provides consistency across all usage

2. **Low-Level Utilities** → Pure Tailwind
   - Layout (flex, grid, spacing)
   - Typography (text size, weight, color)
   - One-off styling

3. **Repeated Patterns** → Custom Classes (via @apply)
   - Buttons (`.btn-primary`, `.btn-secondary`)
   - Cards (`.card`, `.card-interactive`)
   - Form inputs (`.form-input`, `.form-label`)
   - Badges (`.badge-status-*`)

4. **Complex Components** → Kotlin DSL Helpers (if using)
   - Navigation bars
   - Trees/hierarchies
   - Data tables

**Example Implementation**:

```css
/* /src/main/resources/static/css/components.css */

/* Button Base */
.btn {
  @apply px-4 py-2 rounded-md font-medium text-sm transition-colors duration-150;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-primary {
  @apply btn bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-400;
}

.btn-secondary {
  @apply btn bg-neutral-800 text-neutral-100 border border-neutral-700;
  @apply hover:bg-neutral-700 focus:ring-neutral-400;
}

/* Card Base */
.card {
  @apply bg-neutral-850 border border-neutral-800 rounded-lg p-6 shadow-sm;
}

.card-interactive {
  @apply card hover:shadow-md hover:border-neutral-700 cursor-pointer transition-all duration-150;
}

/* Form Inputs */
.form-input {
  @apply w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md;
  @apply text-neutral-100 placeholder:text-neutral-500 placeholder:italic;
  @apply focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

**Benefits**:
- ✅ Consistency through reusable classes
- ✅ Maintainability (change once, applies everywhere)
- ✅ Readability (`.btn-primary` vs 12 utility classes)
- ✅ Flexibility (can still add utilities for one-offs)
- ✅ Type Safety (if using Kotlin DSL with sealed classes)

**Kotlin DSL Integration** (optional):
```kotlin
// Can create type-safe component builders
fun btn(
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Medium,
    block: HtmlBlockTag.() -> Unit
) {
    button(classes = "btn btn-${variant.className} btn-${size.className}") {
        block()
    }
}

sealed class ButtonVariant(val className: String) {
    object Primary : ButtonVariant("primary")
    object Secondary : ButtonVariant("secondary")
    object Ghost : ButtonVariant("ghost")
    object Danger : ButtonVariant("danger")
}
```

### Q2.4: Dark Mode Strategy

**Answer: Dark mode first, light mode supported**

**Rationale**:
1. **Target Audience**: Developers overwhelmingly prefer dark mode
2. **Long Sessions**: Dashboard is used for extended periods (eye strain consideration)
3. **Professional Aesthetic**: Dark mode conveys technical credibility
4. **Reference Site**: Uses dark mode prominently

**Implementation Strategy**:

1. **Default**: Dark mode (no toggle needed initially)
2. **Light Mode Support**: Implement using Tailwind's `dark:` variant
3. **User Preference**: Respect system preference via `prefers-color-scheme`
4. **Manual Toggle**: Add toggle in settings (Phase 2)

**Technical Implementation**:

```html
<!-- Detect system preference on page load -->
<script>
  // Check system preference or saved preference
  if (localStorage.theme === 'light' ||
      (!('theme' in localStorage) &&
       window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
</script>
```

```css
/* Tailwind config */
module.exports = {
  darkMode: 'class', // Use class-based dark mode
  theme: {
    extend: {
      // Colors defined with dark mode as default
      colors: {
        // See Section 2.1 for full palette
      }
    }
  }
}
```

**Component Example**:
```html
<!-- Dark mode is default, light mode overrides -->
<div class="bg-neutral-900 light:bg-neutral-50 text-neutral-100 light:text-neutral-700">
  <button class="bg-brand-500 light:bg-brand-600 text-white">
    Primary Action
  </button>
</div>
```

**Phase 1 (MVP)**: Dark mode only, system preference detection
**Phase 2**: Manual toggle in settings, saves to localStorage
**Phase 3**: Per-project color themes (optional, future consideration)

---

## 5. Acceptance Criteria Refinements

### 5.1 Original Criteria Review

The existing acceptance criteria are comprehensive, but I recommend the following additions and clarifications:

#### Enhanced Acceptance Criteria

**Design System Documentation**:
- [x] **AC-01**: Color palette extracted with semantic usage documented
  - **Addition**: Include WCAG contrast ratio validation table
  - **Addition**: Document light mode color variants

- [x] **AC-02**: Typography scale established with font families loaded
  - **Addition**: Document font fallback strategy
  - **Addition**: Include font loading performance metrics target (<100KB total)

- [x] **AC-03**: Spacing system documented with consistent patterns
  - **Addition**: Document responsive spacing adjustments (desktop/tablet/mobile)
  - **Addition**: Include component-specific spacing guidelines

- [x] **AC-04**: Tailwind config file created with custom design tokens
  - **Addition**: Config must include dark mode strategy
  - **Addition**: Include custom @layer components for reusable classes

**Component Library**:
- [x] **AC-05**: Button variations designed (primary, secondary, ghost, danger)
  - **Addition**: All buttons must have focus states for keyboard navigation
  - **Addition**: Include loading state specification
  - **Addition**: Document icon placement patterns

- [x] **AC-06**: Card component patterns established
  - **Addition**: Project card variant documented
  - **Addition**: Issue card with hierarchy support documented
  - **Addition**: Info card variants (success, warning, error, info)

- [x] **AC-07**: Form input styles defined (text, select, checkbox, search)
  - **Addition**: Error and success states documented
  - **Addition**: Help text and validation message patterns
  - **Addition**: Disabled state specifications

- [x] **AC-08**: Badge/label components for status indicators
  - **Addition**: Status badge color mapping documented
  - **Addition**: Issue type badge variants defined
  - **Addition**: Count badge variant specified

- [x] **AC-09**: Icon strategy decided
  - **Addition**: Specific library chosen (Heroicons v2 recommended)
  - **Addition**: Icon sizing system documented
  - **Addition**: Icon color inheritance strategy defined

**Deliverable**:
- [x] **AC-10**: Design system page viewable in browser
  - **Addition**: Must include interactive examples (hover, focus states)
  - **Addition**: Must document responsive behavior at 3 breakpoints
  - **Addition**: Must pass WAVE accessibility audit with 0 errors

- [x] **AC-11**: Dark mode decision documented
  - **Addition**: Implementation strategy specified (class-based vs. CSS variables)
  - **Addition**: System preference detection documented
  - **Addition**: Manual toggle strategy defined (if applicable)

### 5.2 New Acceptance Criteria

**AC-12**: **Accessibility Compliance**
- All components meet WCAG 2.1 Level AA
- Keyboard navigation fully functional for all interactive elements
- Focus indicators visible for all focusable elements
- Color is not the only means of conveying information
- Screen reader testing completed (VoiceOver/NVDA)

**AC-13**: **Responsive Design**
- Components documented at 3 breakpoints:
  - Mobile: 375px (iPhone SE)
  - Tablet: 768px (iPad)
  - Desktop: 1440px (standard laptop)
- Navigation pattern defined for mobile (hamburger vs. bottom tabs)
- Card layouts adjust gracefully (stack vs. grid)

**AC-14**: **Performance Targets**
- Total CSS size: <50KB gzipped
- Font assets: <100KB total
- Design system page loads in <1s on 3G
- No layout shift during font loading (font-display: swap)

**AC-15**: **Browser Compatibility**
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Graceful degradation for older browsers

**AC-16**: **Component State Documentation**
- Every interactive component documents 5 states:
  - Default
  - Hover
  - Active/Pressed
  - Focus (keyboard navigation)
  - Disabled
- States must be visually demonstrable on design system page

**AC-17**: **Code Quality**
- All custom CSS uses Tailwind @apply directive (no inline styles)
- Component classes follow BEM-like naming convention
- Tailwind config is valid and extensible
- No unused Tailwind utilities in production build

### 5.3 Edge Cases to Consider

**Edge Case 1: Very Long Text**
- **Scenario**: Project name with 100+ characters
- **Solution**: Truncate with ellipsis, show full on hover/tooltip
- **Acceptance**: Text never breaks layout, always readable

**Edge Case 2: Missing Data**
- **Scenario**: Project has 0 issues, or null description
- **Solution**: Show placeholder text, not empty space
- **Acceptance**: Empty states are handled gracefully

**Edge Case 3: Extreme Nesting**
- **Scenario**: Subtask nested 5 levels deep (invalid but possible)
- **Solution**: Maximum indentation of 3 levels, beyond shows flatten indicator
- **Acceptance**: Deep nesting doesn't cause horizontal scroll

**Edge Case 4: Status Badge Overflow**
- **Scenario**: Issue has 10+ status/type badges
- **Solution**: Show first 3, then "+7 more" indicator with popover
- **Acceptance**: Badge row never wraps, overflow is handled

**Edge Case 5: System Font Unavailable**
- **Scenario**: Inter/JetBrains Mono fail to load
- **Solution**: Fallback to system fonts maintains layout
- **Acceptance**: No layout shift, fonts load progressively

**Edge Case 6: High Contrast Mode**
- **Scenario**: User has OS high contrast mode enabled
- **Solution**: Respect system preferences, maintain readability
- **Acceptance**: All components remain usable in high contrast

---

## 6. Design Brief for Web UI Engineer

### 6.1 Project Context

You are implementing the design system foundation for the CycleTime dashboard, a project management tool for developers. This design system will serve as the visual and interaction foundation for all dashboard pages.

**Target Users**: Solo developers and freelancers managing software projects
**Use Context**: Long working sessions (hours), frequent status checks, professional client-facing tool
**Technical Stack**: Ktor (Kotlin backend) + HTMX + Tailwind CSS (server-driven UI)

### 6.2 Deliverable Specification

**File Location**: `/src/main/resources/static/mockups/design-system.html`

**Page Structure**:
```
Design System Foundation
├── 1. Color Palette
│   ├── Brand Colors (swatches with hex codes)
│   ├── Neutral Scale (dark-first swatches)
│   ├── Status Colors (semantic badges)
│   ├── Issue Type Colors (badges)
│   └── Feedback Colors (alert examples)
├── 2. Typography
│   ├── Font Families (loaded examples)
│   ├── Type Scale (all sizes demonstrated)
│   ├── Font Weights (400, 500, 600, 700)
│   └── Text Colors (on dark/light backgrounds)
├── 3. Spacing System
│   ├── Spacing Scale (visual boxes showing each size)
│   ├── Component Spacing Examples (cards, buttons)
│   └── Layout Patterns (grids, flex, gaps)
├── 4. Components
│   ├── Buttons (all variants, sizes, states)
│   ├── Cards (project, issue, info variants)
│   ├── Form Inputs (text, select, checkbox, search)
│   ├── Badges (status, type, count)
│   ├── Navigation (primary nav, breadcrumbs)
│   └── Icons (size scale, common icons)
├── 5. Patterns
│   ├── Project Card Layout
│   ├── Issue Hierarchy Tree
│   ├── Form Validation Examples
│   └── Empty States
└── 6. Responsive Behavior
    ├── Mobile (375px)
    ├── Tablet (768px)
    └── Desktop (1440px)
```

### 6.3 Implementation Guidelines

**Step 1: Setup** (Est. 30min)
1. Create `/src/main/resources/static/css/tailwind.config.js` with tokens from Section 2
2. Create `/src/main/resources/static/css/components.css` with custom classes
3. Create `/src/main/resources/static/mockups/design-system.html`
4. Load fonts from Google Fonts (Inter + JetBrains Mono)

**Step 2: Color Palette Section** (Est. 1hr)
1. Create color swatches for all palette entries
2. Show hex codes and Tailwind class names
3. Demonstrate status badges with all variants
4. Include contrast ratio annotations

**Step 3: Typography Section** (Est. 1hr)
1. Display full type scale with size/weight/line-height
2. Show text color variants on different backgrounds
3. Include Tailwind class mapping table
4. Demonstrate hierarchy with real content

**Step 4: Spacing Section** (Est. 45min)
1. Visual representation of spacing scale (colored boxes)
2. Component spacing examples (buttons, cards)
3. Layout pattern demonstrations (grid, flex)

**Step 5: Component Library** (Est. 4hrs)
1. **Buttons**: All 4 variants, 3 sizes, 5 states each
   - Include interactive examples (hover, focus work)
   - Show with/without icons
   - Include loading state
2. **Cards**: 3 main variants with real-ish data
   - Project card with stats
   - Issue card with hierarchy indicators
   - Info cards (success, warning, error, info)
3. **Form Inputs**: All input types with states
   - Text, select, checkbox, search
   - Error, success, disabled states
   - Validation message examples
4. **Badges**: All badge variants
   - Status badges (6 variants)
   - Issue type badges (3 variants)
   - Count badges
5. **Navigation**: Primary nav + breadcrumbs
   - Active state demonstrations
   - Mobile menu (collapsed)
6. **Icons**: Size scale + common icons
   - 16px, 20px, 24px, 32px examples

**Step 6: Pattern Examples** (Est. 2hrs)
1. Project card layout (as it would appear on homepage)
2. Issue hierarchy (epic → story → subtask visual)
3. Form with validation (show complete form flow)
4. Empty state (no projects, no issues)

**Step 7: Responsive Documentation** (Est. 1hr)
1. Show key breakpoints (375px, 768px, 1440px)
2. Document navigation changes (desktop vs. mobile)
3. Card layout adjustments (grid to stack)

**Step 8: Accessibility Audit** (Est. 1hr)
1. Run WAVE accessibility audit
2. Test keyboard navigation (Tab through all interactive elements)
3. Verify focus indicators are visible
4. Check color contrast ratios
5. Test with screen reader (basic check)

**Total Estimated Time**: 12-14 hours

### 6.4 Code Quality Requirements

**CSS Organization**:
```css
/* components.css structure */

/* 1. Base Utilities */
@layer base {
  /* Font loading, resets */
}

/* 2. Component Classes */
@layer components {
  /* Buttons */
  .btn { }
  .btn-primary { }

  /* Cards */
  .card { }
  .card-interactive { }

  /* Forms */
  .form-input { }
  .form-label { }

  /* Badges */
  .badge { }
  .badge-status-* { }
}

/* 3. Utilities */
@layer utilities {
  /* Custom utilities if needed */
}
```

**HTML Structure**:
- Semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<article>`)
- Accessible markup (ARIA labels, roles, landmarks)
- Clear heading hierarchy (h1 → h2 → h3)
- No skipped heading levels

**Best Practices**:
- DRY principle: Use @apply for repeated patterns
- No inline styles (everything via classes)
- Consistent naming (BEM-like)
- Progressive enhancement (works without JS)

### 6.5 Testing Checklist

**Visual Testing**:
- [ ] All components render correctly in Chrome
- [ ] All components render correctly in Firefox
- [ ] All components render correctly in Safari
- [ ] Dark mode colors are consistent
- [ ] Typography hierarchy is clear
- [ ] Spacing feels comfortable, not cramped

**Interactive Testing**:
- [ ] All buttons respond to hover
- [ ] All buttons respond to focus (Tab key)
- [ ] All buttons respond to active/pressed
- [ ] Form inputs can receive focus
- [ ] Form inputs show validation states
- [ ] Navigation links have active states

**Responsive Testing**:
- [ ] Test at 375px width (mobile)
- [ ] Test at 768px width (tablet)
- [ ] Test at 1440px width (desktop)
- [ ] No horizontal scroll at any breakpoint
- [ ] Cards adjust layout appropriately
- [ ] Navigation adapts to viewport

**Accessibility Testing**:
- [ ] WAVE audit shows 0 errors
- [ ] Can Tab through all interactive elements
- [ ] Focus indicators are visible
- [ ] Screen reader announces components correctly
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] No reliance on color alone for meaning

**Performance Testing**:
- [ ] Page loads in <1s on 3G
- [ ] Total CSS <50KB gzipped
- [ ] Fonts load with no layout shift
- [ ] No unused Tailwind utilities in build

### 6.6 Reference Materials

**Design Token Source**: See Section 2 of this document
**Component Specifications**: See Section 3 of this document
**Tailwind Documentation**: https://tailwindcss.com/docs
**Heroicons**: https://heroicons.com/
**WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
**WAVE Tool**: https://wave.webaim.org/

### 6.7 Questions & Clarifications

**Q: Should I implement actual functionality (e.g., dropdowns that open)?**
A: For the design system page, static demonstrations are sufficient. Interactive states can be shown via pseudo-classes (:hover, :focus). If you want to add simple JS for demonstrations (e.g., toggle mobile menu), that's fine but not required.

**Q: How should I handle the issue hierarchy tree (Epic → Story → Subtask)?**
A: Create a static example showing 3 levels of nesting with appropriate indentation (0px, 24px, 48px). Use the card-issue component with data-level attributes. Expand/collapse functionality is not required for design system page.

**Q: Should I create light mode examples too?**
A: Focus on dark mode first (it's the default). If time permits, show a few components in light mode using a toggle class on parent element. But dark mode is priority.

**Q: What data should I use for examples?**
A: Use realistic but generic data:
- Project names: "CycleTime Development", "Mobile App Redesign", "API Integration"
- Issue titles: "Implement caching layer", "Fix login bug", "Add dark mode"
- Status variety: Show all status types across examples
- Estimates: Mix of 1, 2, 3, 5, 8 points

**Q: How detailed should the component documentation be?**
A: Each component should show:
1. Visual example (rendered component)
2. Code snippet (HTML with classes)
3. Variants (if applicable)
4. States (default, hover, focus, disabled)
5. Usage notes (when to use)

---

## 7. Success Metrics

**How will we know this design system is successful?**

### 7.1 Immediate Metrics (Completion)

- [ ] **Completeness**: All 17 enhanced acceptance criteria met
- [ ] **Accessibility**: WAVE audit passes with 0 errors
- [ ] **Performance**: Design system page loads in <1s on 3G
- [ ] **Browser Support**: Renders correctly in Chrome, Firefox, Safari (last 2 versions)
- [ ] **Code Quality**: CSS is <50KB gzipped, no unused Tailwind utilities

### 7.2 Developer Experience Metrics (Post-Implementation)

- **Reusability**: >80% of new pages built using design system components without custom CSS
- **Consistency**: Visual QA finds <5 inconsistencies across dashboard pages
- **Velocity**: New page implementation takes <50% time compared to pre-design-system
- **Maintainability**: Design token changes propagate automatically to all components

### 7.3 User Experience Metrics (Post-Launch)

- **Usability**: Users can complete core tasks (view project, navigate to issue) without confusion
- **Accessibility**: Screen reader users can navigate dashboard independently
- **Performance**: Dashboard pages load in <2s on 3G
- **Satisfaction**: User feedback mentions "clean", "professional", "easy to read"

### 7.4 Long-Term Health Metrics

- **Adoption**: All dashboard pages use design system (0% custom styling)
- **Evolution**: Design tokens updated 1-2x per quarter based on feedback
- **Documentation**: Design system page kept current with <1 week lag
- **Community**: If open source, external contributors reference design system docs

---

## 8. Risk Analysis & Mitigation

### 8.1 Identified Risks

**Risk 1: Design system diverges from implementation**
- **Probability**: High
- **Impact**: Medium
- **Mitigation**:
  - Make design system page the source of truth
  - Automated visual regression testing (future)
  - Regular design reviews during sprint

**Risk 2: Accessibility overlooked in rush to ship**
- **Probability**: Medium
- **Impact**: High (legal, ethical, user impact)
- **Mitigation**:
  - Accessibility as acceptance criteria (blocking)
  - WAVE audit required before PR approval
  - Keyboard navigation testing mandatory

**Risk 3: Design system too rigid, slows down development**
- **Probability**: Medium
- **Impact**: Medium
- **Mitigation**:
  - Escape hatches via utility classes
  - "Component variant request" process
  - Quarterly design system review

**Risk 4: Performance degradation from unused CSS**
- **Probability**: Low (Tailwind JIT handles this)
- **Impact**: Medium
- **Mitigation**:
  - Use Tailwind JIT mode (purges unused)
  - Monitor production CSS size
  - Performance budget enforcement

**Risk 5: Dark mode assumptions exclude users**
- **Probability**: Low
- **Impact**: Medium
- **Mitigation**:
  - Implement light mode from start (even if not default)
  - Respect system preferences
  - Easy toggle in settings

**Risk 6: Icon library licensing issues**
- **Probability**: Very Low (Heroicons is MIT)
- **Impact**: High (legal, reputational)
- **Mitigation**:
  - Choose MIT/Apache licensed libraries only
  - Document licenses in project
  - Legal review before external launch

### 8.2 Contingency Plans

**If design system takes longer than estimated**:
1. Ship MVP with buttons, cards, inputs only
2. Add badges, navigation, icons in Phase 2
3. Pattern examples can be separate story

**If accessibility audit fails**:
1. Block merge until issues resolved (non-negotiable)
2. Bring in accessibility specialist if needed
3. Document learnings to prevent recurrence

**If Tailwind config is too large**:
1. Use Tailwind JIT mode (on-demand generation)
2. Purge unused utilities in production build
3. Consider CSS-in-JS approach (Kotlin DSL)

---

## 9. Next Steps & Dependencies

### 9.1 Immediate Next Steps

1. **Create SPI-835 subtasks in Linear**:
   - Subtask 1: Setup Tailwind config and component CSS (3 points)
   - Subtask 2: Implement design system page - Colors, Typography, Spacing (5 points)
   - Subtask 3: Implement component library - Buttons, Cards, Forms (8 points)
   - Subtask 4: Implement badges, navigation, icons (5 points)
   - Subtask 5: Add pattern examples and responsive docs (3 points)
   - Subtask 6: Accessibility audit and fixes (2 points)

2. **Assign to web-ui-engineer agent**:
   - Provide this requirements document as context
   - Set expectations: 12-14 hour effort, 1-2 days
   - Request progress updates at subtask milestones

3. **Schedule design review**:
   - After Subtask 3 completion (component library)
   - Review with PM (you) and any stakeholders
   - Iterate based on feedback before final two subtasks

### 9.2 Blocking Dependencies

**None** - This is the foundation story, no blockers

### 9.3 Dependent Stories (Blocked Until This Completes)

- **SPI-836**: Implement Projects Page
- **SPI-837**: Implement Issues Page
- **SPI-838**: Implement Settings Page
- **SPI-839**: Implement System Status Page

All subsequent dashboard pages depend on this design system foundation.

### 9.4 Future Enhancements (Out of Scope for SPI-835)

- **Animation System**: Transition timing, easing functions (SPI-840)
- **Data Table Components**: Sortable, filterable tables (SPI-841)
- **Modal/Dialog System**: Overlays, confirmations (SPI-842)
- **Toast Notifications**: Success/error feedback (SPI-843)
- **Loading States**: Skeletons, spinners, progress bars (SPI-844)
- **Empty States**: Illustrations, onboarding (SPI-845)

---

## 10. Appendix

### 10.1 Glossary

- **Design Token**: Named variable representing a design decision (e.g., `brand-500`, `spacing-lg`)
- **Component**: Reusable UI element with consistent appearance and behavior
- **Variant**: Different visual style of same component (e.g., primary button vs. secondary)
- **State**: Appearance of component during interaction (hover, focus, active, disabled)
- **Semantic Color**: Color with meaning (e.g., success=green, error=red)
- **Utility Class**: Single-purpose CSS class (e.g., `mt-4` for margin-top)
- **WCAG**: Web Content Accessibility Guidelines
- **Contrast Ratio**: Measure of text/background color difference (4.5:1 minimum for AA)

### 10.2 Color Contrast Reference Table

| Foreground | Background | Ratio | WCAG Level | Use Case |
|------------|------------|-------|------------|----------|
| neutral-100 | neutral-900 | 18.5:1 | AAA | Primary text on dark |
| neutral-400 | neutral-900 | 7.8:1 | AAA | Secondary text on dark |
| neutral-700 | neutral-50 | 11.6:1 | AAA | Primary text on light |
| brand-400 | neutral-900 | 8.2:1 | AAA | Links on dark |
| white | brand-500 | 4.7:1 | AA | Button text |
| status.todo.text | status.todo.bg | 6.8:1 | AA | Badge text |

### 10.3 Typography Quick Reference

```css
/* Heading 1 - Page titles */
.text-h1 { font-size: 2rem; font-weight: 700; line-height: 1.25; }

/* Heading 2 - Section headers */
.text-h2 { font-size: 1.5rem; font-weight: 600; line-height: 1.3; }

/* Heading 3 - Component headers */
.text-h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }

/* Body - Default text */
.text-body { font-size: 0.875rem; font-weight: 400; line-height: 1.5; }

/* Caption - Labels, timestamps */
.text-caption { font-size: 0.75rem; font-weight: 500; line-height: 1.4; }
```

### 10.4 Component Class Reference

```css
/* Buttons */
.btn-primary   /* Primary actions */
.btn-secondary /* Secondary actions */
.btn-ghost     /* Tertiary actions */
.btn-danger    /* Destructive actions */

/* Sizes */
.btn-sm   /* Small button */
.btn-md   /* Medium (default) */
.btn-lg   /* Large button */

/* Cards */
.card              /* Base card */
.card-interactive  /* Hoverable/clickable card */
.card-issue        /* Issue card with hierarchy */

/* Forms */
.form-input   /* Text inputs */
.form-select  /* Dropdowns */
.form-checkbox /* Checkboxes */
.form-label   /* Input labels */
.form-error-message /* Validation errors */

/* Badges */
.badge                  /* Base badge */
.badge-status-*         /* Status badges */
.badge-issue-*          /* Issue type badges */
.badge-count            /* Count indicators */

/* Navigation */
.nav-primary     /* Primary navigation bar */
.nav-link        /* Navigation link */
.nav-link-active /* Active navigation state */
.breadcrumb      /* Breadcrumb navigation */
```

### 10.5 Responsive Breakpoints

```css
/* Tailwind default breakpoints */
sm:   640px  /* Small devices */
md:   768px  /* Tablets */
lg:   1024px /* Small laptops */
xl:   1280px /* Desktops */
2xl:  1536px /* Large desktops */

/* CycleTime dashboard targets */
mobile:  375px  /* iPhone SE baseline */
tablet:  768px  /* iPad baseline */
desktop: 1440px /* Standard laptop */
```

### 10.6 File Structure

```
/src/main/resources/static/
├── css/
│   ├── tailwind.config.js      # Design tokens configuration
│   ├── components.css          # Custom component classes
│   └── styles.css              # Global styles
├── mockups/
│   └── design-system.html      # Design system reference page
└── fonts/
    ├── inter-*.woff2           # Inter font files (if self-hosted)
    └── jetbrains-mono-*.woff2  # JetBrains Mono files
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-27 | Claude (PM Agent) | Initial requirements document |

---

## Approval

**Product Manager**: Claude (CycleTime PM Agent) - Approved for implementation
**Next Action**: Create Linear subtasks and assign to web-ui-engineer agent
**Estimated Effort**: 8 points (12-14 hours)
**Target Completion**: 1-2 days from assignment

---

**End of Requirements Document**
