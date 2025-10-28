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

- ✅ **SPI-840**: Setup Tailwind Config & Build Process (Completed)
- ⏳ **SPI-841**: Design Tokens - Colors, Typography, Spacing (Pending)
- ⏳ **SPI-842**: Components - Buttons & Cards (Pending)
- ⏳ **SPI-843**: Components - Forms & Inputs (Pending)
- ⏳ **SPI-844**: Components - Badges, Navigation, Icons (Pending)
- ⏳ **SPI-845**: Patterns & Responsive Documentation (Pending)
- ⏳ **SPI-846**: Accessibility Audit & Fixes (Pending)

## Resources

- **Requirements**: `/Users/jburbridge/Projects/cycletime/docs/qa/SPI-835-design-system-requirements.md`
- **Tailwind Docs**: https://tailwindcss.com/docs
- **Heroicons**: https://heroicons.com/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
