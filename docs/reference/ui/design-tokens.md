---
title: "CycleTime Design Tokens Reference"
type: reference
domain: [ui, frontend, design-system]
description: "Quick reference for colors, typography, spacing, and breakpoints in CycleTime design system"
dependencies: []
related: [../../patterns/ui/tailwind-design-system.md]
keywords: [design-tokens, colors, typography, spacing, tailwind, css-variables, design-system]
last_updated: 2025-10-28
---

# CycleTime Design Tokens Reference

Quick reference documentation for all design tokens (colors, typography, spacing, breakpoints) in the CycleTime design system. These tokens provide a consistent visual language across the dashboard interface.

## Purpose

Design tokens are the foundational design decisions that ensure:
- **Consistency**: Same colors, spacing, typography across all components
- **Maintainability**: Single source of truth for design values
- **Accessibility**: WCAG 2.1 AA compliance for color contrast
- **Developer Experience**: Easy-to-use Tailwind CSS classes

See the [live design system demo](../../../src/main/resources/static/mockups/design-system.html) for interactive examples.

---

## Color Tokens

### Brand Colors

Primary accent colors for CTAs, links, and interactive elements.

| Token | Hex Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| `brand-400` | `#38bdf8` | `bg-brand-400`, `text-brand-400` | Primary accent, highlights |
| `brand-500` | `#0ea5e9` | `bg-brand-500`, `text-brand-500` | Primary CTAs, buttons |
| `brand-600` | `#0284c7` | `bg-brand-600`, `text-brand-600` | Hover states |
| `brand-700` | `#0369a1` | `bg-brand-700`, `text-brand-700` | Active/pressed states |
| `brand-900` | `#0c4a6e` | `bg-brand-900`, `text-brand-900` | Dark variant |

