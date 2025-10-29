---
title: "Viewing Mockups Guide"
type: guide
domain: [ui, workflow]
description: "Step-by-step guide for viewing, testing, and using UI mockups effectively"
dependencies: [../../reference/ui/mockup-catalog.md, ../../reference/ui/design-tokens.md]
related: [../../patterns/ui/tailwind-design-system.md, ../dashboard/dashboard-implementation-guide.md]
keywords: [mockups, viewing, testing, responsive, browser, devtools]
audience: [ui-engineers, designers, qa]
last_updated: 2025-10-29
---

# Viewing Mockups Guide

## Overview

This guide provides detailed instructions for viewing, testing, and using CycleTime UI mockups. Whether you're a UI engineer implementing components, a designer verifying visual consistency, or a QA engineer testing responsive behavior, this guide will help you work effectively with mockups.

**Prerequisites**:
- Basic understanding of web development
- Browser with DevTools (Chrome, Firefox, or Safari)
- Optional: VS Code with Live Server extension

---

## Quick Start (5 Minutes)

### 1. Find the Mockups

All mockups are located in:
```
src/main/resources/static/mockups/
```

**Currently available**:
- `design-system.html` - Complete design system showcase
- `layout-template.html` - Navigation layout pattern

### 2. Open in Browser

**Fastest method** (no server required):

1. Navigate to `src/main/resources/static/mockups/` in your file explorer
2. Double-click any `.html` file
3. File opens in your default browser

**Example**:
```bash
# macOS
open src/main/resources/static/mockups/design-system.html

# Linux
xdg-open src/main/resources/static/mockups/design-system.html

# Windows
start src/main/resources/static/mockups/design-system.html
```

### 3. Test Responsive Behavior

1. Press `F12` to open Browser DevTools
2. Click "Toggle device toolbar" icon (or press `Ctrl+Shift+M`)
3. Select "Responsive" mode
4. Test these viewports:
   - **375px** (mobile - iPhone SE)
   - **768px** (tablet - iPad Mini)
   - **1280px** (desktop - standard laptop)

**You're now ready to explore mockups!**

---

## Viewing Methods (Detailed)

### Method 1: Direct Browser Open

**Best for**: Quick viewing, static mockup review

**Steps**:
1. Locate mockup file in `src/main/resources/static/mockups/`
2. Right-click → "Open with" → Select browser
3. Or double-click to use default browser

**Pros**:
- ✅ Fastest method (no server needed)
- ✅ Works offline
- ✅ Simple for quick checks

**Cons**:
- ❌ Doesn't test server integration
- ❌ Manual refresh on file changes
- ❌ File paths may look different than production

**When to use**: Reviewing design, checking colors, verifying component layouts

---

### Method 2: Via Ktor Development Server

**Best for**: Testing server integration, HTMX behavior, production-like environment

**Steps**:

1. **Start the CycleTime server**:
   ```bash
   cd /path/to/cycletime
   ./gradlew run
   ```

2. **Wait for server startup** (look for):
   ```
   Application started in X ms
   Listening on http://127.0.0.1:8080
   ```

3. **Navigate to mockup**:
   ```
   http://localhost:8080/mockups/design-system.html
   http://localhost:8080/mockups/layout-template.html
   ```

**Pros**:
- ✅ Production-like environment
- ✅ Tests server routes
- ✅ Same origin for HTMX requests
- ✅ Verifies static file serving

**Cons**:
- ❌ Requires server restart for some changes
- ❌ Slower than direct browser open
- ❌ Server must be running

**When to use**: Testing HTMX integration, verifying server routes, QA testing

---

### Method 3: VS Code Live Server

**Best for**: Active development, rapid iteration, auto-reload

**Setup** (one-time):

1. **Install Live Server extension**:
   - Open VS Code
   - Extensions → Search "Live Server"
   - Install "Live Server" by Ritwick Dey

2. **Configure for project**:
   - Open VS Code settings (Cmd+,)
   - Search "Live Server"
   - Optional: Set custom port (default: 5500)

**Usage**:

1. Open mockup file in VS Code
2. Right-click in editor → "Open with Live Server"
3. Browser opens automatically at `http://localhost:5500/[path]/mockup.html`
4. **Auto-reload**: File changes trigger instant browser refresh

**Pros**:
- ✅ Auto-reload on save (instant feedback)
- ✅ Fast development workflow
- ✅ Works with all file types
- ✅ Hot reload for CSS/JS changes

**Cons**:
- ❌ Requires VS Code extension
- ❌ Different server than production
- ❌ Not suitable for testing Ktor integration

