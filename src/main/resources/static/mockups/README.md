# CycleTime Design System Mockups

This directory contains the design system foundation and component library for the CycleTime dashboard.

## Quick Start

### View the Design System

1. **Start the server**:
   ```bash
   ./gradlew run
   ```

2. **Open in browser**:
   ```
   http://localhost:8080/mockups/design-system.html
   ```

### Development Workflow

**Current approach** (SPI-840): Using Tailwind CDN for rapid prototyping

- Edit `design-system.html`
- Refresh browser to see changes
- No build step needed

**Future approach** (Production): Compiled Tailwind CSS

- Run `npx tailwindcss` to compile `css/input.css` → `css/output.css`
- Reference compiled CSS instead of CDN
- Optimize for production (purge unused, minify)

## File Structure

```
mockups/
├── README.md                  # This file
├── design-system.html         # Main design system reference page
├── css/
│   ├── tailwind.config.js    # Custom design tokens
│   ├── input.css             # Tailwind source with @layer components
│   └── output.css            # (Future) Compiled CSS output
└── js/
    └── (Future) Interactive demos
```

## Design Tokens

All design tokens are defined in `css/tailwind.config.js`:

- **Colors**: Brand, neutral, status, issueType, feedback
- **Typography**: Inter (sans), JetBrains Mono (mono)
- **Spacing**: 4px base unit (1, 2, 3, 4, 5, 6, 8, 12, 16)
- **Border Radius**: none, sm (4px), md (6px), lg (8px), xl (12px), full
- **Shadows**: Dark mode optimized elevation system

## Component Classes

Defined in `css/input.css` using `@apply`:

### Buttons
- `.btn` - Base button styles
- `.btn-primary` - Primary actions (brand blue)
- `.btn-secondary` - Secondary actions (neutral gray)
- `.btn-ghost` - Tertiary actions (transparent)
- `.btn-danger` - Destructive actions (red)
- `.btn-sm`, `.btn-md`, `.btn-lg` - Size variants

### Cards
- `.card` - Base card container
- `.card-interactive` - Hoverable/clickable card
- `.card-header`, `.card-title`, `.card-body`, `.card-description` - Card structure

### Forms
- `.form-group` - Form field wrapper
- `.form-label` - Input labels
- `.form-input` - Text inputs, selects
- `.form-checkbox` - Checkboxes
- `.form-error-message`, `.form-success-message` - Validation feedback

### Badges
- `.badge` - Base badge
- `.badge-status-*` - Status badges (backlog, todo, inProgress, inReview, done, canceled)
- `.badge-issue-*` - Issue type badges (epic, story, subtask)

### Navigation
- `.nav-primary` - Primary navigation bar
- `.nav-link`, `.nav-link-active` - Navigation links
- `.breadcrumb`, `.breadcrumb-link` - Breadcrumb navigation

## Subtasks Progress

- ✅ **SPI-840** (3 points): Setup Tailwind Config & Build Process (Completed)
- ✅ **SPI-841** (5 points): Design Tokens - Colors, Typography, Spacing (Completed)
- ✅ **SPI-842** (5 points): Components - Buttons & Cards (Completed)
- ✅ **SPI-843** (5 points): Components - Forms & Inputs (Completed)
- ✅ **SPI-844** (3 points): Components - Badges, Navigation, Icons (Completed)
- ✅ **SPI-845** (3 points): Patterns & Responsive Documentation (Completed)
- ✅ **SPI-846** (2 points): Accessibility Audit & Fixes (Completed)

**Total**: 26 story points complete - **100% of SPI-835 Design System Foundation**

## Live Design System

View the complete design system at: **http://localhost:8080/mockups/design-system.html**

Features:
- 100+ component variants (buttons, cards, forms, navigation, badges)
- HTMX interaction patterns (lazy loading, optimistic UI, polling)
- Responsive design (mobile/tablet/desktop)
- WCAG 2.1 AA accessibility compliance (zero contrast violations)
- Comprehensive documentation and testing checklists

## Resources

- **Requirements**: `/Users/jburbridge/Projects/cycletime/docs/qa/SPI-835-design-system-requirements.md`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Heroicons**: https://heroicons.com/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