**Live Examples**: [Brand Color Palette](../../../src/main/resources/static/mockups/design-system.html#color-brand)

---

### Neutral Scale (Dark-First)

Grayscale palette optimized for dark mode interfaces.

| Token | Hex Value | Tailwind Class | Usage |
|-------|-----------|----------------|-------|
| `neutral-50` | `#fafafa` | `bg-neutral-50`, `text-neutral-50` | Lightest (rare use in dark mode) |
| `neutral-100` | `#f5f5f5` | `bg-neutral-100`, `text-neutral-100` | Primary text color |
| `neutral-200` | `#e5e5e5` | `bg-neutral-200`, `text-neutral-200` | Headings, emphasized text |
| `neutral-400` | `#a3a3a3` | `bg-neutral-400`, `text-neutral-400` | Secondary text, descriptions |
| `neutral-500` | `#737373` | `bg-neutral-500`, `text-neutral-500` | Metadata, technical details |
| `neutral-600` | `#525252` | `bg-neutral-600`, `text-neutral-600` | Muted text, disabled states |
| `neutral-800` | `#262626` | `bg-neutral-800`, `text-neutral-800` | Elevated surfaces, hover states |
| `neutral-850` | `#1a1a1a` | `bg-neutral-850`, `text-neutral-850` | Card backgrounds |
| `neutral-900` | `#171717` | `bg-neutral-900`, `text-neutral-900` | Page background |
| `neutral-950` | `#0a0a0a` | `bg-neutral-950`, `text-neutral-950` | Deepest background |

**Live Examples**: [Neutral Scale](../../../src/main/resources/static/mockups/design-system.html#color-neutral)

---

### Status Colors

Badge colors for workflow states (WCAG 2.1 AA compliant).

| Status | Background | Text | Border | Contrast Ratio | Tailwind Example |
|--------|-----------|------|--------|----------------|------------------|
| **Backlog** | `#1e293b` | `#94a3b8` | `#334155` | 7.2:1 | `bg-[#1e293b] text-[#94a3b8] border-[#334155]` |
| **Todo** | `#1e3a8a` | `#93c5fd` | `#1e40af` | 6.8:1 | `bg-[#1e3a8a] text-[#93c5fd] border-[#1e40af]` |
| **In Progress** | `#854d0e` | `#fde047` | `#a16207` | 8.1:1 | `bg-[#854d0e] text-[#fde047] border-[#a16207]` |
| **In Review** | `#581c87` | `#d8b4fe` | `#6b21a8` | 7.5:1 | `bg-[#581c87] text-[#d8b4fe] border-[#6b21a8]` |
| **Done** | `#14532d` | `#86efac` | `#166534` | 8.4:1 | `bg-[#14532d] text-[#86efac] border-[#166534]` |
| **Canceled** | `#1f2937` | `#9ca3af` | `#374151` | 6.9:1 | `bg-[#1f2937] text-[#9ca3af] border-[#374151]` |

**Live Examples**: [Status Colors](../../../src/main/resources/static/mockups/design-system.html#color-status)

---

### Issue Type Colors

Visual indicators for issue hierarchy.

| Type | Background | Text | Icon Color | Tailwind Example |
|------|-----------|------|------------|------------------|
| **Epic** | `#7c2d12` (orange-900) | `#fed7aa` (orange-200) | `#fb923c` | `bg-orange-900 text-orange-200` |
| **Story** | `#1e3a8a` (blue-900) | `#bfdbfe` (blue-200) | `#60a5fa` | `bg-blue-900 text-blue-200` |
| **Subtask** | `#134e4a` (teal-900) | `#99f6e4` (teal-200) | `#2dd4bf` | `bg-teal-900 text-teal-200` |

---

### Semantic Feedback Colors

Alert and notification colors for user feedback.

| Type | Background | Text | Border | Usage |
|------|-----------|------|--------|-------|
| **Success** | `#14532d` | `#86efac` | `#166534` | Confirmations, successful operations |
| **Warning** | `#78350f` | `#fcd34d` | `#92400e` | Cautions, non-blocking alerts |
| **Error** | `#7f1d1d` | `#fca5a5` | `#991b1b` | Errors, failed operations |
| **Info** | `#1e3a8a` | `#93c5fd` | `#1e40af` | Informational messages, tips |

**Tailwind Classes**:
```html
<!-- Success Alert -->
<div class="bg-green-900/20 border border-green-700/50 text-green-300">Success message</div>

<!-- Warning Alert -->
<div class="bg-amber-900/20 border border-amber-700/50 text-amber-300">Warning message</div>

<!-- Error Alert -->
<div class="bg-red-900/20 border border-red-700/50 text-red-300">Error message</div>

<!-- Info Alert -->
<div class="bg-blue-900/20 border border-blue-700/50 text-blue-300">Info message</div>
```

---

## Typography Tokens

### Font Families

| Family | CSS Stack | Usage |
|--------|-----------|-------|
| **Inter** (Sans-Serif) | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | UI text, headings, body content |
| **JetBrains Mono** (Monospace) | `'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace` | Code snippets, IDs, technical data |

**Tailwind Classes**: `font-sans`, `font-mono`

---

### Type Scale

Complete typography hierarchy with use cases.

| Level | Size (rem/px) | Line Height | Weight | Tailwind Class | Usage |
|-------|--------------|-------------|--------|----------------|-------|
| **Display** | 2.5rem (40px) | 1.2 | 700 | `text-display` | Hero sections (rare) |
| **Heading 1** | 2rem (32px) | 1.25 | 700 | `text-4xl` | Page titles, main headers |
| **Heading 2** | 1.5rem (24px) | 1.3 | 600 | `text-2xl` | Section headers, card titles |
| **Heading 3** | 1.25rem (20px) | 1.4 | 600 | `text-xl` | Component headers, subsections |
| **Heading 4** | 1.125rem (18px) | 1.4 | 600 | `text-lg` | Sub-component headers |
| **Body Large** | 1rem (16px) | 1.5 | 400 | `text-base` | Emphasized body text, introductions |
| **Body** | 0.875rem (14px) | 1.5 | 400 | `text-sm` | Default body text, descriptions |
| **Body Small** | 0.8125rem (13px) | 1.5 | 400 | `text-[0.8125rem]` | Supporting text, metadata |
| **Caption** | 0.75rem (12px) | 1.4 | 500 | `text-xs` | Labels, badges, timestamps |
| **Code** | 0.875rem (14px) | 1.5 | 400 | `font-mono text-sm` | Code snippets, IDs |

**Live Examples**: [Typography Scale](../../../src/main/resources/static/mockups/design-system.html#typography-scale)

---

### Font Weights

| Weight | Value | Tailwind Class | Usage |
|--------|-------|----------------|-------|
| Regular | 400 | `font-normal` | Body text |
| Medium | 500 | `font-medium` | Labels, captions |
| Semibold | 600 | `font-semibold` | Subheadings (H2-H4) |
| Bold | 700 | `font-bold` | Primary headings (H1, Display) |

---

### Typography Usage Examples

```html
<!-- Page Title -->
<h1 class="text-4xl font-bold text-neutral-100">CycleTime Dashboard</h1>

<!-- Section Header -->
<h2 class="text-2xl font-semibold text-neutral-200">Recent Projects</h2>

<!-- Component Header -->
<h3 class="text-xl font-semibold text-neutral-300">Sprint Velocity</h3>

<!-- Body Text -->
<p class="text-sm text-neutral-400">Manage your project hierarchy and track progress across teams.</p>

<!-- Metadata -->
<span class="text-xs text-neutral-500 font-mono">ID: proj_2Dn8xKwL9Mf4</span>

<!-- Code Snippet -->
<code class="font-mono text-sm text-brand-400">const project = "CycleTime";</code>
```

---

## Spacing Tokens

### Spacing Scale (4px Base Unit)

| Token | Pixels | Tailwind Class | Common Usage |
|-------|--------|----------------|--------------|
| `space-1` | 4px | `p-1`, `m-1`, `gap-1` | Icon padding, tight gaps |
| `space-2` | 8px | `p-2`, `m-2`, `gap-2` | Badge padding, compact spacing |
| `space-3` | 12px | `p-3`, `m-3`, `gap-3` | Input padding, button padding |
| `space-4` | 16px | `p-4`, `m-4`, `gap-4` | Default spacing, card padding (mobile) |
| `space-5` | 20px | `p-5`, `m-5`, `gap-5` | Section spacing |
| `space-6` | 24px | `p-6`, `m-6`, `gap-6` | Card padding (desktop), component separation |
| `space-8` | 32px | `p-8`, `m-8`, `gap-8` | Major section separation |
| `space-12` | 48px | `p-12`, `m-12`, `gap-12` | Page margins, hero spacing |
| `space-16` | 64px | `p-16`, `m-16`, `gap-16` | Maximum separation (rare) |

**Live Examples**: [Spacing Scale](../../../src/main/resources/static/mockups/design-system.html#spacing-scale)

---

### Common Spacing Patterns

#### Card Padding
- **Desktop**: `p-6` (24px)
- **Mobile**: `p-4` (16px)

```html
<div class="p-6 md:p-4 bg-neutral-850 border border-neutral-800 rounded-lg">
  Card content
</div>
```

#### Button Padding
- **Small**: `px-3 py-1.5` (12px × 6px)
- **Medium**: `px-4 py-2` (16px × 8px)
- **Large**: `px-6 py-3` (24px × 12px)

```html
<button class="px-4 py-2 bg-brand-500 text-white rounded-lg">Click Me</button>
```

#### Section Spacing
- **Between sections**: `mb-8` (32px)
- **Between cards (tight)**: `gap-4` (16px)
- **Between cards (comfortable)**: `gap-6` (24px)

```html
<div class="space-y-8">
  <section class="grid grid-cols-3 gap-6">
    <!-- Cards with 24px gap -->
  </section>
</div>
```

#### Page Margins
- **Desktop**: `px-8 py-6` (32px × 24px)
- **Tablet**: `px-6 py-4` (24px × 16px)
- **Mobile**: `px-4 py-3` (16px × 12px)

```html
<main class="px-4 py-3 md:px-6 md:py-4 lg:px-8 lg:py-6">
  Page content
</main>
```

---

## Responsive Breakpoints

Mobile-first responsive design with Tailwind breakpoint prefixes.

| Breakpoint | Min Width | Prefix | Target Devices |
|------------|-----------|--------|----------------|
| **Mobile** | 0px | (none) | Base styles for mobile phones |
| **Small** | 640px | `sm:` | Large phones, small tablets |
| **Medium** | 768px | `md:` | Tablets, small laptops |
| **Large** | 1024px | `lg:` | Laptops, desktops |
| **Extra Large** | 1280px | `xl:` | Large desktops, monitors |

### Responsive Usage Examples

```html
<!-- Responsive grid (1 col mobile, 2 tablet, 3 desktop) -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">...</div>

<!-- Responsive typography -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">Heading</h1>

<!-- Responsive spacing -->
<div class="p-4 md:p-6 lg:p-8">Content</div>
```

---

## Live Design System Demo

For interactive examples of all design tokens in action:

**[View Complete Design System](../../../src/main/resources/static/mockups/design-system.html)**

Sections include:
- [1.1 Color Palette](../../../src/main/resources/static/mockups/design-system.html#color-palette) - Brand, neutral, status colors
- [1.2 Typography Scale](../../../src/main/resources/static/mockups/design-system.html#typography) - Font families and type scale
- [1.3 Spacing System](../../../src/main/resources/static/mockups/design-system.html#spacing) - Visual spacing examples

---

## Related Documentation

- **[Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md)** - Implementation patterns for Kotlin HTML DSL
- **Design System HTML Demo** - Live interactive examples with working components
- **Component Examples** (Coming in SPI-860) - Reusable component implementations

---

## Quick Reference Card

### Most Used Tokens

**Colors**:
- Primary: `text-brand-500`, `bg-brand-500`
- Background: `bg-neutral-900`
- Cards: `bg-neutral-850`
- Text: `text-neutral-100` (primary), `text-neutral-400` (secondary)

**Typography**:
- Headings: `text-2xl font-semibold text-neutral-200`
- Body: `text-sm text-neutral-400`
- Labels: `text-xs text-neutral-500`

**Spacing**:
- Cards: `p-6` (desktop), `p-4` (mobile)
- Sections: `mb-8`
- Grids: `gap-4` or `gap-6`

**Responsive**:
- Mobile-first: Start with base classes
- Tablet: Add `md:` prefix
- Desktop: Add `lg:` prefix