**When to use**: Building new mockups, tweaking CSS, rapid UI iteration

---

## Responsive Testing

### Required Breakpoints

Test all mockups at these standard viewports:

| Breakpoint | Width | Tailwind Prefix | Device | Key Checks |
|------------|-------|-----------------|--------|------------|
| **Mobile** | 375px | (none) | iPhone SE | Hamburger menu, touch targets ≥ 44px |
| **Tablet** | 768px | `md:` | iPad Mini | Horizontal nav transition |
| **Desktop** | 1280px | `xl:` | Laptop | Full layout, optimal spacing |
| **Large** | 1920px | `2xl:` | External monitor | Content centering, max-width |

### Chrome DevTools (Recommended)

**Enable Responsive Design Mode**:

1. **Open DevTools**: `F12` or `Ctrl+Shift+I` (Windows/Linux), `Cmd+Opt+I` (Mac)
2. **Toggle device toolbar**: Click icon or press `Ctrl+Shift+M` (`Cmd+Shift+M` on Mac)
3. **Select device**: Dropdown at top shows common devices

**Custom Viewport Testing**:

1. Select "Responsive" from device dropdown
2. Enter custom width/height:
   - Width: `375` → Press Enter
   - Verify mobile layout
   - Width: `768` → Press Enter
   - Verify tablet layout
   - Width: `1280` → Press Enter
   - Verify desktop layout

**Visual Walkthrough**:
```
┌─────────────────────────────────────┐
│ [Responsive ▼]  375 x 667  100%  × │ ← Device toolbar
├─────────────────────────────────────┤
│                                     │
│  ┌─ CycleTime ───────────────────┐ │
│  │  [☰]  ← Hamburger visible      │ │ ← Mobile layout (375px)
│  └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Advanced Features**:

- **Rotate**: Click rotate icon to test portrait ↔ landscape
- **Zoom**: Adjust zoom percentage to test different screen densities
- **Throttling**: Network/CPU throttling for performance testing
- **Touch simulation**: Enable touch events for testing mobile interactions

---

### Firefox Responsive Design Mode

**Enable**:

1. **Open DevTools**: `F12` or `Ctrl+Shift+I`
2. **Toggle Responsive Mode**: Click icon or press `Ctrl+Shift+M`
3. **Enter dimensions**: Type directly in width/height fields

**Firefox-Specific Features**:

- **Device Pixel Ratio**: Test retina displays (DPR 1, 2, 3)
- **Touch Simulation**: Toggle touch events without reloading
- **Screenshot**: Capture full-page or viewport screenshots

---

### Safari Responsive Design Mode

**Enable Developer Tools** (one-time):

1. Safari → Preferences → Advanced
2. ✅ "Show Develop menu in menu bar"

**Use Responsive Design Mode**:

1. Develop → Enter Responsive Design Mode
2. Select device from dropdown or enter custom size
3. Test at required breakpoints

**Safari-Specific Benefits**:

- iOS/iPadOS rendering engine (WebKit)
- Most accurate iOS device simulation
- Important for testing iOS-specific CSS issues

---

## Testing Checklist

### Visual Consistency

Check at all breakpoints:

- ✅ **Colors match design system**
  - Brand colors: brand-400 (#3ba3c9)
  - Neutral backgrounds: neutral-900, neutral-950
  - Text: neutral-100 (primary), neutral-400 (secondary)

- ✅ **Typography is readable**
  - Font: Inter for body text
  - Minimum size: 14px for body text
  - Line height: 1.5 or greater

- ✅ **Spacing is consistent**
  - Uses 4px base unit (space-1 through space-16)
  - Padding and margins align to scale
  - No arbitrary spacing values

- ✅ **Layout doesn't break**
  - No horizontal scrolling
  - Content stays within viewport
  - Max-width respected (1280px for content areas)

### Responsive Behavior

- ✅ **Mobile (375px)**:
  - Hamburger menu button visible
  - Horizontal navigation hidden
  - Touch targets ≥ 44x44px
  - Text remains readable (no overflow)

- ✅ **Tablet (768px)**:
  - Navigation transitions to horizontal
  - Hamburger menu hidden
  - Content reflows appropriately

- ✅ **Desktop (1280px+)**:
  - Full horizontal navigation
  - Content centered with max-width
  - Comfortable spacing (not cramped)

- ✅ **Large screens (1920px)**:
  - Content doesn't stretch too wide
  - Max-width constraint honored
  - Centered layout maintained

### Accessibility

- ✅ **Keyboard navigation**:
  - Tab through all interactive elements
  - Focus states clearly visible (brand color ring)
  - No keyboard traps

- ✅ **ARIA attributes**:
  - `aria-label` on navigation
  - `aria-current="page"` on active link
  - `aria-expanded` on expandable elements

- ✅ **Semantic HTML**:
  - Proper heading hierarchy (`<h1>` → `<h6>`)
  - `<nav>`, `<header>`, `<main>`, `<footer>` used correctly
  - Links vs. buttons used appropriately

- ✅ **Color contrast** (WCAG 2.1):
  - Body text: 4.5:1 minimum (AA), 7:1 preferred (AAA)
  - Large text (18px+): 3:1 minimum (AA)
  - Interactive elements: 3:1 minimum

**Test with**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Browser extensions: Axe DevTools, WAVE

### Interactive Elements

- ✅ **Hover states**:
  - Links change color on hover
  - Buttons show hover feedback
  - Transitions are smooth (no janky animations)

- ✅ **Focus states**:
  - Visible focus ring on all interactive elements
  - Focus ring color: brand-400
  - Focus ring offset: 2px

- ✅ **Click/Tap areas**:
  - Mobile touch targets ≥ 44x44px
  - Adequate spacing between clickable elements
  - No overlapping hit areas

---

## Browser DevTools Tips

### Inspecting Elements

**View applied styles**:

1. Right-click element → "Inspect"
2. DevTools opens with element highlighted
3. **Styles panel** shows:
   - Applied Tailwind classes
   - Computed CSS values
   - Source of each style

**Finding Tailwind classes**:

1. Inspect element
2. Look for `class="..."` attribute
3. Tailwind classes visible in Styles panel
4. Hover over class to see applied CSS

**Example**:
```html
<button class="bg-brand-400 hover:bg-brand-500 px-4 py-2 rounded">
<!-- Inspect to see: -->
<!-- bg-brand-400 → background-color: #3ba3c9 -->
<!-- px-4 → padding-left: 1rem; padding-right: 1rem -->
```

### Color Picker

**Extract exact color values**:

1. Inspect element with color
2. Click color swatch in Styles panel
3. Color picker appears showing:
   - Hex value: `#3ba3c9`
   - RGB: `rgb(59, 163, 201)`
   - HSL: `hsl(195, 55%, 51%)`

**Verify contrast**:

1. Open color picker
2. Look for contrast ratio indicator
3. Shows AA/AAA compliance

### Console for Debug

**Test JavaScript**:

```javascript
// Check if element exists
document.getElementById('mobile-menu')

// Test menu toggle function
toggleMobileMenu()

// Verify ARIA attributes
document.querySelector('[aria-expanded]').getAttribute('aria-expanded')
```

---

## Common Issues & Solutions

### Issue: Mockup Looks Different in Browser vs. Server

**Symptom**: Colors, fonts, or layout differ when viewing via `file://` vs. `http://localhost:8080`

**Causes**:
- Font loading restrictions (CORS)
- Tailwind CDN loading delays
- Different base paths

**Solutions**:

1. **Always test via Ktor server** for production-like behavior
2. **Wait for fonts to load** (may take 1-2 seconds on first load)
3. **Check browser console** for any loading errors

---

### Issue: Responsive Breakpoints Don't Match

**Symptom**: Layout doesn't change at 768px as expected

**Causes**:
- Viewport meta tag missing
- Browser zoom != 100%
- DevTools dimensions include scrollbar

**Solutions**:

1. **Verify viewport meta tag**:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

2. **Reset browser zoom**: `Ctrl+0` (Windows/Linux), `Cmd+0` (Mac)

3. **Use DevTools width** (not visual viewport):
   - DevTools shows width EXCLUDING scrollbar
   - This matches CSS media queries

---

### Issue: Hamburger Menu Doesn't Work

**Symptom**: Clicking hamburger button does nothing

**Causes**:
- JavaScript not loaded
- Function not defined
- HTMX not yet implemented

**Solutions**:

1. **Check browser console** for errors
2. **Verify JavaScript loaded**:
   ```javascript
   typeof toggleMobileMenu  // Should be 'function'
   ```

3. **For HTMX mockups**: Menu toggle requires server implementation (see integration notes in HTML)

---

### Issue: Colors Look Wrong

**Symptom**: Brand color appears blue instead of teal

**Causes**:
- Tailwind config not loaded
- Wrong Tailwind version
- Custom colors not defined

**Solutions**:

1. **Verify Tailwind config** in `<head>`:
   ```javascript
   tailwind.config = {
       theme: {
           extend: {
               colors: {
                   brand: {
                       400: '#3ba3c9',  // Correct teal color
   ```

2. **Check Tailwind CDN loaded**:
   - Look for `<script src="https://cdn.tailwindcss.com"></script>`
   - Check browser Network tab for successful load

3. **Hard refresh**: `Ctrl+Shift+R` to bypass cache

---

## Advanced Techniques

### Taking Screenshots

**For documentation or bug reports**:

**Chrome**:
1. Open DevTools → Device Toolbar
2. Click "⋮" menu → "Capture screenshot"
3. Saves viewport screenshot

**Firefox**:
1. Responsive Design Mode
2. Camera icon → Screenshot
3. Choose "Save full page" or "Save viewport"

**Safari**:
1. Develop → Show Web Inspector
2. No built-in screenshot tool
3. Use macOS Cmd+Shift+4 for selection

---

### Testing Dark Mode

**Current status**: All mockups use dark mode by default (`class="dark"` on `<html>`)

**To test light mode** (future):

1. Open DevTools Console
2. Toggle dark class:
   ```javascript
   document.documentElement.classList.remove('dark')
   ```
3. Verify light mode styles

---

### Performance Testing

**Check load time**:

1. Open DevTools → Network tab
2. Reload page (Ctrl+R)
3. Check:
   - **DOMContentLoaded**: < 1s ideal
   - **Load**: < 2s ideal
   - Total size: < 500KB for mockups

**Identify slow resources**:
- Sort by "Time" column
- Look for red (slow) resources
- Usually fonts or Tailwind CDN

---

## Integration with Development Workflow

### For UI Engineers

**When implementing components**:

1. **Reference mockup** for visual design
2. **Copy Tailwind classes** from mockup HTML
3. **Convert to Ktor HTML DSL**:
   ```kotlin
   // HTML mockup
   <div class="bg-neutral-900 p-4 rounded-lg">

   // Ktor HTML DSL
   div(classes = "bg-neutral-900 p-4 rounded-lg") {
   ```

4. **Test server-rendered version** against mockup
5. **Verify responsive behavior** matches mockup

See [Dashboard Implementation Guide](../dashboard/dashboard-implementation-guide.md) for complete conversion process.

---

### For Designers

**When updating designs**:

1. **Review current mockup** to understand baseline
2. **Propose changes** via new mockup or marked-up screenshots
3. **Verify design tokens** align with `design-system.html`
4. **Test at all breakpoints** before implementation handoff

---

### For QA Engineers

**When testing UI**:

1. **Compare server-rendered pages** against mockups
2. **Test all required breakpoints** (375px, 768px, 1280px)
3. **Verify accessibility** (keyboard nav, ARIA, contrast)
4. **Screenshot differences** for bug reports

---

## Quick Reference Commands

```bash
# Open mockup directly (macOS)
open src/main/resources/static/mockups/design-system.html

# Start Ktor server
./gradlew run

# View via server
open http://localhost:8080/mockups/design-system.html

# Find all mockups
ls src/main/resources/static/mockups/

# Search for specific component in mockup
grep -r "primary-button" src/main/resources/static/mockups/
```

---

## Related Documentation

**Mockup Resources**:
- [UI Mockup Catalog](../../reference/ui/mockup-catalog.md) - Complete list of all mockups
- [Design Tokens](../../reference/ui/design-tokens.md) - Color, typography, spacing reference
- [Tailwind Design System Pattern](../../patterns/ui/tailwind-design-system.md) - Implementation patterns

**Component Documentation**:
- [Button Examples](../../examples/ui/button-component-examples.md)
- [Card Examples](../../examples/ui/card-component-examples.md)
- [Navigation Examples](../../examples/ui/badge-navigation-examples.md)
- [Form Examples](../../examples/ui/form-component-examples.md)

**Implementation**:
- [Dashboard Implementation Guide](../dashboard/dashboard-implementation-guide.md) - Server-side rendering
- [HTMX Patterns](../../patterns/ui/htmx-patterns.md) - Progressive enhancement

---

## Next Steps

Now that you can view mockups effectively:

1. **Explore design system**: Open `design-system.html` and review all components
2. **Study layout template**: Open `layout-template.html` to understand navigation pattern
3. **Test responsive behavior**: Practice using DevTools at all breakpoints
4. **Reference during development**: Keep mockups open when implementing features

**Questions?** See [UI Mockup Catalog](../../reference/ui/mockup-catalog.md) or ask in team chat.
